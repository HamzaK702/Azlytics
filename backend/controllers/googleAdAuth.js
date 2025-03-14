// googleAdAuthController.js

import dotenv from "dotenv";
import UserAdAccount from "../models/BulkTables/userAdAccountModel.js";
import { listAccessibleCustomers } from "../services/googleAccessibleCustomers.js";
import {
  getAuthUrl,
  getCustomerCampaignInsights,
  getToken,
} from "../services/googleAdAuthService.js";

dotenv.config();

export const getGoogleAuthUrl = (req, res) => {
  const userId = req.query.userId;
  const authUrl = getAuthUrl(userId);
  res.redirect(authUrl);
};

export const handleGoogleAuthCallback = (req, res) => {
  const code = req.query.code; // Extract authorization code from query parameters
  const state = req.query.state; // Extract state parameter which contains userId
  if (!code) {
    return res.status(400).send("No authorization code provided");
  }

  console.log(`Authorization code: ${code}`);

  getToken(code, async (err, token) => {
    if (err) {
      console.error("Error retrieving access token:", err);
      return res.status(500).send("Error retrieving access token");
    }
    console.log("Access token and other details:", token);
    const userId = decodeURIComponent(state);
    let refresh_token = token.refresh_token;

    // check if we get refresh token in api will update in db otherwise fetch it from DB
    if (refresh_token) {
      await UserAdAccount.findOneAndUpdate(
        { userId: userId }, // Corrected query object
        { googleAdRefreshToken: refresh_token }, // Updating the correct field
        { upsert: true, new: true } // Ensure update or insert
      );
    } else {
      const googleRefreshToken = await UserAdAccount.findOne({
        userId: userId,
      });
      refresh_token = googleRefreshToken?.googleAdRefreshToken;
    }

    let customers;
    try {
      customers = await listAccessibleCustomers(token.access_token, userId);
      //  storing insights of customers in DB
      customers?.resourceNames?.forEach((c) => {
        const customerId = c.replace("customers/", ""); // "customers/" remove

        getCustomerCampaignInsights(customerId, refresh_token, userId);
      });
    } catch (error) {
      res.status(500).json({
        error: "Error getting any Ad accounts with provided Google Account 2",
      });
    }

    try {
      const existingUser = await UserAdAccount.findOneAndUpdate(
        { userId },
        {
          userId,
          googleAdToken: token,
          createdAt: Date.now(),
        },
        { upsert: true, new: true } // upsert creates if not found, new returns the updated/created document
      );

      if (!existingUser) {
        res.status(500).json({ error: "Error storing token because of user" });
      }
    } catch (error) {
      console.error("Error storing token:", error);
      res.status(500).json({ error: "Error storing token" });
    }
    return res.redirect(`${process.env.FRONTEND_URL}/dashboard?googleAds=true`);
    // res.json({
    //   message: "Google authentication successful",
    //   userId,
    //   token,
    //   customers: customers || null,
    // });
  });
};
