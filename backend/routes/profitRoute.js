import express from "express";
import { getProfitData, getProfitTrends, getGrossProfit, getPerformanceMetrics, getProfitTableController, getCostTrendsController, getGrossProfitController, getCostsBreakdownController, getProductsBreakdownController } from '../controllers/profitController.js';

const router = express.Router();

router.get('/profitability-overview', getProfitData);
router.get('/profitability-profit-trends', getProfitTrends);
router.get('/profitability-gross-profit', getGrossProfit);
router.get('/profitability-performance', getPerformanceMetrics);
router.get('/profit-metrics', getProfitTableController );
router.get('/cost-trends', getCostTrendsController);
router.get('/gross-profit-performance', getGrossProfitController);
router.get('/costs-breakdown', getCostsBreakdownController);
router.get('/products-breakdown', getProductsBreakdownController);


export default router;
