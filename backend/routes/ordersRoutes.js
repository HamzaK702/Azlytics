import express from 'express';
import {ordersTrend  , getOrderTimeDifferences , getAOV} from '../controllers/ordersController.js';


const router = express.Router();

router.get('/orders-trend', ordersTrend);
router.get('/time-differences', getOrderTimeDifferences);
router.get('/aov', getAOV);
export default router;
