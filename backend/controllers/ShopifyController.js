import { ShopifyService } from '../services/ShopifyService.js';
import dotenv from 'dotenv';

dotenv.config();

export class ShopifyController {
    static async handleAuth(req, res) {
        const { shop, hmac, code, state } = req.query;
        const stateCookie = req.cookies.state;

        if (state !== stateCookie) {
            return res.status(403).send('Request origin cannot be verified');
        }

        if (shop && hmac && code) {
            try {
                const accessToken = await ShopifyService.getAccessToken(shop, code);
                console.log("We recieved a token:" + accessToken)
                res.status(200).send('Success, token: ' + accessToken);
                
            } catch (error) {
                res.status(500).send('Error getting Shopify access token: ' + error.message);
            }
        } else {
            res.status(400).send('Required parameters missing');
        }
    }

    static generateInstallUrl(shop, state) {
        const scopes = process.env.SCOPES;
        const redirectUri = `${process.env.FORWARDING_ADDRESS}/shopify/callback`;
        return `https://${shop}/admin/oauth/authorize?client_id=${process.env.SHOPIFY_API_KEY}&scope=${scopes}&state=${state}&redirect_uri=${redirectUri}`;
    }

    static nonce() {
        return Math.random().toString(36).substring(2, 15);
    }
}

//we got the token for dumb client store: shpua_9dd90273c982021d4c9bed11b7bc6e6c