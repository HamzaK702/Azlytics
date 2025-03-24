import csv from "csv-parser";
import express from "express";
import fs from "fs";
import multer from "multer";
import Customer from "../models/BulkTables/BulkCustomer/customer.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

const fieldMapping = {
  email: "email",
  first_name: "firstName",
  last_name: "lastName",
  default_address_phone: "phone",
  default_address_province_code: "state",
  note: "note",
  total_orders: "numberOfOrders",

  // additional_fees: "extraCharges",
  // taxes: "taxAmount",
  // total_sales: "totalRevenue",
  // average_order_value: "avgOrderValue",
  // cost_of_goods_sold: "COGS",
  // customers: "uniqueCustomers",
  // net_items_sold: "totalItemsSold",
  // number_of_orders_per_customer: "ordersPerCustomer",
  // new_customers: "newCustomerCount",
  // orders_first_time: "firstTimeOrders",
  // orders_returning: "returningOrders",
  // quantity_ordered: "totalQuantity",
  // quantity_ordered_per_order: "avgItemsPerOrder",
  // returning_customer_rate: "returningCustomerRate",
  // returning_customers: "repeatCustomers",
  // total_sales_first_time: "firstTimeCustomerSales",
  // total_sales_returning: "returningCustomerSales",
  // total_amount_spent: "totalSpent",
  // total_amount_spent_per_order: "avgSpendingPerOrder",
  // total_number_of_orders: "orderCount",
};

router.post("/upload-csv", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const filePath = req.file.path;
  const customers = [];

  fs.createReadStream(filePath)
    .pipe(csv())
    .on("data", (row) => {
      const mappedRow = {};
      // ADDING STRUCUTRE DATA  LIKE OBJ  OR ARRAYS MANUALLY
      // adding name
      mappedRow["displayName"] = `${row["first_name"] || ""} ${
        row["last_name"] || ""
      }`.trim();

      // adding addresses
      mappedRow["addresses"] = [
        {
          adreess1: row["default_address_address1"],
          adreess2: row["default_address_address2"],
          city: row["default_address_city"],
          company: row["default_address_company"],
          country: row["default_address_country_code"],
          countryCode: row["default_address_country_code"],
          firstName: row["first_name"],
          lastName: row["last_name"],
          name: `${row["first_name"] || ""} ${row["last_name"] || ""}`.trim(),
          phone: row["default_address_phone"],
          province: row["default_address_province_code"],
          provinceCodeprovince: row["default_address_province_code"],
          zip: row["default_address_zip"],
        },
      ];

      // adding name
      mappedRow["tags"] = [row["tags"]];

      // just Customer id remaining

      mappedRow["id"] = `gid://shopify/Customer/${row["customer_id"].substring(
        1
      )}`;

      for (const key in row) {
        if (fieldMapping[key]) {
          mappedRow[fieldMapping[key]] = isNaN(row[key])
            ? row[key]
            : Number(row[key]);
        }
      }
      customers.push(mappedRow);
    })
    .on("end", async () => {
      try {
        console.log(customers.length);
        await Customer.insertMany(customers);
        res.json({ message: "CSV data inserted successfully!" });
      } catch (error) {
        res.status(500).json({ error: "Error inserting data" });
      }
      fs.unlinkSync(filePath);
    });
});

export default router;
