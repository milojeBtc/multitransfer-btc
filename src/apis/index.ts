import { AxiosResponse } from 'axios';
import ORDClient from 'axios';

export const sellerSign = async (payload: any) => {
    try {
        const response: AxiosResponse = await ORDClient.post('/seller-sign',payload);
        return response.data;
    } catch (error) {
        return error;
    }
}

export const buyerSign = async (payload: any) => {
    try {
        const response: AxiosResponse = await ORDClient.post('/buyer-sign', payload);
        return response.data;
    } catch (error) {
        return error;
    }
}
