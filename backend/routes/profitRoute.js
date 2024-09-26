import express from "express";
import { getProfitData, getProfitTrends, getGrossProfit } from '../controllers/profitController.js';

const router = express.Router();

router.get('/profitability-overview', getProfitData);
router.get('/profitability-profit-trends', getProfitTrends);
router.get('/profitability-gross-profit', getGrossProfit);


export default router;
