    // googleAdAuthRoutes.js

import express from 'express';
import { getGoogleAuthUrl, handleGoogleAuthCallback } from '../controllers/googleAdAuth.js';

const router = express.Router();

router.get('/google-auth', getGoogleAuthUrl);
router.get('/google-auth/callback', handleGoogleAuthCallback);

export default router;
