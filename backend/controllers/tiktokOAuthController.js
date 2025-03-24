// File: controllers/tiktokOAuthController.js
import TikTokOAuthService from '../services/tiktokOAuthService.js';

class TikTokOAuthController {
  async redirectToTikTok(req, res) {
    const url = TikTokOAuthService.getAuthorizationUrl();
    res.redirect(url);
  }

  async handleCallback(req, res) {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.status(400).json({ message: 'Missing required query parameters.' });
    }

    try {
      const tokenData = await TikTokOAuthService.exchangeCodeForToken(code);
      // TODO: Save tokenData.access_token and tokenData.advertiser_id in the database
      res.status(200).json({ message: 'OAuth completed successfully!', tokenData });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

export default new TikTokOAuthController();
