import { calculateRepeatRateByCity } from '../services/retentionService.js';
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
    const LTV = await calculateLTV();
    res.status(200).json({ LTV });
} catch (error) {
    res.status(500).json({ error: error.message });
}
};

