import express from 'express';
import ordersTrend from '../controllers/ordersController.js';

const router = express.Router();

router.get('/orders-trend', ordersTrend);

export default router;
