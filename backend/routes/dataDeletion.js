import express from "express";
import { dataDeletionController } from "../controllers/dataDeletion.js";
import { validateWebhook } from "../middlewares/shopifyHvac.js";
const router = express.Router();

router.post("/data-deletion", validateWebhook, dataDeletionController);

export default router;
