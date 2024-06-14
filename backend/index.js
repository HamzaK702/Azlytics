import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";
import authRoutes from "./routes/authRoutes.js"

/* CONFIGURATIONS */
dotenv.config();
 
const app = express();
app.use(express.json());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("common"));

app.use(cors());

//test api
app.get('/hello', (req, res) => {
  res.send('Hello World 123');
});

/* ROUTES */
 app.use("/api", authRoutes)
 
 /* SETUP */
const PORT = process.env.SERVER_PORT || 3002;
mongoose.set("strictQuery" , true);
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    app.listen(PORT, () => console.log(`Server Port: ${PORT}`));
    
  })
  .catch((error) => console.log(`${error} did not connect`));