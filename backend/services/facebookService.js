
import axios from 'axios';
import crypto from 'crypto';
import moment from 'moment';
import metaAdInsight  from '../models/metaAdInsightModel.js';

export const getFacebookLoginUrl = (userId) => {
    const clientId = '479080541428156';
    const redirectUri = 'http://localhost:3001/api/facebook-success';
    const state = `${userId}-${crypto.randomBytes(8).toString('hex')}`;
    const scope = 'ads_read,ads_management,read_insights';
    return `https://www.facebook.com/v12.0/dialog/oauth?client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&scope=${scope}`;
};

export const getAccessToken = async (code) => {
    const clientId = '479080541428156';
    const clientSecret = '97519d66167c3b3068c5b27d28722b45';
    const redirectUri = 'http://localhost:3001/api/facebook-success';
    const url = `https://graph.facebook.com/v12.0/oauth/access_token?client_id=${clientId}&redirect_uri=${redirectUri}&client_secret=${clientSecret}&code=${code}`;
    const response = await axios.get(url);
    const token = response.data.access_token;
    console.log(token);
return token
};

export const getAdAccounts = async (accessToken) => {
    const url = 'https://graph.facebook.com/v12.0/me/adaccounts';
    const response = await axios.get(url, {
        params: {
            access_token: accessToken,
            fields: 'account_id,account_name'
        }
    });
    return response.data;
};

export const getAdInsights = async (adAccountId, accessToken) => {
    const url = `https://graph.facebook.com/v12.0/act_${adAccountId}/insights`;
    const response = await axios.get(url, {
        params: {
            access_token: accessToken,
            fields: 'campaign_name,impressions,clicks,spend'
        }
    });
    return response.data;
};


export const getDailyAdInsights = async (adAccountId, accessToken) => {
    const insights = [];
    const today = moment().startOf('day');
    const last30Days = Array.from({ length: 30 }, (_, i) => today.clone().subtract(i, 'days').format('YYYY-MM-DD'));

    for (const date of last30Days) {
        const url = `https://graph.facebook.com/v12.0/act_${adAccountId}/insights`;
        const response = await axios.get(url, {
            params: {
                access_token: accessToken,
                fields: 'campaign_name, impressions,clicks, spend',
                time_range: {
                    since: date,
                    until: date
                }
            }
        });
        insights.push({ date, data: response.data.data });
    }

    return insights;
};



export const saveDailyInsights = async (userId, adAccountId, insightsData) => {
  for (const entry of insightsData) {
    console.log(entry)
    await metaAdInsight.findOneAndUpdate(
      { userId, adAccountId, date: entry.date },
      {
        userId,
        adAccountId,
        date: entry.date,
        insights: entry.data,
        createdAt: new Date(entry.date)
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
};
