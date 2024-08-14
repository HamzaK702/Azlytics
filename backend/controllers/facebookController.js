import { 
  getFacebookLoginUrl, 
  getAccessToken, 
  getAdAccounts, 
  getAdInsights,
  getDailyAdInsights,
  saveDailyInsights
} from '../services/facebookService.js';
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
          const adAccountsData = adAccounts.data?.map(account => ({
            accountId: account.account_id,
            accountName: account.id || '',
          })) || null;
          
          const updateData = {
            metaAccessToken: accessToken,
            metaAdAccounts: adAccountsData || null,
          };
          
          const userAdAccount = await UserAdAccount.findOneAndUpdate(
            { userId },
            updateData,
            { new: true, upsert: true, setDefaultsOnInsert: true }
          );
           
          for (const entry of adAccounts.data) {
            const last30DaysInsights = await getDailyAdInsights(entry.account_id, accessToken);
            if (last30DaysInsights) {
                await saveDailyInsights(userId, entry.account_id, last30DaysInsights);
            }
          }
          
           

            res.json({
              message: 'Facebook authentication successful',
              userId,
              accessToken,
              adAccounts,
              userAdAccount
            });
          } catch (error) {
            console.error('Error storing Facebook token:', error);
            res.status(500).send('Error storing Facebook token');
          }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
