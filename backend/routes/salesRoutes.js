import express from "express";
import {
  getSalesTrends,
  fetchAOV,
  getTopCities,
  getTopSKUs,
  getGrossSales,
  getTotalRefunds,
  getTotalTaxes,
  getTotalFees,
  getTotalShippingCost,
  getTotalAdSpend,
  getTotalAdSpendByDate,
  getBlendedCAC,
  getTotalSales,
  getGrossProfitBreakdown,
  getProductProfitability,
  getLeastProfitableProducts,
  getBestSellers,
  getBlendedROAS,
  getTopCitiesComparison
} from "../controllers/salesController.js";

const router = express.Router();

router.get("/sales-trend", getSalesTrends);
router.get("/aovByDate", fetchAOV);
router.get("/top-cities", getTopCities);
router.get("/top-skus", getTopSKUs);
router.get("/gross-sales", getGrossSales);
router.get("/total-refunds", getTotalRefunds);
router.get("/total-taxes", getTotalTaxes);
router.get("/total-fees", getTotalFees);
router.get("/total-shipping-cost", getTotalShippingCost);
router.get("/total-ad-spend", getTotalAdSpend);
router.get("/total-ad-spend-by-date", getTotalAdSpendByDate);
router.get("/blended-cac", getBlendedCAC);
router.get("/total-sales", getTotalSales);
router.get("/gross-profit-breakdown", getGrossProfitBreakdown);
router.get("/product-profitability", getProductProfitability);
router.get("/least-profitable-products", getLeastProfitableProducts);
router.get("/best-sellers", getBestSellers);
router.get("/blended-roas", getBlendedROAS);
router.get("/top-cities-comparison", getTopCitiesComparison);



export default router;
