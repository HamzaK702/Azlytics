// services/tiktokAdsService.js
import axios from 'axios';

class TikTokAdsService {
  constructor() {
    this.baseUrl = 'https://business-api.tiktok.com/open_api/v1.2/';
    this.accessToken = process.env.TIKTOK_ACCESS_TOKEN; // Secure your token in environment variables
  }

  async getAdAnalytics(adAccountId, fields, dateRange) {
    try {
      const response = await axios.post(`${this.baseUrl}report/integrated/get/`, {
        advertiser_id: adAccountId,
        metrics: fields,
        date_range: dateRange,
      }, {
        headers: {
          'Access-Token': this.accessToken,
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching analytics:', error.message);
      throw new Error('Failed to fetch TikTok Ads analytics.');
    }
  }
}

export default new TikTokAdsService();
