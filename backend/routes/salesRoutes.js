import express from "express";
import {
  fetchAOV,
  fetchAOVComparison,
  fetchBlendedCACComparison,
  fetchBlendedROASComparison,
  fetchSalesTrendComparison,
  fetchTotalAdSpendComparison,
  getBestSellers,
  getBlendedCAC,
  getBlendedROAS,
  getGrossProfitBreakdown,
  getGrossSales,
  getLeastProfitableProducts,
  getProductProfitability,
  getSalesTrends,
  getTopCities,
  getTopCitiesComparison,
  getTopSKUs,
  getTotalAdSpend,
  getTotalAdSpendByDate,
  getTotalFees,
  getTotalRefunds,
  getTotalSales,
  getTotalShippingCost,
  getTotalTaxes,
} from "../controllers/salesController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/sales-trend", authMiddleware, getSalesTrends); //
router.get("/aovByDate", authMiddleware, fetchAOV); //
router.get("/top-cities", authMiddleware, getTopCities); //
router.get("/top-skus", getTopSKUs);
router.get("/gross-sales", getGrossSales);
router.get("/total-refunds", getTotalRefunds);
router.get("/total-taxes", getTotalTaxes);
router.get("/total-fees", getTotalFees);
router.get("/total-shipping-cost", getTotalShippingCost);
router.get("/total-ad-spend", getTotalAdSpend);
router.get("/total-ad-spend-by-date", authMiddleware, getTotalAdSpendByDate); //
router.get("/blended-cac", authMiddleware, getBlendedCAC); //
router.get("/total-sales", getTotalSales);
router.get("/gross-profit-breakdown", getGrossProfitBreakdown);
router.get("/product-profitability", getProductProfitability);
router.get("/least-profitable-products", getLeastProfitableProducts);
router.get("/best-sellers", getBestSellers);
router.get("/blended-roas", authMiddleware, getBlendedROAS); //
router.get("/top-cities-comparison", getTopCitiesComparison);
router.get("/total-ad-spend-comparison", fetchTotalAdSpendComparison);
router.get("/sales-trend-comparison", fetchSalesTrendComparison);
router.get("/aov-comparison", fetchAOVComparison);
router.get("/blended-roas-comparison", fetchBlendedROASComparison);
router.get("/blended-cac-comparison", fetchBlendedCACComparison);
// router.get("/last-3-months", getDailyAdSpendForPastThreeMonths);

export default router;
