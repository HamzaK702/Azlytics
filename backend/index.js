import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import session from "express-session";
import helmet from "helmet";
import mongoose from "mongoose";
import morgan from "morgan";
import passport from "passport";
import bodyParser from "body-parser"; // Import body-parser
import "./config/passportConfig.js";
import InventoryRoutes from "./routes/InventoryRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import bulkRoutes from "./routes/bulkRoutes.js";
import customerAnalyticRoutes from "./routes/customerAnalyticRoutes.js";
import dataDeletionRoute from "./routes/dataDeletion.js";
import facebookRoutes from "./routes/facebookRoutes.js";
import googleAdAuthRoutes from "./routes/googleAdRoutes.js";
import gptRoutes from "./routes/gptRoutes.js";
import ordersRoutes from "./routes/ordersRoutes.js";
import overHeadCostRoute from "./routes/overheadCostRoute.js";
import productRoutes from "./routes/productRoutes.js";
import profitabilityRoutes from "./routes/profitRoute.js";
import retentionRoutes from "./routes/retentionRoutes.js";
import salesRoutes from "./routes/salesRoutes.js";
import shopifyRouter from "./routes/shopifyRoute.js";
import { ShopifyService } from "./services/ShopifyService.js";

/* CONFIGURATIONS */
dotenv.config();

const app = express();

/* MIDDLEWARE */
app.use(express.json());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("common"));
app.use(cors());
app.use(cookieParser()); 
app.use(
  bodyParser.json({
    type: '/',
    limit: '50mb',
    verify: function (req, res, buf) {
      if (req.url.startsWith('/webhooks')) {
        req.rawbody = buf;
      }
    },
  })
);

// Session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === "production" }, // Ensure cookies are secure in production
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Test API
app.get("/hello", async (req, res) => {
  const shop = "dumbclient.myshopify.com";
  const token = "shpua_9dd90273c982021d4c9bed11b7bc6e6c";
  const orderId = "gid://shopify/Order/6052399480893"
  //const resp = await ShopifyService.getShippingRates(shop, token, orderId)
  
  res.send('Hello, Login Success ');
});

/* ROUTES */
app.use("/api", authRoutes);
app.use("/api", shopifyRouter);
app.use("/bulk", bulkRoutes);
app.use("/api", googleAdAuthRoutes);
app.use("/api", facebookRoutes);
app.use("/api", ordersRoutes);
app.use("/api", salesRoutes);
app.use("/api", retentionRoutes);
app.use("/api", customerAnalyticRoutes);
app.use("/api", overHeadCostRoute);
app.use("/api", productRoutes);
app.use("/api", InventoryRoutes);
app.use("/api", profitabilityRoutes);
app.use("/api", gptRoutes);
app.use("/webhooks", dataDeletionRoute);

/* DATABASE CONNECTION AND SERVER SETUP */
const PORT = process.env.SERVER_PORT || 3002;
mongoose.set("strictQuery", true);
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    app.listen(PORT, () => console.log(`Server Port: ${PORT}`));
  })
  .catch((error) => console.log(`${error} did not connect`));
