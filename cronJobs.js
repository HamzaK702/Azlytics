import cron from "node-cron";
import { importShopifyData } from "./jobs/importShopifyData.js";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

mongoose.set("strictQuery", true);
await mongoose.connect(process.env.MONGO_URL);

// Import tasks

// Run sendEmails every hour
// cron.schedule("*/15 * * * *", () => {
//     console.log("Running sendEmails task");
importShopifyData();
// });
