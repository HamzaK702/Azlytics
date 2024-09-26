import express from "express";
import { getProfitData, getProfitTrends } from '../controllers/profitController.js';

const router = express.Router();

router.get('/profitability-overview', getProfitData);
router.get('/profitability-profit-trends', getProfitTrends);


export default router;
