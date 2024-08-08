import express from 'express';
import { getRepeatRateByCity , getRepeatRateBySKU  , getCustomerStickiness } from '../controllers/retentionController.js';

const router = express.Router();

router.get('/repeat-rate/city', getRepeatRateByCity);
router.get('/repeat-rate/sku', getRepeatRateBySKU);
router.get('/customer-stickiness', getCustomerStickiness);


export default router;
