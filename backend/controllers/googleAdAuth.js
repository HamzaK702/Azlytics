// googleAdAuthController.js

import { getAuthUrl, getToken } from '../services/googleAdAuthService.js';

export const getGoogleAuthUrl = (req, res) => {
  const authUrl = getAuthUrl();
  res.redirect(authUrl);
};

export const handleGoogleAuthCallback = (req, res) => {
    const code = req.query.code; // Extract authorization code from query parameters
  
    if (!code) {
      return res.status(400).send('No authorization code provided');
    }
  
    console.log(`Authorization code: ${code}`);
  
    getToken(code, (err, token) => {
      if (err) {
        console.error('Error retrieving access token:', err);
        return res.status(500).send('Error retrieving access token');
      }
  
      console.log('Access token and other details:', token);
  
      // Optionally, you can store the token securely and use it for future API calls
      // For now, just send a success message
      res.send('Authorization successful! Check the console for the token details.');
    });
  };
