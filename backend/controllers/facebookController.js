import { getFacebookLoginUrl, getAccessToken, getAdAccounts } from '../services/facebookService.js';

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

        //store the access token adAccounts against the userId in a new table userAdAccounts
        
        //accessToken will go in a field called metaAccesstoken
        //adAccounts will go in an array schema called metaAdAccounts
        res.json({
            message: 'Facebook authentication successful',
            userId,
            accessToken,
            adAccounts
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
