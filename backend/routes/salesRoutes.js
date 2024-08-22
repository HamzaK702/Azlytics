import express from "express";
import {
  getSalesTrends,
  getAOV,
  getTopCities,
  getTopSKUs,
  getGrossSales,
  getTotalRefunds,
  getTotalTaxes,
  getTotalFees,
  getTotalShippingCost,
  getTotalAdSpend,
  getTotalAdSpendByDate,
  getTotalSales,
  getGrossProfitBreakdown,
  getProductProfitability,
  getLeastProfitableProducts,
  getBestSellers
} from "../controllers/salesController.js";

const router = express.Router();

router.get("/sales-trend", getSalesTrends);
router.get("/aov", getAOV);
router.get("/top-cities", getTopCities);
router.get("/top-skus", getTopSKUs);
router.get("/gross-sales", getGrossSales);
router.get("/total-refunds", getTotalRefunds);
router.get("/total-taxes", getTotalTaxes);
router.get("/total-fees", getTotalFees);
router.get("/total-shipping-cost", getTotalShippingCost);
router.get("/total-ad-spend", getTotalAdSpend);
router.get("/total-ad-spend-by-date", getTotalAdSpendByDate);
router.get("/total-sales", getTotalSales);
router.get("/gross-profit-breakdown", getGrossProfitBreakdown);
router.get("/product-profitability", getProductProfitability);
router.get("/least-profitable-products", getLeastProfitableProducts);
router.get("/best-sellers", getBestSellers);


export default router;
