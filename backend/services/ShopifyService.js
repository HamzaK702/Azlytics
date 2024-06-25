import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.SHOPIFY_API_KEY;
const secret = process.env.SHOPIFY_API_SECRET;

export class ShopifyService {
    static async getAccessToken(shop, code) {
        const accessTokenRequestUrl = `https://${shop}/admin/oauth/access_token`;
        const accessTokenPayload = {
            client_id: apiKey,
            client_secret: secret,
            code,
        };

        try {
            const response = await axios.post(accessTokenRequestUrl, accessTokenPayload);
            return response.data.access_token;
        } catch (error) {
            throw new Error('Failed to get access token: ' + (error.response ? error.response.data : error.message));
        }
    }
}
