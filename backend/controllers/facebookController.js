import { getFacebookLoginUrl, getAccessToken, getAdAccounts } from '../services/facebookService.js';
import UserAdAccount from '../models/BulkTables/userAdAccountModel.js';

export const redirectToFacebook = (req, res) => {
    const userId = req.query.userId
    const loginUrl = getFacebookLoginUrl(userId);
    res.redirect(loginUrl);
};

export const handleFacebookCallback = async (req, res) => {
    const code = req.query.code;
    const state = req.query.state; 
    const userId = state.split('-')[0]; 
    try {
        const accessToken = await getAccessToken(code);
        const adAccounts = await getAdAccounts(accessToken);
        if(!accessToken || !adAccounts){
            console.log("Something wrong with accessToken or adAccounts")
        }
        try {
          const existingUserAdAccount = await UserAdAccount.findOne({ userId });

          if (existingUserAdAccount) {
            // Update the existing user ad account
            existingUserAdAccount.metaAccessToken = accessToken;
            existingUserAdAccount.metaAdAccounts = adAccounts.data ? adAccounts.data.map(account => ({
              accountId: account.account_id,
              accountName: account.id || '',
            })) : null;
          
            await existingUserAdAccount.save();
          } else {
            // Create a new user ad account
            const userAdAccount = new UserAdAccount({
              userId,
              metaAccessToken: accessToken,
              metaAdAccounts: adAccounts.data ? adAccounts.data.map(account => ({
                accountId: account.account_id,
                accountName: account.id || '',
              })) : null,
            });
          
            await userAdAccount.save();
          }
            
            res.json({
              message: 'Facebook authentication successful',
              userId,
              accessToken,
              adAccounts,
            });
          } catch (error) {
            console.error('Error storing Facebook token:', error);
            res.status(500).send('Error storing Facebook token');
          }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
