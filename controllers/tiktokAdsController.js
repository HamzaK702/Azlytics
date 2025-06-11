// File: controllers/tiktokAdsController.js
import TikTokAdsService from '../services/tiktokAdsService.js';

class TikTokAdsController {
  async getAdAnalytics(req, res) {
    const { adAccountId, fields, startDate, endDate } = req.query;

    // Validate input
    if (!adAccountId || !fields || !startDate || !endDate) {
      return res.status(400).json({ message: 'Missing required query parameters.' });
    }

    const dateRange = { start_date: startDate, end_date: endDate };
    const metrics = fields.split(','); // Comma-separated metrics

    try {
      const data = await TikTokAdsService.getAdAnalytics(adAccountId, metrics, dateRange);
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
}

export default new TikTokAdsController();
