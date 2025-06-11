import express from "express";
import {
  getCostsBreakdownController,
  getCostTrendsController,
  getGrossProfit,
  getGrossProfitController,
  getPerformanceMetrics,
  getProductsBreakdownController,
  getProfitData,
  getProfitTableController,
  getProfitTrends,
} from "../controllers/profitController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/profitability-overview", authMiddleware, getProfitData);
router.get("/profitability-profit-trends", authMiddleware, getProfitTrends);
router.get("/profitability-gross-profit", authMiddleware, getGrossProfit);
router.get("/profitability-performance", authMiddleware, getPerformanceMetrics);
router.get("/profit-metrics", authMiddleware, getProfitTableController);
router.get("/cost-trends", authMiddleware, getCostTrendsController);
router.get(
  "/gross-profit-performance",
  authMiddleware,
  getGrossProfitController
);
router.get("/costs-breakdown", authMiddleware, getCostsBreakdownController);
router.get(
  "/products-breakdown",
  authMiddleware,
  getProductsBreakdownController
);

export default router;
