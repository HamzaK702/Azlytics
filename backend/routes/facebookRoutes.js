import express from 'express';
import { redirectToFacebook, handleFacebookCallback } from '../controllers/facebookController.js';

const router = express.Router();

router.get('/facebook-access', redirectToFacebook);
router.get('/facebook-success', handleFacebookCallback);

export default router;
