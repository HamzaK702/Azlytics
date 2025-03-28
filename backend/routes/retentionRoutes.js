import express from "express";
import {
  fetchAovBreakdown,
  fetchAveragePerOrder,
  fetchAveragePerOrderCompare,
  fetchCityBreakdown,
  fetchLTV,
  fetchLTVCompare,
  fetchProductBreakdown,
  fetchRegionBreakdown,
  fetchTimeBetweenOrders,
  fetchTimeBetweenOrdersCompare,
  getCustomerStickiness,
  getFollowUpPurchases,
  getRepeatPurchaseRate,
  getRepeatPurchaseRateCompare,
  getRepeatRateByCity,
  getRepeatRateByProduct,
  getRepeatRateBySKU,
  getRetentionChartData,
  getRetentionCurves,
  getRetentionRates,
  retentionCompare,
} from "../controllers/retentionController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import { getRFMCohunt } from "../services/retentionService.js";

const router = express.Router();

router.get("/repeat-rate-city", authMiddleware, getRepeatRateByCity); //
router.get("/repeat-rate/sku", getRepeatRateBySKU);
router.get("/repeat-rate-product", authMiddleware, getRepeatRateByProduct); //
router.get("/customer-stickiness", getCustomerStickiness);
router.get("/retention-rates", getRetentionRates);
router.get("/retention-chart", getRetentionChartData);
router.get("/retention-city", fetchCityBreakdown);
router.get("/retention-region", fetchRegionBreakdown);
router.get("/retention-product", fetchProductBreakdown);
router.get("/retention-aov", fetchAovBreakdown);
router.get("/ltv", authMiddleware, fetchLTV); //
router.get("/ltv-compare", authMiddleware, fetchLTVCompare); //
router.get("/repeat-purchase-rate", authMiddleware, getRepeatPurchaseRate); //
router.get(
  "/repeat-purchase-rate-compare",
  authMiddleware,
  getRepeatPurchaseRateCompare
); //
router.get("/time-between-order", authMiddleware, fetchTimeBetweenOrders); //
router.get(
  "/time-between-order-compare",
  authMiddleware,
  fetchTimeBetweenOrdersCompare
); //
router.get("/average-per-order", authMiddleware, fetchAveragePerOrder); //
router.get(
  "/average-per-order-compare",
  authMiddleware,
  fetchAveragePerOrderCompare
); //
router.get("/rfm-cohunt", authMiddleware, getRFMCohunt); //
router.get("/retention-curve", authMiddleware, getRetentionCurves); //
router.get("/retention-curve-compare", authMiddleware, retentionCompare); //
router.get("/follow-up-purchases", authMiddleware, getFollowUpPurchases); //

export default router;
