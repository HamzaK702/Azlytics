import express from 'express';
import {ordersTrend  , getOrderTimeDifferences , getAOV , getCOGS} from '../controllers/ordersController.js';


const router = express.Router();

router.get('/orders-trend', ordersTrend);
router.get('/time-differences', getOrderTimeDifferences);
router.get('/aov', getAOV);
router.get('/cogs', getCOGS);
export default router;
