// File: routes/tiktokAdsRoute.js
import express from 'express';
import TikTokAdsController from '../controllers/tiktokAdsController.js';

const router = express.Router();

router.get('/ads/analytics', TikTokAdsController.getAdAnalytics);

export default router;
