import csv from "csv-parser";
import express from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import {
  fetchOrdersTrendComparison,
  getAOV,
  getCOGS,
  getGrossProfit,
  getNetProfit,
  getOrderTimeDifferences,
  ordersTrend,
} from "../controllers/ordersController.js";
import Customer from "../models/BulkTables/BulkCustomer/customer.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Workaround for `__dirname` in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

router.get("/orders-trend", ordersTrend);
router.get("/time-differences", getOrderTimeDifferences);
router.get("/aov", getAOV);
router.get("/cogs", getCOGS);
router.get("/gross-profit", getGrossProfit);
router.get("/net-profit", getNetProfit);
router.get("/orders-trend-comparison", fetchOrdersTrendComparison);

// CSV to MongoDB Field Mapping
// const fieldMapping = {
//   orders: "totalOrders",
//   gross_sales: "grossSales",
//   discounts: "discountAmount",
//   returns: "returnAmount",
//   net_sales: "netSales",
//   shipping_charges: "shippingCost",
//   duties: "dutyFees",
//   additional_fees: "extraCharges",
//   taxes: "taxAmount",
//   total_sales: "totalRevenue",
//   average_order_value: "avgOrderValue",
//   cost_of_goods_sold: "COGS",
//   customers: "uniqueCustomers",
//   net_items_sold: "totalItemsSold",
//   number_of_orders_per_customer: "ordersPerCustomer",
//   new_customers: "newCustomerCount",
//   orders_first_time: "firstTimeOrders",
//   orders_returning: "returningOrders",
//   quantity_ordered: "totalQuantity",
//   quantity_ordered_per_order: "avgItemsPerOrder",
//   returning_customer_rate: "returningCustomerRate",
//   returning_customers: "repeatCustomers",
//   total_sales_first_time: "firstTimeCustomerSales",
//   total_sales_returning: "returningCustomerSales",
//   total_amount_spent: "totalSpent",
//   total_amount_spent_per_order: "avgSpendingPerOrder",
//   total_number_of_orders: "orderCount",
// };

// Fields Mapping (same as your original)
// csv field name : dBName
const fieldsMapping = {
  name: "displayName",
  email: "email",
  phone: "phone",
  state: "state",
  shop: "shopName",
  orders: {
    path: "orders",
    map: (order) => ({
      orderId: order.id,
      orderName: order.name,
      totalPrice: order.totalPrice,
      currency: order.currencyCode,
      processedAt: order.processedAt?.$date || order.processedAt,
    }),
  },
  addresses: {
    path: "addresses",
    map: (address) => ({
      addressId: address.id,
      fullName: address.name,
      street: address.address1,
      city: address.city,
      country: address.country,
      default_address_zip: address.zip,
      phone: address.phone,
    }),
  },
};

// Function to transform data based on mapping
const transformData = (data, mapping) => {
  const transformed = {};

  for (const key in mapping) {
    const fieldConfig = mapping[key];

    if (typeof fieldConfig === "string") {
      // Direct mapping for simple fields
      transformed[key] = data[fieldConfig];
    } else if (typeof fieldConfig === "object" && fieldConfig.path) {
      // Create a single object (not an array) for nested fields
      const nestedObject = fieldConfig.map(data);
      transformed[key] = nestedObject;
    }
  }

  return transformed;
};

// Upload CSV API
router.post("/upload-csv", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const filePath = path.join(__dirname, "../", req.file.path);
  const results = [];

  // Read and parse CSV file
  fs.createReadStream(filePath)
    .pipe(csv())
    .on("data", (data) => results.push(data))
    .on("end", async () => {
      try {
        // Transform data using mapping
        const transformedData = results.map((item) =>
          transformData(item, fieldsMapping)
        );

        // Save to database (bulk insert)
        await Customer.insertMany(transformedData);

        // Delete the file after processing
        fs.unlinkSync(filePath);

        res.json({
          message: "CSV uploaded and processed successfully",
          data: transformedData,
        });
      } catch (error) {
        console.error("Error processing CSV:", error);
        res.status(500).json({ error: "Error processing CSV" });
      }
    });
});

export default router;
