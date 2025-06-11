import express from "express";
import {
  fetchInventory,
  fetchInventoryTableData,
} from "../controllers/inventoryController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/inventory", authMiddleware, fetchInventory);
router.get("/inventory/table", authMiddleware, fetchInventoryTableData);
export default router;
