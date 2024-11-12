import express from "express";
import { dataDeletionController } from "../controllers/dataDeletion.js";
import { verifySHA256 } from "../middlewares/shopifyHvac.js";
const router = express.Router();

router.post("/shop/redact", verifySHA256, dataDeletionController);

export default router;
