import express from 'express';
import { searchProductTitlesController , getProductImage , updateCostPrice } from '../controllers/productController.js';

const router = express.Router();

router.get('/products', searchProductTitlesController);
router.get('/product-image', getProductImage);
router.put('/product-cost-price', updateCostPrice);

export default router;
