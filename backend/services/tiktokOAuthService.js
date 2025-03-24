// File: services/tiktokOAuthService.js
import axios from 'axios';

class TikTokOAuthService {
  constructor() {
    this.authBaseUrl = 'https://ads.tiktok.com/marketing_api/';
    this.clientId = process.env.TIKTOK_CLIENT_ID;
    this.clientSecret = process.env.TIKTOK_CLIENT_SECRET;
    this.redirectUri = process.env.TIKTOK_REDIRECT_URI;
  }

  getAuthorizationUrl() {
    return `${this.authBaseUrl}auth?app_id=${this.clientId}&redirect_uri=${encodeURIComponent(
      this.redirectUri
    )}&state=randomState123&scope=ads.read,ads.management`;
  }

  async exchangeCodeForToken(code) {
    try {
      const response = await axios.post(
        `${this.authBaseUrl}oauth2/access_token/`,
        {
          app_id: this.clientId,
          secret: this.clientSecret,
          code,
          grant_type: 'authorization_code',
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error exchanging code for token:', error.message);
      throw new Error('Failed to exchange code for token.');
    }
  }
}

export default new TikTokOAuthService();
