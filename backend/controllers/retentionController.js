import { calculateRepeatRateByCity } from '../services/retentionService.js';
import { calculateRepeatRateBySKU } from '../services/retentionService.js';
import { calculateCustomerStickiness } from '../services/retentionService.js';

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