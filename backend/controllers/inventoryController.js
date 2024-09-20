import {
  getInventory,
  getInventoryTableData,
} from "../services/inventoryService.js";

export const fetchInventory = async (req, res) => {
  try {
    const filter = req.query.filter;
    const customStartDate = req.query.customStartDate;
    const customEndDate = req.query.customEndDate;
    const groupBy = req.query.groupBy;

    const ordersTrendData = await getInventory(
      filter,
      customStartDate,
      customEndDate,
      groupBy
    );

    res.json(ordersTrendData);
  } catch (error) {
    console.error("Error fetching orders trend:", error);
    res.status(500).json({ message: "Error fetching orders trend" });
  }
};

export const fetchInventoryTableData = async (req, res) => {
  try {
    const tableData = await getInventoryTableData();
    res.json(tableData);
  } catch (error) {
    console.error("Error fetching inventory table data:", error);
    res.status(500).json({ message: "Error fetching inventory table data" });
  }
};
