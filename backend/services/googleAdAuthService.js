import axios from "axios";
import { GoogleAdsApi } from "google-ads-api";
import { google } from "googleapis";
import GoogleAdInsight from "../models/googleAdInsightModel.js";

const OAuth2 = google.auth.OAuth2;

const oauth2Client = new OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.FORWARDING_ADDRESS}/google-auth/callback`
);

// google ads api sdk setup
const googleAdsClient = new GoogleAdsApi({
  client_id: process.env.GOOGLE_CLIENT_ID,
  client_secret: process.env.GOOGLE_CLIENT_SECRET,
  developer_token: process.env.GOOGLE_AD_MANAGER_TOKEN,
});

export const getAuthUrl = (userId) => {
  const state = encodeURIComponent(userId); // Encode userId for safety
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: "https://www.googleapis.com/auth/adwords",
    state: state, // Add userId in the state parameter
    // prompt: "consent", every time gives refresh token but ask for consent too
  });
};

export const getToken = (code, callback) => {
  oauth2Client.getToken(code, async (err, token) => {
    if (err) {
      console.error("Error retrieving access token:", err);
      return callback(err);
    }
    oauth2Client.setCredentials(token);
    // Fetch the Customer IDs

    // // Use the first customer ID for further actions
    // const customerId = customerIds[0];
    callback(null, token);
  });
};

const transformCampaignData = (userId, adAccountId, campaigns) => {
  return campaigns.map((c) => ({
    userId,
    adAccountId,
    date: c.segments.date, // API se aane wali date use karenge
    insights: [
      {
        campaign_name: c.campaign.name,
        impressions: c.metrics.impressions || 0,
        clicks: c.metrics.clicks || 0,
        spend: (c.metrics.cost_micros || 0) / 1000000, // Micros to currency
      },
    ],
  }));
};

export const getCustomerCampaignInsights = async (
  customerId,
  refresh_token,
  userId
) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const today = new Date();

    const fromDate = thirtyDaysAgo.toISOString().split("T")[0]; // "YYYY-MM-DD"
    const toDate = today.toISOString().split("T")[0]; // "YYYY-MM-DD"

    const customer = googleAdsClient.Customer({
      customer_id: customerId,
      login_customer_id: customerId, // if using MCC account
      refresh_token,
    });

    const campaigns = await customer.report({
      entity: "campaign",
      attributes: ["campaign.id", "campaign.name"],
      metrics: ["metrics.impressions", "metrics.clicks", "metrics.cost_micros"],
      segments: ["segments.date"],
      from_date: fromDate,
      to_date: toDate,
    });

    // Ad Spend Calculation
    campaigns.forEach((c) => {
      c.metrics.ad_spend = c.metrics.cost_micros / 1000000;
    });

    const formattedData = transformCampaignData(userId, customerId, campaigns);

    await GoogleAdInsight.insertMany(formattedData);
    return res.status(201).send({
      messgae: "Campaigns inserted successfullt",
    });
  } catch (error) {
    console.error("Error fetching campaigns:", error);
  }
};

//  NOT USED BY ANY FILE
export const getAdSpendAndInsights = async (token) => {
  try {
    oauth2Client.setCredentials(token);

    const today = new Date();
    const startDate = new Date(today.setDate(today.getDate() - 30));
    const formattedStartDate = startDate.toISOString().split("T")[0];
    const formattedEndDate = new Date().toISOString().split("T")[0];

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
          "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
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
    console.error("Error fetching ad spend and insights:", error);
    throw new Error("Failed to fetch ad spend and insights.");
  }
};

//  NOT USED BY ANY FILE
export const getCustomerIDs = async (token) => {
  try {
    const response = await axios.get(
      "https://googleads.googleapis.com/v9/customers:listAccessibleCustomers",
      {
        headers: {
          Authorization: `Bearer ya29.a0AcM612wt4-y4UZbUx90oE-kIAAqa8BOUAgGLB_3Z5UA3V-tivOPyX6zeSdG1FxkoETjjyuOy7pg5LiKzngaZktO7TP9NBBukhYJ__Z9tHtSS178wqmlV8m8UXmk3GDND950PiFQ9m-9XSvWF4ESFmeYJCgpoX4lQYsqaaCgYKAfkSARISFQHGX2Mi5sTg2sv0SJEVlGFfuvABpg0171`,
          "developer-token": process.env.GOOGLE_AD_MANAGER_TOKEN,
        },
      }
    );

    const customerIds = response.data.resourceNames.map((resourceName) => {
      return resourceName.split("/")[1]; // Extract the Customer ID from the resource name
    });

    return customerIds; // This will return an array of accessible customer IDs
  } catch (error) {
    console.error("Error retrieving customer IDs:", error);
    throw new Error("Failed to retrieve customer IDs.");
  }
};
