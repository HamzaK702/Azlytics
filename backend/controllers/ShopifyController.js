
import { ShopifyService } from '../services/ShopifyService.js';
import dotenv from 'dotenv';
import { eventEmitter } from '../services/bulkOperationPipeline.js'; // Import event emitter

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
                console.log(shop, hmac, code)
                console.log("We received a token: " + accessToken)
                res.status(200).send('Success, token: ' + accessToken);
               
                eventEmitter.emit('shopAuthSuccess', { shop, accessToken });

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

    static async getShopData(req, res) {
        const { shop, token } = req.query;

        if (!shop || !token) {
            return res.status(400).send('Missing shop or token parameter.');
        }

        try {
            const shopData = await ShopifyService.getShopData(shop, token);
            res.status(200).json(shopData);
        } catch (error) {
            res.status(500).send('Error fetching shop data: ' + error.message);
        }
    }

    static async getOrders(req, res) {
        const { shop, token } = req.query;
    
        if (!shop || !token) {
            return res.status(400).send('Missing shop or token parameter.');
        }
    
        try {
            const ordersData = await ShopifyService.getOrders(shop, token);
            res.status(200).json(ordersData.data);
        } catch (error) {
            res.status(500).send('Error fetching orders data: ' + error.message);
        }
    }
    
    static async getProducts(req, res) {
        const { shop, token } = req.query;
    
        if (!shop || !token) {
            return res.status(400).send('Missing shop or token parameter.');
        }
    
        try {
            const productsData = await ShopifyService.getProducts(shop, token);
            res.status(200).json(productsData.data);
        } catch (error) {
            res.status(500).send('Error fetching products data: ' + error.message);
        }
    }

    static async createBulkOperation(req, res) {
        const { shop, token, query } = req.body;
        
        if (!shop || !token || !query) {
            return res.status(400).json({ error: 'Missing required fields: shop, token, or query' });
        }

        try {
            const response = await ShopifyService.runBulkOperation(shop, token, query);
            if (response.errors) {
                return res.status(400).json({ errors: response.errors });
            }
            return res.status(200).json(response.data.bulkOperationRunQuery);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}
