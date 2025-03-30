import {
  calculateAveragePerOrder,
  calculateCustomerStickiness,
  calculateFollowUpPurchases,
  calculateLTV,
  calculateRepeatPurchaseRate,
  calculateRepeatPurchaseRateCompare,
  calculateRepeatRateByCity,
  calculateRepeatRateByProduct,
  calculateRepeatRateBySKU,
  calculateTimeBetweenOrders,
  getAovBreakdown,
  getCityBreakdown,
  getProductTitleBreakdown,
  getRegionBreakdown,
  getRetentionChart,
  getRetentionCurve,
  getRetentionCurveCompareData,
  getRetentionCurveData,
} from "../services/retentionService.js";

export const getRepeatRateByCity = async (req, res) => {
  try {
    const { userShopId } = req;
    const repeatRateByCity = await calculateRepeatRateByCity(userShopId);
    res.json(repeatRateByCity);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getRepeatRateBySKU = async (req, res) => {
  try {
    const repeatRateBySKU = await calculateRepeatRateBySKU();
    res.json(repeatRateBySKU);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getRepeatRateByProduct = async (req, res) => {
  try {
    const { userShopId } = req;
    const productData = await calculateRepeatRateByProduct(userShopId);
    return res.status(200).json(productData);
  } catch (error) {
    console.error("Error calculating repeat rate by product:", error);
    return res.status(500).json({
      success: false,
      message:
        "An error occurred while calculating the repeat rate by product.",
      error: error.message,
    });
  }
};

export const getCustomerStickiness = async (req, res) => {
  try {
    const stickinessData = await calculateCustomerStickiness();
    res.json(stickinessData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getRetentionRates = async (req, res) => {
  try {
    const retentionRates = await getRetentionCurve();
    res.status(200).json({
      status: "success",
      data: retentionRates,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to fetch retention rates",
      error: error.message,
    });
  }
};

export const getRetentionChartData = async (req, res) => {
  try {
    const { period } = req.query;
    const retentionData = await getRetentionChart(period);
    res.status(200).json({
      status: "success",
      data: retentionData.data,
    });
  } catch (error) {
    console.error("Error fetching retention chart data:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch retention chart data",
      error: error.message,
    });
  }
};

export const fetchCityBreakdown = async (req, res) => {
  try {
    const retentionRates = await getCityBreakdown();
    res.status(200).json({
      status: "success",
      data: retentionRates,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to fetch retention rates",
      error: error.message,
    });
  }
};

export const fetchRegionBreakdown = async (req, res) => {
  try {
    const retentionRates = await getRegionBreakdown();
    res.status(200).json({
      status: "success",
      data: retentionRates,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to fetch retention rates",
      error: error.message,
    });
  }
};

export const fetchProductBreakdown = async (req, res) => {
  try {
    const retentionRates = await getProductTitleBreakdown();
    res.status(200).json({
      status: "success",
      data: retentionRates,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to fetch retention rates",
      error: error.message,
    });
  }
};

export const fetchAovBreakdown = async (req, res) => {
  try {
    const retentionRates = await getAovBreakdown();
    res.status(200).json({
      status: "success",
      data: retentionRates,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to fetch retention rates",
      error: error.message,
    });
  }
};

export const fetchLTV = async (req, res) => {
  try {
    const { userShopId } = req;
    const filter = parseInt(req.query.filter) || 360;
    const LTVData = await calculateLTV(filter, userShopId);
    res.status(200).json(LTVData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// LTV Comparison
export const fetchLTVCompare = async (req, res) => {
  try {
    const { userShopId } = req;
    const filter = parseInt(req.query.filter) || 360;
    const currentLTV = await calculateLTV(filter, userShopId);
    const previousLTV = await calculateLTV(filter * 2, userShopId);

    const comparisonData = currentLTV.map((item, index) => ({
      category: item.category,
      previousPrice: previousLTV[index]?.price || 0,
      price: item.price,
    }));

    res.status(200).json(comparisonData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getRepeatPurchaseRate = async (req, res) => {
  try {
    const { userShopId } = req;
    const filter = parseInt(req.query.filter);
    if (isNaN(filter) || filter <= 0) {
      return res.status(400).json({
        error:
          "Invalid filter specified. It should be a positive integer representing days.",
      });
    }

    const repeatPurchaseData = await calculateRepeatPurchaseRate(
      filter,
      userShopId
    );
    res.status(200).json(repeatPurchaseData);
  } catch (error) {
    console.error("Error fetching repeat purchase rate:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getRepeatPurchaseRateCompare = async (req, res) => {
  try {
    const { userShopId } = req;
    const filter = parseInt(req.query.filter);
    if (isNaN(filter) || filter <= 0) {
      return res.status(400).json({
        error:
          "Invalid filter specified. It should be a positive integer representing days.",
      });
    }

    const repeatPurchaseDataCompare = await calculateRepeatPurchaseRateCompare(
      filter,
      userShopId
    );
    res.status(200).json(repeatPurchaseDataCompare);
  } catch (error) {
    console.error("Error fetching repeat purchase rate compare:", error);
    res.status(500).json({ error: error.message });
  }
};

export const fetchTimeBetweenOrders = async (req, res) => {
  try {
    const { userShopId } = req;
    const filter = parseInt(req.query.filter) || 60;
    const timeBetweenOrdersData = await calculateTimeBetweenOrders(
      filter,
      userShopId
    );
    res.status(200).json(timeBetweenOrdersData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const fetchTimeBetweenOrdersCompare = async (req, res) => {
  try {
    const { userShopId } = req;
    const filter = parseInt(req.query.filter) || 90;
    const currentTimeData = await calculateTimeBetweenOrders(
      filter,
      userShopId
    );
    const previousTimeData = await calculateTimeBetweenOrders(
      filter * 2,
      userShopId
    );

    const comparisonData = currentTimeData.map((item, index) => ({
      label: item.label,
      currentMedian: item.median,
      previousMedian: previousTimeData[index]?.median || 0,
      currentMean: item.mean,
      previousMean: previousTimeData[index]?.mean || 0,
    }));

    res.status(200).json(comparisonData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const fetchAveragePerOrder = async (req, res) => {
  try {
    const { userShopId } = req;
    const filter = parseInt(req.query.filter) || 60;
    const averagePerOrderData = await calculateAveragePerOrder(
      filter,
      userShopId
    );
    res.status(200).json(averagePerOrderData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const fetchAveragePerOrderCompare = async (req, res) => {
  try {
    const { userShopId } = req;
    const filter = parseInt(req.query.filter) || 60;
    const currentAverageData = await calculateAveragePerOrder(
      filter,
      userShopId
    );
    const previousAverageData = await calculateAveragePerOrder(
      filter * 2,
      userShopId
    );

    const comparisonData = currentAverageData.map((item, index) => ({
      label: item.label,
      order: item.order,
      average: item.average,
      previousOrder: previousAverageData[index]?.order || 0,
      previousAverage: previousAverageData[index]?.average || 0,
    }));

    res.status(200).json(comparisonData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getRetentionCurves = async (req, res) => {
  try {
    const { userShopId } = req;
    const { filter, breakdown, format, customStartDate, customEndDate } =
      req.query;

    if (!filter || !breakdown || !format) {
      return res.status(400).json({
        message: "filter, breakdown, and format are required query parameters.",
      });
    }

    const retentionData = await getRetentionCurveData({
      filter,
      breakdown,
      format,
      customStartDate,
      customEndDate,
      userShopId,
    });

    res.json(retentionData);
  } catch (error) {
    console.error("Error fetching retention curve:", error);
    res.status(500).json({ message: "Error fetching retention curve data." });
  }
};

export const retentionCompare = async (req, res) => {
  try {
    const { userShopId } = req;
    const { filter, breakdown, format, customStartDate, customEndDate } =
      req.query;

    if (!filter || !breakdown || !format) {
      return res.status(400).json({
        error: "Missing required query parameters: filter, breakdown, format",
      });
    }

    const data = await getRetentionCurveCompareData({
      filter,
      breakdown,
      format,
      customStartDate,
      customEndDate,
      userShopId,
    });
    res.json(data);
  } catch (error) {
    console.error("Error fetching retention curve compare data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getFollowUpPurchases = async (req, res) => {
  try {
    const { filter, order, timelineFilter } = req.query;
    const { userShopId } = req;

    // تحقق من المعاملات المطلوبة
    const validFilters = ["products", "variants", "categories"];
    const validOrders = ["second_order", "third_order", "fourth_order"];
    const validTimelineFilters = ["lastMonth", "3months", "6months"];

    if (!filter || !validFilters.includes(filter)) {
      return res.status(400).json({
        error: `Invalid or missing 'filter'. Must be one of: ${validFilters.join(
          ", "
        )}`,
      });
    }

    if (!order || !validOrders.includes(order)) {
      return res.status(400).json({
        error: `Invalid or missing 'order'. Must be one of: ${validOrders.join(
          ", "
        )}`,
      });
    }

    if (!timelineFilter || !validTimelineFilters.includes(timelineFilter)) {
      return res.status(400).json({
        error: `Invalid or missing 'timelineFilter'. Must be one of: ${validTimelineFilters.join(
          ", "
        )}`,
      });
    }

    const followUpData = await calculateFollowUpPurchases(
      filter,
      order,
      timelineFilter,
      userShopId
    );
    res.status(200).json(followUpData);
  } catch (error) {
    console.error("Error fetching follow-up purchases:", error);
    res.status(500).json({ error: error.message });
  }
};
