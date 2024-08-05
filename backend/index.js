import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";
import passport from 'passport';
import session from 'express-session';
import authRoutes from "./routes/authRoutes.js";
import shopifyRouter from "./routes/shopifyRoute.js"
import cookieParser from 'cookie-parser';
import './config/passportConfig.js'; 
import bulkRoutes from  './routes/bulkRoutes.js';
import Order from "./models/BulkTables/BulkOrder/order.js";
import Customer from "./models/BulkTables/BulkCustomer/customer.js";
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

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' } // Ensure cookies are secure in production
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Test API
app.get('/hello', (req, res) => {
  res.send('Hello, Login Success ');
});

/* ROUTES */
app.use("/api", authRoutes);
app.use('/api', shopifyRouter);
app.use('/bulk', bulkRoutes);

app.get('/orders-trend', async (req, res) => {
  try {
    // Fetch all orders and customers
    const orders = await Order.find();
    const customers = await Customer.find();

    // Convert data to a more accessible format
    const customerMap = new Map();
    customers.forEach(customer => {
      if (customer && customer.id) {
        customerMap.set(customer.id, customer.createdAt);
      }
    });

    // Initialize data storage for the results
    const results = {};

    // Process each order
    orders.forEach(order => {
      if (order.customer && order.customer.id) {
        const orderDate = order.createdAt.toISOString().split('T')[0];
        const customerCreatedAt = customerMap.get(order.customer.id);

        if (!results[orderDate]) {
          results[orderDate] = {
            totalOrders: 0,
            newCustomerOrders: 0,
            returningCustomerOrders: 0,
          };
        }

        // Increment total orders
        results[orderDate].totalOrders += 1;

        // Determine if the order is from a new or returning customer
        if (customerCreatedAt && order.createdAt.toISOString() === customerCreatedAt.toISOString()) {
          results[orderDate].newCustomerOrders += 1;
        } else {
          results[orderDate].returningCustomerOrders += 1;
        }
      }
    });

    // Convert results to an array format for easier frontend handling
    const responseArray = Object.keys(results).map(date => ({
      orderDate: date,
      ...results[date],
    }));

    res.json(responseArray);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});





/* DATABASE CONNECTION AND SERVER SETUP */
const PORT = process.env.SERVER_PORT || 3002;
mongoose.set("strictQuery", true);
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    app.listen(PORT, () => console.log(`Server Port: ${PORT}`));
  })
  .catch((error) => console.log(`${error} did not connect`));
