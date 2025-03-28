// controllers/profitController.js

import grossProfitService, {
  calculatePerformanceMetrics,
  getCostsBreakdownService,
  getCostTrendsService,
  getGrossProfitService,
  getProductsBreakdownService,
  getProfitTableService,
} from "../services/grossProfitService.js";
import profitService from "../services/profitService.js";
import profitabilityService from "../services/profitabilityService.js";

export const getGrossProfit = async (req, res) => {
  try {
    const { filter } = req.query;
    const { userShopId } = req;

    // Validate filter
    const validFilters = [
      "yesterday",
      "7d",
      "30d",
      "3m",
      "6m",
      "12m",
      "one_month",
    ];

    if (!validFilters.includes(filter)) {
      return res.status(400).json({ error: "Invalid filter specified" });
    }

    const data = await grossProfitService.calculateGrossProfitData(
      filter,
      userShopId
    );
    res.json(data);
  } catch (error) {
    console.error("Error in getGrossProfit:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getProfitTrends = async (req, res) => {
  try {
    const { filter, format } = req.query;
    const { userShopId } = req;

    // Validate filter and format
    const validFilters = ["yesterday", "7d", "30d", "3m", "6m", "12m"];
    const validFormats = ["day", "week", "month"];

    if (!validFilters.includes(filter)) {
      return res.status(400).json({ error: "Invalid filter specified" });
    }
    if (!validFormats.includes(format)) {
      return res.status(400).json({ error: "Invalid format specified" });
    }

    const data = await profitabilityService.calculateProfitTrends(
      filter,
      format,
      userShopId
    );
    res.json(data);
  } catch (error) {
    console.error("Error in getProfitTrends:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getProfitData = async (req, res) => {
  try {
    const { userShopId } = req;
    const data = await profitService.calculateProfitData(userShopId);
    res.json(data);
  } catch (error) {
    console.error("Error in getProfitData:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getPerformanceMetrics = async (req, res) => {
  try {
    const { userShopId } = req;
    const timeFormat = req.query.format === "month" ? "month" : "year";
    const performanceData = await calculatePerformanceMetrics(
      timeFormat,
      userShopId
    );
    res.json(performanceData);
  } catch (error) {
    console.error("Error fetching performance metrics:", error);
    res.status(500).json({ message: "Error fetching performance metrics." });
  }
};

export const getProfitTableController = async (req, res) => {
  try {
    const { filter, customStartDate, customEndDate } = req.query;
    const { userShopId } = req;

    // Validate filter parameter
    if (!filter) {
      return res.status(400).json({ message: "Filter parameter is required." });
    }

    // Call the service to get the profit table data
    const profitTable = await getProfitTableService(
      filter,
      customStartDate,
      customEndDate,
      userShopId
    );

    // Send the response
    res.json(profitTable);
  } catch (error) {
    console.error("Error fetching profit table:", error);
    res.status(500).json({ message: "Error fetching profit table." });
  }
};

export const getCostTrendsController = async (req, res) => {
  try {
    const { filter, customStartDate, customEndDate } = req.query;
    const { userShopId } = req;

    const allowedFilters = [
      "yesterday",
      "7d",
      "30d",
      "3m",
      "6m",
      "12m",
      "custom_date_range",
    ];

    if (!filter || !allowedFilters.includes(filter)) {
      return res.status(400).json({
        message: `Invalid or missing filter parameter. Allowed values are: ${allowedFilters.join(
          ", "
        )}.`,
      });
    }

    if (
      filter === "custom_date_range" &&
      (!customStartDate || !customEndDate)
    ) {
      return res.status(400).json({
        message:
          "Custom start and end dates are required for custom_date_range filter.",
      });
    }

    const costTrends = await getCostTrendsService(
      filter,
      customStartDate,
      customEndDate,
      userShopId
    );

    res.json(costTrends);
  } catch (error) {
    console.error("Error fetching cost trends:", error);
    res.status(500).json({ message: "Error fetching cost trends." });
  }
};

export const getGrossProfitController = async (req, res) => {
  try {
    const { filter, customStartDate, customEndDate } = req.query;
    const { userShopId } = req;

    const allowedFilters = [
      "yesterday",
      "7d",
      "30d",
      "3m",
      "6m",
      "12m",
      "custom_date_range",
    ];

    if (!filter || !allowedFilters.includes(filter)) {
      return res.status(400).json({
        message: `Invalid or missing filter parameter. Allowed values are: ${allowedFilters.join(
          ", "
        )}.`,
      });
    }

    if (
      filter === "custom_date_range" &&
      (!customStartDate || !customEndDate)
    ) {
      return res.status(400).json({
        message:
          "Custom start and end dates are required for custom_date_range filter.",
      });
    }

    const grossProfitData = await getGrossProfitService(
      filter,
      customStartDate,
      customEndDate,
      userShopId
    );

    res.json(grossProfitData);
  } catch (error) {
    console.error("Error fetching gross profit data:", error);
    res.status(500).json({ message: "Error fetching gross profit data." });
  }
};

export const getCostsBreakdownController = async (req, res) => {
  try {
    const { filter, customStartDate, customEndDate } = req.query;
    const { userShopId } = req;

    const allowedFilters = [
      "yesterday",
      "7d",
      "30d",
      "3m",
      "6m",
      "12m",
      "custom_date_range",
    ];

    if (!filter || !allowedFilters.includes(filter)) {
      return res.status(400).json({
        message: `Invalid or missing filter parameter. Allowed values are: ${allowedFilters.join(
          ", "
        )}.`,
      });
    }

    if (
      filter === "custom_date_range" &&
      (!customStartDate || !customEndDate)
    ) {
      return res.status(400).json({
        message:
          "Custom start and end dates are required for custom_date_range filter.",
      });
    }

    // Call the service function to get the costs breakdown
    const costsBreakdown = await getCostsBreakdownService(
      filter,
      customStartDate,
      customEndDate,
      userShopId
    );

    // Send the response
    res.json(costsBreakdown);
  } catch (error) {
    console.error("Error fetching costs breakdown:", error);
    res.status(500).json({ message: "Error fetching costs breakdown." });
  }
};

export const getProductsBreakdownController = async (req, res) => {
  try {
    const { filter, variant, customStartDate, customEndDate } = req.query;
    const { userShopId } = req;

    const allowedFilters = [
      "yesterday",
      "7d",
      "30d",
      "3m",
      "6m",
      "12m",
      "one_week",
      "custom_date_range",
    ];
    const allowedVariants = ["products", "variants", "categories"];

    if (!filter || !allowedFilters.includes(filter)) {
      return res.status(400).json({
        message: `Invalid or missing filter parameter. Allowed values are: ${allowedFilters.join(
          ", "
        )}.`,
      });
    }

    if (!variant || !allowedVariants.includes(variant)) {
      return res.status(400).json({
        message: `Invalid or missing variant parameter. Allowed values are: ${allowedVariants.join(
          ", "
        )}.`,
      });
    }

    if (
      filter === "custom_date_range" &&
      (!customStartDate || !customEndDate)
    ) {
      return res.status(400).json({
        message:
          "Custom start and end dates are required for custom_date_range filter.",
      });
    }

    // Call the service function to get the data
    const data = await getProductsBreakdownService(
      filter,
      variant,
      customStartDate,
      customEndDate,
      userShopId
    );

    res.json(data);
  } catch (error) {
    console.error("Error fetching products breakdown:", error);
    res.status(500).json({ message: "Error fetching products breakdown." });
  }
};
