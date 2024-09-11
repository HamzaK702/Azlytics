import express from "express";
import {
  getRepeatRateByCity,
  getRepeatRateBySKU,
  getCustomerStickiness,
  getRetentionRates,
  fetchCityBreakdown,
  fetchRegionBreakdown,
  fetchProductBreakdown,
  fetchAovBreakdown,
  getRetentionChartData,
  getRepeatRateByProduct,
  fetchLTV,
  fetchLTVCompare,
  getRepeatPurchaseRate,
  getRepeatPurchaseRateCompare,
  fetchTimeBetweenOrders,
  fetchTimeBetweenOrdersCompare,
  fetchAveragePerOrderCompare,
  fetchAveragePerOrder
  
} from "../controllers/retentionController.js";

const router = express.Router();

router.get("/repeat-rate-city", getRepeatRateByCity);
router.get("/repeat-rate/sku", getRepeatRateBySKU);
router.get("/repeat-rate-product", getRepeatRateByProduct);
router.get("/customer-stickiness", getCustomerStickiness);
router.get("/retention-rates", getRetentionRates);
router.get("/retention-chart", getRetentionChartData);
router.get("/retention-city", fetchCityBreakdown);
router.get("/retention-region", fetchRegionBreakdown);
router.get("/retention-product", fetchProductBreakdown);
router.get("/retention-aov", fetchAovBreakdown);
router.get("/ltv", fetchLTV);
router.get("/ltv-compare", fetchLTVCompare);
router.get("/repeat-purchase-rate", getRepeatPurchaseRate);
router.get("/repeat-purchase-rate-compare", getRepeatPurchaseRateCompare);
router.get("/time-between-order", fetchTimeBetweenOrders);
router.get("/time-between-order-compare", fetchTimeBetweenOrdersCompare);
router.get("/average-per-order", fetchAveragePerOrder);
router.get("/average-per-order-compare", fetchAveragePerOrderCompare);


export default router;
