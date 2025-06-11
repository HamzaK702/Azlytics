import express from 'express';
import { createOrUpdateOverheadCost , deleteOverheadCost } from '../controllers/overheadCostController.js';

const router = express.Router();

router.post('/overhead-cost', createOrUpdateOverheadCost);
router.delete('/overhead-cost', deleteOverheadCost);

export default router;
