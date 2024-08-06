import express from 'express';
import { getSalesTrends, getAOV ,getTopCities , getTopSKUs } from '../controllers/salesController.js';

const router = express.Router();

router.get('/sales-trend', getSalesTrends);
router.get('/aov', getAOV);
router.get('/top-cities' , getTopCities);
router.get('/top-skus' , getTopSKUs);

export default router;
