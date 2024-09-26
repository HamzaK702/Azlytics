// controllers/profitController.js

import profitService from '../services/profitService.js';
import profitabilityService from '../services/profitabilityService.js';
import grossProfitService from '../services/grossProfitService.js';

export const getGrossProfit = async (req, res) => {
  try {
    const { filter } = req.query;

    // Validate filter
    const validFilters = ['yesterday', '7d', '30d', '3m', '6m', '12m', 'one_month'];

    if (!validFilters.includes(filter)) {
      return res.status(400).json({ error: 'Invalid filter specified' });
    }

    const data = await grossProfitService.calculateGrossProfitData(filter);
    res.json(data);
  } catch (error) {
    console.error('Error in getGrossProfit:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProfitTrends = async (req, res) => {
  try {
    const { filter, format } = req.query;

    // Validate filter and format
    const validFilters = ['yesterday', '7d', '30d', '3m', '6m', '12m'];
    const validFormats = ['day', 'week', 'month'];

    if (!validFilters.includes(filter)) {
      return res.status(400).json({ error: 'Invalid filter specified' });
    }
    if (!validFormats.includes(format)) {
      return res.status(400).json({ error: 'Invalid format specified' });
    }
    
    const data = await profitabilityService.calculateProfitTrends(filter, format);
    res.json(data);
  } catch (error) {
    console.error('Error in getProfitTrends:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProfitData = async (req, res) => {
  try {
    const data = await profitService.calculateProfitData();
    res.json(data);
  } catch (error) {
    console.error('Error in getProfitData:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
