import {
    getInventory,
    getInventoryTableData,
} from "../services/inventoryService.js";

export const getUser = async (req, res) => {
    try {
        const user = req.user;

        let data = user.toJSON();
        data.shop = user.shop.toJSON();
        
        res.json(data);
    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ message: "Error fetching orders trend" });
    }
};
