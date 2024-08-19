// googleAdAuthController.js

import { getAuthUrl, getToken } from '../services/googleAdAuthService.js';
import UserAdAccount from '../models/BulkTables/userAdAccountModel.js';
import { listAccessibleCustomers } from '../services/googleAccessibleCustomers.js'; 

export const getGoogleAuthUrl = (req, res) => {
  const userId = req.query.userId
  const authUrl = getAuthUrl(userId);
  res.redirect(authUrl);
};

export const handleGoogleAuthCallback =  (req, res) => {
    const code = req.query.code; // Extract authorization code from query parameters
    const state = req.query.state; // Extract state parameter which contains userId
    if (!code) {
      return res.status(400).send('No authorization code provided');
    }
  
    console.log(`Authorization code: ${code}`);
  
    getToken(code, async (err, token) => {
      if (err) {
        console.error('Error retrieving access token:', err);
        return res.status(500).send('Error retrieving access token');
      }
  
      console.log('Access token and other details:', token);
      const userId = decodeURIComponent(state);
      const refreshToken = token.refresh_token; 

      //TODO: WE NEED TO MODIFY THE FUNCTION BELOW TO INSTEAD HIT THE API URL https://googleads.googleapis.com/v17/customers:listAccessibleCustomers
      //HEADERS AUTHORIZATION BEARER {ACCESS TOKEN}, DEVELOPER-TOKEN {AD MANAGER TOKEN IN ENV}
      // await listAccessibleCustomers(refreshToken)
      //     .then(customers => console.log('Accessible Customers:', customers))
      //     .catch(error => console.error('Error:', error));

      try{
        const existingUser = await UserAdAccount.findOne({ userId});
        if (existingUser) {
          return res.status(400).json({
            message: 'Google Ad Token already exists for this user.',
          });
        }
        const newUserAdAccount = new UserAdAccount({
          userId,
          googleAdToken: token,
          createdAt: Date.now(),
        });
        await newUserAdAccount.save();

        
        res.json({
          message: 'Google authentication successful',
          userId,
          token,
        });
      }
      catch (error) {
      console.error('Error storing token:', error);
      res.status(500).json({ error: 'Error storing token' });

      }
         
      res.json({
        message: 'Google authentication successful',
        userId,
        token
      });
    });
  };
