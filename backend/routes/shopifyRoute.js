import express from 'express';
import { ShopifyController } from '../controllers/ShopifyController.js';

const router = express.Router();

router.get('/shopify', (req, res) => {
    const shop = req.query.shop;
    if (shop) {
        const state = ShopifyController.nonce();
        const installUrl = ShopifyController.generateInstallUrl(shop, state);

        res.cookie('state', state);
        res.redirect(installUrl);
    } else {
        res.status(400).send('Missing shop parameter. Please add ?shop=your-development-shop.myshopify.com to your request');
    }
});

router.get('/shopify/callback', ShopifyController.handleAuth);
router.get('/shopdata', ShopifyController.getShopData);


export default router;
