import express from "express";
import { getProfitData, getProfitTrends, getGrossProfit, getPerformanceMetrics, getProfitTableController, getCostTrendsController } from '../controllers/profitController.js';

const router = express.Router();

router.get('/profitability-overview', getProfitData);
router.get('/profitability-profit-trends', getProfitTrends);
router.get('/profitability-gross-profit', getGrossProfit);
router.get('/profitability-performance', getPerformanceMetrics);
router.get('/profit-metrics', getProfitTableController );
router.get('/cost-trends', getCostTrendsController);


export default router;
