
import express from 'express';
import { 
    startProductBulkOperation, 
    startOrderBulkOperation, 
    startCustomerBulkOperation, 
    checkBulkOperationStatus, 
    fetchBulkOperationResults 
} from '../controllers/bulkController.js';

const router = express.Router();

router.post('/start-product-bulk-operation', startProductBulkOperation);  // Starts to call product data from Shopify
router.post('/start-order-bulk-operation', startOrderBulkOperation);  // Starts to call order data from Shopify
router.post('/start-customer-bulk-operation', startCustomerBulkOperation);  // Starts to call customer data from Shopify
router.get('/check-bulk-operation-status/:id', checkBulkOperationStatus);  // Checks if our bulk operation is ready to fetch
router.get('/fetch-bulk-operation-results', fetchBulkOperationResults);  // Fetches the results of the bulk operation

export default router;
