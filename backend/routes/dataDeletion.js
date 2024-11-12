import express from "express";
import { dataDeletionController } from "../controllers/dataDeletion.js";
const router = express.Router();

router.post("/shop/redact", dataDeletionController);

export default router;
