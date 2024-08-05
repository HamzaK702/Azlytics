import express from 'express';
import { getSalesTrends, getAOV } from '../controllers/salesController.js';

const router = express.Router();

router.get('/sales-trend', getSalesTrends);
router.get('/aov', getAOV);

export default router;
