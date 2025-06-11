import {
    saveCustomerData,
    saveOrderData,
    saveProductData,
} from "../services/dataProcessingService.js";
import BulkOperation from "../models/bulkOperationModel.js";

export async function importShopifyData() {
    console.log("importShopifyData job started");
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const bulkOperations = await BulkOperation.find({
        lastChecked: { $lte: fiveMinutesAgo },
        status: { $in: ["created", "pending"] },
    });
    if (bulkOperations.length === 0) {
        console.log("No bulk operations to process.");
        return;
    }

    for (const operation of bulkOperations) {
        try {
            let results = [];

            console.log(`Processing bulk operation: ${operation.id}`);
            // Here you would call your function to process the bulk operation
            // For example:
            // await processBulkOperation(operation);
            // Update the last_checked time
            operation.lastChecked = new Date();

            const status = await BulkOperationService.pollBulkOperationStatus(
                shop,
                token,
                operation.bulkOperationId
            );

            if (status.status === "COMPLETED") {
                console.log(`${operation.type} bulk operation completed.`);
                console.log("Result URL:", status.url);
                operation.status = "completed"; // Update status to completed

                if (!status.url) {
                    console.log(
                        `No data URL found likely no ${operation.type} in store. Skipping fetch.`
                    );
                    break; // Exit loop — skip fetch, prevent old process repeat
                }

                operation.dataUrl = status.url; // Save the URL for later use

                results = await BulkOperationService.fetchBulkOperationResults(
                    status.url
                );
            } else if (status.status === "FAILED") {
                operation.status = "failed"; // Update status to failed
                console.log("status", status);
                console.error(
                    `${operation.type} bulk operation failed with error: ${status.errorCode}`
                );
                // throw new Error(`${operation.type} bulk operation failed`);
            }

            if (results.length) {
                operation.totalRecords = results.length; // Save the total records count
                if (operation.type === "customer") {
                    await saveCustomerData(results, operation);
                } else if (operation.type == "order") {
                    await saveOrderData(results, operation);
                } else if (operation.type == "product") {
                    await saveProductData(results, operation);
                }
            }
            await operation.save();
        } catch (error) {
            console.error(
                `Error processing bulk operation ${operation.id}:`,
                error.message
            );
        }
    }
}
