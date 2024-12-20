// File: routes/tiktokOAuthRoute.js
import express from 'express';
import TikTokOAuthController from '../controllers/tiktokOAuthController.js';

const router = express.Router();

router.get('/oauth/redirect', TikTokOAuthController.redirectToTikTok);
router.get('/oauth/callback', TikTokOAuthController.handleCallback);

export default router;
