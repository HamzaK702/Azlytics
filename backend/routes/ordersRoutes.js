import express from "express";
import {
  fetchOrdersTrendComparison,
  getAOV,
  getCOGS,
  getGrossProfit,
  getNetProfit,
  getOrderTimeDifferences,
  ordersTrend,
} from "../controllers/ordersController.js";

const router = express.Router();

router.get("/orders-trend", ordersTrend);
router.get("/time-differences", getOrderTimeDifferences);
router.get("/aov", getAOV);
router.get("/cogs", getCOGS);
router.get("/gross-profit", getGrossProfit);
router.get("/net-profit", getNetProfit);
router.get("/orders-trend-comparison", fetchOrdersTrendComparison);

export default router;
