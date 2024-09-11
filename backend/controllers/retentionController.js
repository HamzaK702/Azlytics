import { calculateAveragePerOrder, calculateRepeatRateByCity, calculateTimeBetweenOrders } from '../services/retentionService.js';
import { calculateRepeatRateBySKU } from '../services/retentionService.js';
import { calculateCustomerStickiness } from '../services/retentionService.js';
import { getRetentionCurve } from '../services/retentionService.js';
import { getCityBreakdown } from '../services/retentionService.js';
import { getRegionBreakdown } from '../services/retentionService.js';
import { getProductTitleBreakdown } from '../services/retentionService.js';
import { getAovBreakdown } from '../services/retentionService.js';
import { getRetentionChart } from '../services/retentionService.js';
import { calculateRepeatRateByProduct } from '../services/retentionService.js';
import { calculateLTV } from '../services/retentionService.js';
import { calculateRepeatPurchaseRate, calculateRepeatPurchaseRateCompare } from "../services/retentionService.js";

export const getRepeatRateByCity = async (req, res) => {
  try {
    const repeatRateByCity = await calculateRepeatRateByCity();
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

  export const getRepeatRateByProduct= async (req, res) => {
    try {
      const repeatRateData = await calculateRepeatRateByProduct();
  
      return res.status(200).json({
        success: true,
        data: repeatRateData,
      });
    } catch (error) {
      console.error('Error calculating repeat rate by product:', error);
      return res.status(500).json({
        success: false,
        message: 'An error occurred while calculating the repeat rate by product.',
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
      status: 'success',
      data: retentionRates,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch retention rates',
      error: error.message,
    });
  }
};

export const getRetentionChartData = async (req, res) => {
  try {
    const { period } = req.query; // Expect period as a query parameter
    const retentionData = await getRetentionChart(period);
    res.status(200).json({
      status: 'success',
      data: retentionData.data,
    });
  } catch (error) {
    console.error('Error fetching retention chart data:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch retention chart data',
      error: error.message,
    });
  }
};


export const fetchCityBreakdown = async (req, res) => {
  try {
    const retentionRates = await getCityBreakdown();
    res.status(200).json({
      status: 'success',
      data: retentionRates,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch retention rates',
      error: error.message,
    });
  }
};


export const fetchRegionBreakdown = async (req, res) => {
  try {
    const retentionRates = await getRegionBreakdown();
    res.status(200).json({
      status: 'success',
      data: retentionRates,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch retention rates',
      error: error.message,
    });
  }
};

export const fetchProductBreakdown = async (req, res) => {
  try {
    const retentionRates = await getProductTitleBreakdown();
    res.status(200).json({
      status: 'success',
      data: retentionRates,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch retention rates',
      error: error.message,
    });
  }
};

export const fetchAovBreakdown = async (req, res) => {
  try {
    const retentionRates = await getAovBreakdown();
    res.status(200).json({
      status: 'success',
      data: retentionRates,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch retention rates',
      error: error.message,
    });
  }
};

export const fetchLTV = async (req, res) => {
  try {
    const filter = parseInt(req.query.filter) || 360; // Default to 360 days
    const LTVData = await calculateLTV(filter);
    res.status(200).json(LTVData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// LTV Comparison
export const fetchLTVCompare = async (req, res) => {
  try {
    const filter = parseInt(req.query.filter) || 360; // Default to 360 days
    const currentLTV = await calculateLTV(filter);
    const previousLTV = await calculateLTV(filter * 2); // Compare with the previous period

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
    const filter = parseInt(req.query.filter) || 60; // Default to 60 days
    const repeatPurchaseData = await calculateRepeatPurchaseRate(filter);
    res.status(200).json(repeatPurchaseData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getRepeatPurchaseRateCompare = async (req, res) => {
  try {
    const filter = parseInt(req.query.filter) || 60; // Default to 60 days
    const repeatPurchaseDataCompare = await calculateRepeatPurchaseRateCompare(filter);
    res.status(200).json(repeatPurchaseDataCompare);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const fetchTimeBetweenOrders = async (req, res) => {
  try {
    const filter = parseInt(req.query.filter) || 60; // default to 60 days
    const timeBetweenOrdersData = await calculateTimeBetweenOrders(filter);
    res.status(200).json(timeBetweenOrdersData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const fetchTimeBetweenOrdersCompare = async (req, res) => {
  try {
    const filter = parseInt(req.query.filter) || 90; // default to 90 days
    const currentTimeData = await calculateTimeBetweenOrders(filter);
    const previousTimeData = await calculateTimeBetweenOrders(filter * 2); // previous period

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
    const filter = parseInt(req.query.filter) || 60; // default to 60 days
    const averagePerOrderData = await calculateAveragePerOrder(filter);
    res.status(200).json(averagePerOrderData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const fetchAveragePerOrderCompare = async (req, res) => {
  try {
    const filter = parseInt(req.query.filter) || 60; // default to 60 days
    const currentAverageData = await calculateAveragePerOrder(filter);
    const previousAverageData = await calculateAveragePerOrder(filter * 2); // previous period

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