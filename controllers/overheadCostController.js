import { addOverheadCost , removeOverheadCost } from "../services/overheadCostService.js";

export const createOrUpdateOverheadCost = async (req, res) => {
    const { shopId, year, month, overheadCost, currency } = req.body;
  
    try {
      if (!shopId || !year || !month || overheadCost === undefined) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
  
      const result = await addOverheadCost(shopId, year, month, overheadCost, currency);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  };

  export const deleteOverheadCost = async (req, res) => {
    const { shopId, year, month } = req.body;
  
    try {
      if (!shopId || !year || !month) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
  
      const result = await removeOverheadCost(shopId, year, month);
  
      return res.status(200).json({ message: 'Overhead cost entry removed', result });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  };