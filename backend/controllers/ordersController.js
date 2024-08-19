import {getOrdersTrend ,  calculateOrderTimeDifferences , calculateAOV , calculateCOGS ,calculateGrossProfit , calculateNetProfit} from "../services/ordersService.js";


export const ordersTrend = async (req, res) => {
  try {
    const trends = await getOrdersTrend();
    res.json(trends);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const getOrderTimeDifferences = async (req, res) => {
  try {
    console.log("Request received to calculate order time differences.");

    if (!res) {
      console.error('Response object (res) is not defined');
      return;
    }

    await calculateOrderTimeDifferences(req, res);
  } catch (error) {
    console.error("Error in getOrderTimeDifferences:", error);
    res.status(500).json({ message: "An error occurred while processing the request." });
  }
};

export const getAOV = async (req, res) => {
  try {
    const aovData = await calculateAOV();
    res.json(aovData);
  } catch (error) {
    console.error('Error fetching AOV data:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const getCOGS = async (req, res) => {
  try {
      const totalCOGS = await calculateCOGS();
      res.status(200).json({
          success: true,
          totalCOGS
      });
  } catch (error) {
      console.error('Error in getCOGS controller:', error);
      res.status(500).json({
          success: false,
          message: 'Error calculating COGS'
      });
  }
};

export const getGrossProfit = async (req, res) => {
  try {
      const { totalPrice, totalCOGS, grossProfit } = await calculateGrossProfit();
      res.json({
          totalPrice,
          totalCOGS,
          grossProfit
      });
  } catch (error) {
      res.status(500).json({ error: 'Failed to calculate Gross Profit' });
  }
};

export const getNetProfit = async (req, res) => {
  try {
      const { totalPrice, totalCOGS, grossProfit, totalExpenses,  netProfit } = await calculateNetProfit();
      res.json({
          totalPrice,
          totalCOGS,
          grossProfit,
          totalExpenses,
          netProfit
      });
  } catch (error) {
      res.status(500).json({ error: 'Failed to calculate Net Profit' });
  }
};




