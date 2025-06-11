import EventEmitter from "events";
import { BulkOperationService } from "../services/bulkOperationService.js";
import {
    saveCustomerData,
    saveOrderData,
    saveProductData,
} from "./dataProcessingService.js";
import BulkOperation from "../models/bulkOperationModel.js";
export const eventEmitter = new EventEmitter();

const createAndCheckBulkOperations = async (shop, token, userShopId) => {
    try {
        let productBulkOperationRecord = await BulkOperation.findOne({
            shopId: userShopId,
            type: "product",
        });

        if (!productBulkOperationRecord) {
            console.log("Starting product bulk operation...");
            const productBulkOperation =
                await BulkOperationService.runBulkOperation(
                    shop,
                    token,
                    BulkOperationService.productQuery
                );
            if (
                productBulkOperation.data.bulkOperationRunQuery.userErrors
                    .length
            ) {
                console.error(
                    "Product bulk operation errors:",
                    productBulkOperation.data.bulkOperationRunQuery.userErrors
                );
            }

            console.log("Saving bulk operation details to database...");

            await BulkOperation.create({
                shopId: userShopId,
                bulkOperationId:
                    productBulkOperation.data.bulkOperationRunQuery
                        .bulkOperation.id,
                type: "product",
                bulkOperation: productBulkOperation,
                status: "created",
                createdAt: new Date(),
            });
        }

        let orderBulkOperationRecord = await BulkOperation.findOne({
            shopId: userShopId,
            type: "order",
        });

        if (!orderBulkOperationRecord) {
            console.log("Starting order bulk operation...");
            const orderBulkOperation =
                await BulkOperationService.runBulkOperation(
                    shop,
                    token,
                    BulkOperationService.orderQuery
                );
            if (
                orderBulkOperation.data.bulkOperationRunQuery.userErrors.length
            ) {
                console.error(
                    "Order bulk operation errors:",
                    orderBulkOperation.data.bulkOperationRunQuery.userErrors
                );
            }

            await BulkOperation.create({
                shopId: userShopId,
                bulkOperationId:
                    orderBulkOperation.data.bulkOperationRunQuery.bulkOperation
                        .id,
                type: "order",
                bulkOperation: orderBulkOperation,
                status: "created",
                createdAt: new Date(),
            });
        }

        let customerBulkOperationRecord = await BulkOperation.findOne({
            shopId: userShopId,
            type: "customer",
        });

        if (!customerBulkOperationRecord) {
            console.log("Starting customer bulk operation...");
            const customerBulkOperation =
                await BulkOperationService.runBulkOperation(
                    shop,
                    token,
                    BulkOperationService.customerQuery
                );
            if (
                customerBulkOperation.data.bulkOperationRunQuery.userErrors
                    .length
            ) {
                console.error(
                    "Customer bulk operation errors:",
                    customerBulkOperation.data.bulkOperationRunQuery.userErrors
                );
            }

            await BulkOperation.create({
                shopId: userShopId,
                bulkOperationId:
                    customerBulkOperation.data.bulkOperationRunQuery
                        .bulkOperation.id,
                type: "order",
                bulkOperation: customerBulkOperation,
                status: "created",
                createdAt: new Date(),
            });
        }

        console.log("All operations completed and saved.");
    } catch (error) {
        console.error("Error creating and checking bulk operations:", error);
    }
};

eventEmitter.on("shopAuthSuccess", ({ shop, accessToken, userShopId }) => {
    createAndCheckBulkOperations(shop, accessToken, userShopId);
});

export default createAndCheckBulkOperations;
