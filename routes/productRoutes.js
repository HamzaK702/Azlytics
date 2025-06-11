import express from 'express';
import { searchProductTitlesController , getProductImage , updateCostPrice } from '../controllers/productController.js';
import  authMiddleware from '../middlewares/authMiddleware.js'

const router = express.Router();

router.get('/products', authMiddleware, searchProductTitlesController);
router.get('/product-image', authMiddleware, getProductImage);
router.put('/product-cost-price', authMiddleware, updateCostPrice);

export default router;
