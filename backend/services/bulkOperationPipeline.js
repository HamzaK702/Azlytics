import { BulkOperationService } from "../services/bulkOperationService.js";

const POLLING_INTERVAL = 5000;

const createAndCheckBulkOperations = async (shop, token) => {
    try {
        console.log('Starting product bulk operation...');
        const productBulkOperation = await BulkOperationService.runBulkOperation(shop, token, BulkOperationService.productQuery);

        console.log('Starting order bulk operation...');
        const orderBulkOperation = await BulkOperationService.runBulkOperation(shop, token, BulkOperationService.orderQuery);

        console.log('Starting customer bulk operation...');
        const customerBulkOperation = await BulkOperationService.runBulkOperation(shop, token, BulkOperationService.customerQuery);

        const bulkOperations = [
            { type: 'product', id: productBulkOperation.data.bulkOperationRunQuery.bulkOperation.id },
            { type: 'order', id: orderBulkOperation.data.bulkOperationRunQuery.bulkOperation.id },
            { type: 'customer', id: customerBulkOperation.data.bulkOperationRunQuery.bulkOperation.id }
        ];

        const checkStatusAndLogResults = async () => {
            for (const operation of bulkOperations) {
                const status = await BulkOperationService.pollBulkOperationStatus(shop, token, operation.id);

                if (status.status === 'COMPLETED') {
                    console.log(`${operation.type} bulk operation completed. Fetching results...`);
                    const results = await BulkOperationService.fetchBulkOperationResults(status.url);
                    console.log(`${operation.type} bulk operation results:`, results);
                    bulkOperations.splice(bulkOperations.indexOf(operation), 1);
                } else if (status.status === 'FAILED') {
                    console.error(`${operation.type} bulk operation failed with error: ${status.errorCode}`);
                    bulkOperations.splice(bulkOperations.indexOf(operation), 1);
                }
            }

            if (bulkOperations.length > 0) {
                setTimeout(checkStatusAndLogResults, POLLING_INTERVAL);
            } else {
                console.log('All bulk operations completed.');
            }
        };

        setTimeout(checkStatusAndLogResults, POLLING_INTERVAL);
    } catch (error) {
        console.error('Error creating and checking bulk operations:', error.message);
    }
};

export default createAndCheckBulkOperations;
