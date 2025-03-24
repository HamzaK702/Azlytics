// googleAdAuthController.js

import { getAuthUrl, getToken } from '../services/googleAdAuthService.js';

export const getGoogleAuthUrl = (req, res) => {
  const userId = req.query.userId
  const authUrl = getAuthUrl(userId);
  res.redirect(authUrl);
};

export const handleGoogleAuthCallback = (req, res) => {
    const code = req.query.code; // Extract authorization code from query parameters
    const state = req.query.state; // Extract state parameter which contains userId
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
      const userId = decodeURIComponent(state);

      //store the  token  against the userId in a new table userAdAccounts
        
        //token will go in a field called googleAdToken
         
      res.json({
        message: 'Google authentication successful',
        userId,
        token
      });
    });
  };
