import EventEmitter from "events";
import { BulkOperationService } from "../services/bulkOperationService.js";
import {
  saveCustomerData,
  saveOrderData,
  saveProductData,
} from "./dataProcessingService.js";

const POLLING_INTERVAL = 5000;
export const eventEmitter = new EventEmitter();

const checkStatusAndLogResults = async (
  shop,
  token,
  operation,
  saveDataCallback,
  userShopId
) => {
  while (true) {
    const status = await BulkOperationService.pollBulkOperationStatus(
      shop,
      token,
      operation.id
    );

    if (status.status === "COMPLETED") {
      console.log(`${operation.type} bulk operation completed.`);
      console.log("Result URL:", status.url);

      if (!status.url) {
        console.log(
          `No data URL found likely no ${operation.type} in store. Skipping fetch.`
        );
        break; // Exit loop — skip fetch, prevent old process repeat
      }

      const results = await BulkOperationService.fetchBulkOperationResults(
        status.url
      );
      await saveDataCallback(results, userShopId, shop, token);
      break; // Exit loop after successful fetch and save
    } else if (status.status === "FAILED") {
      console.error(
        `${operation.type} bulk operation failed with error: ${status.errorCode}`
      );
      throw new Error(`${operation.type} bulk operation failed`);
    } else {
      console.log(
        `${operation.type} bulk operation is still running. Checking again in ${
          POLLING_INTERVAL / 1000
        } seconds...`
      );
      await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL));
    }
  }
};

const createAndCheckBulkOperations = async (shop, token, userShopId) => {
  try {
    console.log("Starting product bulk operation...");
    const productBulkOperation = await BulkOperationService.runBulkOperation(
      shop,
      token,
      BulkOperationService.productQuery
    );
    if (productBulkOperation.data.bulkOperationRunQuery.userErrors.length) {
      console.error(
        "Product bulk operation errors:",
        productBulkOperation.data.bulkOperationRunQuery.userErrors
      );
      return; // Exit if there are errors in the product bulk operation
    }

    await checkStatusAndLogResults(
      shop,
      token,
      {
        type: "product",
        id: productBulkOperation.data.bulkOperationRunQuery.bulkOperation.id,
      },
      saveProductData,
      userShopId
    );

    console.log("Starting order bulk operation...");
    const orderBulkOperation = await BulkOperationService.runBulkOperation(
      shop,
      token,
      BulkOperationService.orderQuery
    );
    if (orderBulkOperation.data.bulkOperationRunQuery.userErrors.length) {
      console.error(
        "Order bulk operation errors:",
        orderBulkOperation.data.bulkOperationRunQuery.userErrors
      );
      return; // Exit if there are errors in the order bulk operation
    }

    await checkStatusAndLogResults(
      shop,
      token,
      {
        type: "order",
        id: orderBulkOperation.data.bulkOperationRunQuery.bulkOperation.id,
      },
      saveOrderData,
      userShopId
    );

    console.log("Starting customer bulk operation...");
    const customerBulkOperation = await BulkOperationService.runBulkOperation(
      shop,
      token,
      BulkOperationService.customerQuery
    );
    if (customerBulkOperation.data.bulkOperationRunQuery.userErrors.length) {
      console.error(
        "Customer bulk operation errors:",
        customerBulkOperation.data.bulkOperationRunQuery.userErrors
      );
      return; // Exit if there are errors in the customer bulk operation
    }

    await checkStatusAndLogResults(
      shop,
      token,
      {
        type: "customer",
        id: customerBulkOperation.data.bulkOperationRunQuery.bulkOperation.id,
      },
      saveCustomerData,
      userShopId
    );

    console.log("All operations completed and saved.");
  } catch (error) {
    console.error(
      "Error creating and checking bulk operations:",
      error.message
    );
  }
};

eventEmitter.on("shopAuthSuccess", ({ shop, accessToken, userShopId }) => {
  createAndCheckBulkOperations(shop, accessToken, userShopId);
});

export default createAndCheckBulkOperations;
