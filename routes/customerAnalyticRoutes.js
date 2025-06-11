import express from "express";
import {
  fetchChampions,
  fetchLoyalCustomers,
  fetchPotentialLoyalists,
  fetchNewCustomers,
  fetchPromisingCustomers,
  fetchNeedAttentionCustomers,
  fetchAboutToSleepCustomers,
  fetchCantLoseThemCustomers,
  fetchAtRiskCustomers,
  fetchHibernatingCustomers,
} from "../controllers/customerAnalyticController.js";

const router = express.Router();

router.get("/champions", fetchChampions);
router.get("/loyal-customers", fetchLoyalCustomers);
router.get("/potential-loyalists", fetchPotentialLoyalists);
router.get("/new-customers", fetchNewCustomers);
router.get("/promising-customers", fetchPromisingCustomers);
router.get("/need-attention-customers", fetchNeedAttentionCustomers);
router.get('/about-to-sleep-customers', fetchAboutToSleepCustomers);
router.get('/cant-lose-them-customers', fetchCantLoseThemCustomers);
router.get('/at-risk-customers', fetchAtRiskCustomers);
router.get('/hibernating-customers', fetchHibernatingCustomers);

export default router;
