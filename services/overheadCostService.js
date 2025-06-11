import OverheadCost from "../models/overheadCostModel.js";
export const addOverheadCost = async (shopId, year, month, overheadCost, currency = 'USD') => {
    try {
      let overheadCostEntry = await OverheadCost.findOne({ shopId, year, month });
  
      if (overheadCostEntry) {
        // Update existing entry
        overheadCostEntry.overheadCost = overheadCost;
        overheadCostEntry.currency = currency;
        overheadCostEntry.updatedAt = Date.now();
      } else {
        // Create new entry
        overheadCostEntry = new OverheadCost({
          shopId,
          year,
          month,
          overheadCost,
          currency
        });
      }
  
      await overheadCostEntry.save();
      return overheadCostEntry;
    } catch (error) {
      throw new Error(`Error adding or updating overhead cost: ${error.message}`);
    }
  };

  export const removeOverheadCost = async (shopId, year, month) => {
    try {
      const result = await OverheadCost.findOneAndDelete({ shopId, year, month });
  
      if (!result) {
        throw new Error('Overhead cost entry not found');
      }
  
      return result;
    } catch (error) {
      throw new Error(`Error removing overhead cost: ${error.message}`);
    }
  };