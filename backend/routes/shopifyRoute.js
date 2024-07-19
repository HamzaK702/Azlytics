import express from 'express';
import { ShopifyController } from '../controllers/ShopifyController.js';

const router = express.Router();

router.get('/shopify', (req, res) => {
    const shop = req.query.shop;
    if (shop) {
        const state = ShopifyController.nonce();
        const installUrl = ShopifyController.generateInstallUrl(shop, state);
        console.log(state)
        console.log(installUrl)
        res.cookie('state', state);
        res.redirect(installUrl);
    } else {
        res.status(400).send('Missing shop parameter. Please add ?shop=your-development-shop.myshopify.com to your request');
    }
});

router.get('/shopify/callback', ShopifyController.handleAuth); //we got the token for dumb client store: shpua_9dd90273c982021d4c9bed11b7bc6e6c 
// new updated token with customer fields --> shpua_9dd90273c982021d4c9bed11b7bc6e6c
router.get('/shopdata', ShopifyController.getShopData);

router.get('/shopify/orders', ShopifyController.getOrders);
router.get('/shopify/products', ShopifyController.getProducts);

router.post('/bulk-operation', ShopifyController.createBulkOperation);


export default router;
