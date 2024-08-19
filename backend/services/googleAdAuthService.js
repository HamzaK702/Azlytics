import { google } from 'googleapis';
import axios from 'axios';

const OAuth2 = google.auth.OAuth2;

const oauth2Client = new OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.FORWARDING_ADDRESS}/google-auth/callback`  
);

export const getAuthUrl = (userId) => {
  const state = encodeURIComponent(userId); // Encode userId for safety
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: 'https://www.googleapis.com/auth/adwords',
    state: state // Add userId in the state parameter
  });
};

export const getToken = (code, callback) => {
  oauth2Client.getToken(code, async (err, token) => {
    if (err) {
      console.error('Error retrieving access token:', err);
      return callback(err);
    }
    oauth2Client.setCredentials(token);
     // Fetch the Customer IDs
     

        // // Use the first customer ID for further actions
        // const customerId = customerIds[0];
    callback(null, token);
  });
};

export const getAdSpendAndInsights = async (token) => {
  try {
    oauth2Client.setCredentials(token);

    const today = new Date();
    const startDate = new Date(today.setDate(today.getDate() - 30));
    const formattedStartDate = startDate.toISOString().split('T')[0];
    const formattedEndDate = new Date().toISOString().split('T')[0];

    const response = await axios.post(
      `https://googleads.googleapis.com/v9/customers/7919001999/googleAds:searchStream`,
      {
        query: `
          SELECT
            campaign.name,
            segments.date,
            metrics.cost_micros,
            metrics.impressions,
            metrics.clicks
          FROM
            campaign
          WHERE
            segments.date BETWEEN '${formattedStartDate}' AND '${formattedEndDate}'
          ORDER BY
            segments.date DESC
        `,
      },
      {
        headers: {
          Authorization: `Bearer ${token.access_token}`,
          'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
        },
      }
    );

    const adInsights = response.data.map((result) => {
      return result.results.map((row) => ({
        campaignName: row.campaign.name,
        date: row.segments.date,
        cost: row.metrics.cost_micros / 1e6, // Convert micros to standard currency units
        impressions: row.metrics.impressions,
        clicks: row.metrics.clicks,
      }));
    });

    return adInsights.flat(); // Flatten the results array
  } catch (error) {
    console.error('Error fetching ad spend and insights:', error);
    throw new Error('Failed to fetch ad spend and insights.');
  }
};

export const getCustomerIDs = async (token) => {
  try {
    const response = await axios.get(
      'https://googleads.googleapis.com/v9/customers:listAccessibleCustomers',
      {
        headers: {
          Authorization: `Bearer ya29.a0AcM612wt4-y4UZbUx90oE-kIAAqa8BOUAgGLB_3Z5UA3V-tivOPyX6zeSdG1FxkoETjjyuOy7pg5LiKzngaZktO7TP9NBBukhYJ__Z9tHtSS178wqmlV8m8UXmk3GDND950PiFQ9m-9XSvWF4ESFmeYJCgpoX4lQYsqaaCgYKAfkSARISFQHGX2Mi5sTg2sv0SJEVlGFfuvABpg0171`,
          'developer-token': process.env.GOOGLE_AD_MANAGER_TOKEN,
        },
      }
    );

    const customerIds = response.data.resourceNames.map((resourceName) => {
      return resourceName.split('/')[1]; // Extract the Customer ID from the resource name
    });

    return customerIds; // This will return an array of accessible customer IDs
  } catch (error) {
    console.error('Error retrieving customer IDs:', error);
    throw new Error('Failed to retrieve customer IDs.');
  }
};