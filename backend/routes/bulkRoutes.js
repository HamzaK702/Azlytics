import express from 'express';
import { startBulkOperation, checkBulkOperationStatus, fetchBulkOperationResults } from  '../controllers/bulkController.js';

const router = express.Router();

router.post('/start-bulk-operation', startBulkOperation);
router.get('/check-bulk-operation-status/:id', checkBulkOperationStatus);
router.get('/fetch-bulk-operation-results', fetchBulkOperationResults);

export default router;
