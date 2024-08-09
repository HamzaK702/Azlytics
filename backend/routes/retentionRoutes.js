import express from 'express';
import { getRepeatRateByCity , getRepeatRateBySKU  , getCustomerStickiness , getRetentionRates, fetchCityBreakdown , fetchRegionBreakdown , fetchProductBreakdown , fetchAovBreakdown } from '../controllers/retentionController.js';

const router = express.Router();

router.get('/repeat-rate/city', getRepeatRateByCity);
router.get('/repeat-rate/sku', getRepeatRateBySKU);
router.get('/customer-stickiness', getCustomerStickiness);
router.get('/retention-rates', getRetentionRates);
router.get('/rentention-city', fetchCityBreakdown);
router.get('/rentention-region', fetchRegionBreakdown);
router.get('/rentention-product', fetchProductBreakdown);
router.get('/rentention-aov', fetchAovBreakdown);



export default router;
