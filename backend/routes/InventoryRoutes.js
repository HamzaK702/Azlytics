import express from "express";
import {
  fetchInventory,
  fetchInventoryTableData,
} from "../controllers/inventoryController.js";

const router = express.Router();

router.get("/inventory", fetchInventory);
router.get("/inventory/table", fetchInventoryTableData);
export default router;
