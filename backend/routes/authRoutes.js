// Import necessary modules
import express from 'express';
import authController from '../controllers/authController.js';

const router = express.Router();

// Register route for Firebase-authenticated users
router.post('/register', authController.registerFirebaseUser);

// Login route for Firebase-authenticated users
router.post('/login', authController.loginFirebaseUser);

// Route to verify the token
router.get('/authenticate', authController.authenticate);

export default router;
