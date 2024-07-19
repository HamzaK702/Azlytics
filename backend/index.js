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


/* DATABASE CONNECTION AND SERVER SETUP */
const PORT = process.env.SERVER_PORT || 3002;
mongoose.set("strictQuery", true);
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    app.listen(PORT, () => console.log(`Server Port: ${PORT}`));
  })
  .catch((error) => console.log(`${error} did not connect`));
