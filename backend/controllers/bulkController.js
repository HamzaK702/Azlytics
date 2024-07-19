import { BulkOperationService } from "../services/bulkOperationService.js";

export const startBulkOperation = async (req, res) => {
    const { shop, token } = req.body;
    try {
        const bulkOperation = await BulkOperationService.runBulkOperation(shop, token, BulkOperationService.productQuery);
        res.json(bulkOperation);
    } catch (error) {
        console.error('Error starting bulk operation:', error.message);
        res.status(500).json({ error: error.message });
    }
};

export const checkBulkOperationStatus = async (req, res) => {
    const { shop, token } = req.query;
    try {
        const bulkOperationStatus = await BulkOperationService.pollBulkOperationStatus(shop, token, req.params.id);
        res.json(bulkOperationStatus);
    } catch (error) {
        console.error('Error checking bulk operation status:', error.message);
        res.status(500).json({ error: error.message });
    }
};

export const fetchBulkOperationResults = async (req, res) => {
    const { url } = req.query;
    try {
        const results = await BulkOperationService.fetchBulkOperationResults(url);
        res.json(results);
    } catch (error) {
        console.error('Error fetching bulk operation results:', error.message);
        res.status(500).json({ error: error.message });
    }
};
