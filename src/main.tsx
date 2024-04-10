import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { useBalance } from "./hooks/useBalance";
import { useSend } from "./hooks/useSend";
import { OrdConnectKit, useSign } from "./index";
import { OrdConnectProvider, useOrdContext } from "./providers/OrdContext.tsx";
import { signTransaction } from "sats-connect";
import "./style.css";
// import { SellerSigner, BuyerSigner, mapUtxos } from "@mixobitc/msigner";
import { SignPsbtOptionsParams } from "./lib/signPsbt";
import { SellerSigner, BuyerSigner, mapUtxos, getUtxosByAddress, FullnodeRPC } from "@magiceden-oss/msigner";
import { Psbt } from "bitcoinjs-lib";

function SampleComponent() {
  const { address, network, publicKey, format, safeMode, wallet } =
    useOrdContext();
  const [send, error, loading] = useSend();
  const { getBalance, getUTXOs } = useBalance();
  const [sign] = useSign();
  const [result, setResult] = React.useState("");
  const [balance, setBalance] = React.useState(0);

  const [areaText, setAreaText] = useState("");

  const ordItem = {
    id: "55c3e205ff2631d90aaf7abea12508d374932d0b48f6ef967a8123635447e8cei0",
    contentURI:
      "https://testnet.ordinals.com/content/55c3e205ff2631d90aaf7abea12508d374932d0b48f6ef967a8123635447e8cei0",
    contentType: "text/plain;charset=utf-8",
    contentPreviewURI:
      "https://testnet.ordinals.com/preview/55c3e205ff2631d90aaf7abea12508d374932d0b48f6ef967a8123635447e8cei0",
    sat: 1360552204244140,
    satName: "Bitcoin Sat",
    genesisTransaction:
      "55c3e205ff2631d90aaf7abea12508d374932d0b48f6ef967a8123635447e8ce",
    genesisTransactionBlockTime: "2023-10-16 21:56:32 UTC",
    inscriptionNumber: 378285,
    chain: "btc-testnet",
    location:
      "37cc1736f0d37e1ba3e877fdba3caa9bd22cff16a626c9a3abcbf71d03e662ca:0:0",
    output:
      "37cc1736f0d37e1ba3e877fdba3caa9bd22cff16a626c9a3abcbf71d03e662ca:0",
    outputValue: 10000,
    owner: "tb1qfwr65fwrcx70wkuvwahax5nuzecd7gafcyczj2",
    listed: false,
    postage: 10000,
    offset: 0,
  };

  const [listing, setListing] = useState<any>({
    seller: {
      makerFeeBp: 0,
      sellerOrdAddress: "",
      price: 20000,
      ordItem: ordItem,
      sellerReceiveAddress: "",
      feeRate: 0,
    },
    buyer: {},
  });

  const [buying, setBuying] = useState<any>({
    seller: {},
    buyer: {
      takerFeeBp: 1,
      buyerAddress: "",
      buyerTokenReceiveAddress: "",
      feeRateTier: "High",
      platformFeeAddress: "tb1qtxvwypw27plxvvl9saxd2j3v0u4x3kesymgnzx",
      feeRate: 1,
    },
  });

  const [transferParam, setTransferParam] = useState<any>({
    ownerAddress: "tb1qfwr65fwrcx70wkuvwahax5nuzecd7gafcyczj2",
    ownerPublicKey: publicKey.payments,
    ordItem: ordItem,
    paymentUTXOs: [],
    feeRateTier: "5.0",
    btcAmount: 20000,
    unsignedMultiTransferPSBTBase64: "",
    unsignedMultiTransferInputSize: 0,
  });

  const handleClickSellerSign = async (e: React.MouseEvent) => {
    e.preventDefault();
    let newListing = listing;
    newListing.seller.sellerOrdAddress = address.payments;
    newListing.seller.sellerReceiveAddress = address.payments;
    newListing = await SellerSigner.generateUnsignedListingPSBTBase64(listing);

    let options: SignPsbtOptionsParams = { finalize: false, extractTx: false };
    let signedPSBT = await sign(
      address.payments,
      newListing.seller.unsignedListingPSBTBase64,
      options
    );
    newListing.seller.signedListingPSBTHex = signedPSBT.hex;
    newListing.seller.signedListingPSBTBase64 = Buffer.from(
      signedPSBT.hex,
      "hex"
    ).toString("base64");
    console.log(newListing);
    setListing(newListing);
    setAreaText(JSON.stringify(newListing));
  };

  const handleClickBuyerSign = async (e) => {
    e.preventDefault();
    let newBuying = buying;
    newBuying.seller = JSON.parse(areaText).seller;
    newBuying.buyer.buyerAddress = address.payments;
    newBuying.buyer.buyerTokenReceiveAddress = address.payments;
    console.log("newBying :>> ", newBuying);
    console.log("listing :>> ", newBuying);
    console.log("address :>> ", address);
    const utxosFromMempool = await getUtxosByAddress(address.payments);
    utxosFromMempool.sort((a, b) => b.value - a.value);
    const utxos = await mapUtxos(utxosFromMempool);
    console.log("utxos :>> ", utxos);

    // const newUTXOs = await BuyerSigner.prepareDummyUtxoTxPSBTBase64(
    //   address.payments,
    //   publicKey.payments,
    //   utxos[0],
    //   1000
    // );
    // console.log('newUTXOs :>> ', newUTXOs);

    newBuying.buyer.buyerDummyUTXOs = utxos.slice(1, 3);
    newBuying.buyer.buyerPaymentUTXOs = utxos.slice(0, 1);
    console.log("Here===========================", newBuying);
    newBuying = await BuyerSigner.generateUnsignedBuyingPSBTBase64(newBuying);
    setBuying(newBuying);
    let options: SignPsbtOptionsParams = { finalize: false, extractTx: false };
    const signedPSBT = await sign(
      address.payments,
      newBuying.buyer.unsignedBuyingPSBTBase64,
      options
    );
    newBuying.buyer.signedBuyingPSBTBase64 = Buffer.from(
      signedPSBT.hex,
      "hex"
    ).toString("base64");
    const mergedPsbt = BuyerSigner.mergeSignedBuyingPSBTBase64(
      newBuying.seller.signedListingPSBTBase64,
      newBuying.buyer.signedBuyingPSBTBase64
    );
    // mergedPsbt.finalizeAllInputs();
    // console.log("txBase64", mergedPsbt.toBase64());
    const tx = await FullnodeRPC.finalizepsbt(mergedPsbt);
    console.log("txHex :>> ", tx.hex);
    const res = await FullnodeRPC.sendrawtransaction(tx.hex);
    console.log('res :>> ', res);
    console.log(newBuying);
    setBuying(newBuying);
  };


  const handleClickMultiTransfer = async (e) => {
    e.preventDefault();
    let param = transferParam;
    const utxosFromMempool = await getUtxosByAddress(address.payments);
    utxosFromMempool.sort((a, b) => b.value - a.value);
    const utxos = await mapUtxos(utxosFromMempool);
    console.log("utxos :>> ", utxos);

    param.paymentUTXOs = utxos.slice(0, 1);

    param = await BuyerSigner.generateUnsignedMultiTransferPSBTBase64(param);
    let options: SignPsbtOptionsParams = { finalize: false, extractTx: false };
    const signedPSBT = await sign(
      address.payments,
      param.unsignedMultiTransferPSBTBase64,
      options
    );
    param.signedMultiTransferPSBTBase64 = Buffer.from(
      signedPSBT.hex,
      "hex"
    ).toString("base64");
    const tx = await FullnodeRPC.finalizepsbt(param.signedMultiTransferPSBTBase64);
    console.log("txHex :>> ", tx.hex);
    const res = await FullnodeRPC.sendrawtransaction(tx.hex);
  };

  return (
    <div>
      <span>{balance > 0 && `Wallet Balance: ${balance}`}</span>
      <span>{address && `Connected Address: ${address.ordinals}`}</span>
      <span>{result && `Transaction ID: ${result}`}</span>
      <span>{error && `Error: ${error}`}</span>
      <span>{loading && `Loading`}</span>
      <button
        type="button"
        onClick={async () => {
          const txId = await send(
            "tb1qgypdud5xr0x0wugf5yv62z03ytkwxusjwsr9kq",
            1000,
            10
          );
          if (typeof txId === "string") {
            setResult(txId);
          }
        }}
      >
        Send money
      </button>
      <button
        type="button"
        onClick={async () => {
          const walletBalance = await getBalance();
          if (typeof walletBalance === "number") {
            setBalance(walletBalance);
          }
        }}
      >
        Check balance
      </button>
      <button
        type="button"
        onClick={async () => {
          const signed = await sign(
            address.payments,
            "cHNidP8BAFICAAAAARXJoLPdXB0nA98DsK0PaC5ABbmJbxKPAZ+WUvKJYgieAAAAAAD/////AaRCDwAAAAAAFgAUQQLeNoYbzPdxCaEZpQnxIuzjchIAAAAAAAEBH2QAAAAAAAAAFgAUQQLeNoYbzPdxCaEZpQnxIuzjchIBAwSDAAAAAAA=",
            { extractTx: false }
          );
          console.log(signed);
        }}
      >
        Sign PSBT
      </button>

      <button
        value="seller_signal"
        className="myButton"
        onClick={handleClickSellerSign}
      >
        SELLER SIGNAL
      </button>
      <button
        value="buyer_signal"
        className="myButton"
        onClick={handleClickBuyerSign}
      >
        BUYER SIGNAL
      </button>
      <button
        value="buyer_signal"
        className="myButton"
        onClick={handleClickMultiTransfer}
      >
        MULTI TRANSFER
      </button>
      <textarea
        value={areaText}
        onChange={(e) => setAreaText(e.target.value)}
        style={{ width: "100%", height: "100px" }}
      />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <OrdConnectProvider initialNetwork="testnet" initialSafeMode>
      <SampleComponent />
      <OrdConnectKit />
    </OrdConnectProvider>
  </React.StrictMode>
);
