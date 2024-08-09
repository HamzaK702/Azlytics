import { calculateRepeatRateByCity } from '../services/retentionService.js';
import { calculateRepeatRateBySKU } from '../services/retentionService.js';
import { calculateCustomerStickiness } from '../services/retentionService.js';
import { getRetentionCurve } from '../services/retentionService.js';
import { getCityBreakdown } from '../services/retentionService.js';
import { getRegionBreakdown } from '../services/retentionService.js';
import { getProductTitleBreakdown } from '../services/retentionService.js';
import { getAovBreakdown } from '../services/retentionService.js';

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

