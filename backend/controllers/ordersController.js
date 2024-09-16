import {
  getOrdersTrend,
  calculateOrderTimeDifferences,
  calculateAOV,
  calculateCOGS,
  calculateGrossProfit,
  calculateNetProfit,
  getOrdersTrendComparison,
} from "../services/ordersService.js";

export const ordersTrend = async (req, res) => {
  try {
    const filter = req.query.filter;
    const customStartDate = req.query.customStartDate;
    const customEndDate = req.query.customEndDate;

    const ordersTrendData = await getOrdersTrend(
      filter,
      customStartDate,
      customEndDate
    );

    res.json(ordersTrendData);
  } catch (error) {
    console.error("Error fetching orders trend:", error);
    res.status(500).json({ message: "Error fetching orders trend" });
  }
};

export const fetchOrdersTrendComparison = async (req, res) => {
  try {
    const { filter, customStartDate, customEndDate } = req.query;

    const comparisonData = await getOrdersTrendComparison(
      filter,
      customStartDate,
      customEndDate
    );

    res.status(200).json({
      success: true,
      data: comparisonData,
    });
  } catch (error) {
    console.error("Error in getOrdersTrendComparison:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders trend comparison",
      error: error.message,
    });
  }
};

export const getOrderTimeDifferences = async (req, res) => {
  try {
    console.log("Request received to calculate order time differences.");

    if (!res) {
      console.error("Response object (res) is not defined");
      return;
    }

    await calculateOrderTimeDifferences(req, res);
  } catch (error) {
    console.error("Error in getOrderTimeDifferences:", error);
    res
      .status(500)
      .json({ message: "An error occurred while processing the request." });
  }
};

export const getAOV = async (req, res) => {
  try {
    const aovData = await calculateAOV();
    res.json(aovData);
  } catch (error) {
    console.error("Error fetching AOV data:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getCOGS = async (req, res) => {
  try {
    const totalCOGS = await calculateCOGS();
    res.status(200).json({
      success: true,
      totalCOGS,
    });
  } catch (error) {
    console.error("Error in getCOGS controller:", error);
    res.status(500).json({
      success: false,
      message: "Error calculating COGS",
    });
  }
};

export const getGrossProfit = async (req, res) => {
  try {
    const { totalPrice, totalCOGS, grossProfit } = await calculateGrossProfit();
    res.json({
      totalPrice,
      totalCOGS,
      grossProfit,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to calculate Gross Profit" });
  }
};

export const getNetProfit = async (req, res) => {
  try {
    const { totalPrice, totalCOGS, grossProfit, totalExpenses, netProfit } =
      await calculateNetProfit();
    res.json({
      totalPrice,
      totalCOGS,
      grossProfit,
      totalExpenses,
      netProfit,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to calculate Net Profit" });
  }
};
