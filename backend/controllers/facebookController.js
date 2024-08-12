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
              return res.status(400).send('User Ad Account already exists. No updates allowed.');
            }
      
            const userAdAccount = new UserAdAccount({
              userId,
              metaAccessToken: accessToken,
              metaAdAccounts: adAccounts.map(account => ({
                accountId: account.id,
                accountName: account.name,
              })),
            });
            await userAdAccount.save();
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
