import dotenv from "dotenv";
import UserShop from "../models/userShopModel.js";
import { eventEmitter } from "../services/bulkOperationPipeline.js"; // Import event emitter
import { createRecurringCharge } from "../services/shopifyBilling.js"; // Import the billing service
import { ShopifyService } from "../services/ShopifyService.js";
dotenv.config();

export class ShopifyController {
  static async handleAuth(req, res) {
    const { shop, hmac, code, state } = req.query;
    const userId = state.split("-")[0]; //Arham1: state me ab userId nhi milay gi
    const stateCookie = req.cookies.state;

    if (shop && code) {
      try {
        const accessToken = await ShopifyService.getAccessToken(shop, code);
        console.log(shop, hmac, code);

        //Arham2: isko find and update k bjaye sirf create krdo orr isme humain ab userId nhi milay gi toh usko required se hata dena UserShopModel me jakr
        const result = await UserShop.create({
          shop,
          token: accessToken,
        });

        const userShopId = result._id; // Get the saved UserShop's ID

        eventEmitter.emit("shopAuthSuccess", { shop, accessToken, userShopId });
        console.log("We received a token: " + accessToken);

        // return res.redirect(
        //   `${process.env.FRONTEND_URL}/dashboard?shopify=true`
        // );

        //  ADD: Create billing charge
        const confirmationUrl = await createRecurringCharge(
          shop,
          accessToken,
          userShopId
        );

        //  Redirect user to Shopify billing confirmation page
        return res.redirect(confirmationUrl);
        // return res.redirect(
        //   `${process.env.FRONTEND_URL}/sign-up?shopify=true&userShopId=${userShopId}`
        // ); //Arham3: isko change krke login/signUp page krdo jisme query me shopify ture/false k sath userShop id bhi bhejo jisko tumne step 2 me save krwaya hai
      } catch (error) {
        console.error("Error getting Shopify access token:", error.message);
        return res.redirect(
          `${process.env.FRONTEND_URL}/sign-up?shopify=false`
        );
      }
    } else {
      return res.redirect(`${process.env.FRONTEND_URL}/sign-up?shopify=false`);
    }
  }

  static generateInstallUrl(shop, state) {
    const scopes = process.env.SCOPES;
    const redirectUri = `${process.env.FORWARDING_ADDRESS}/shopify/callback`;
    return `https://${shop}/admin/oauth/authorize?client_id=${process.env.SHOPIFY_API_KEY}&scope=${scopes}&state=${state}&redirect_uri=${redirectUri}`;
  }

  static nonce() {
    return Math.random().toString(36).substring(2, 15);
  }

  static async getShopData(req, res) {
    const { shop, token } = req.query;

    if (!shop || !token) {
      return res.status(400).send("Missing shop or token parameter.");
    }

    try {
      const shopData = await ShopifyService.getShopData(shop, token);
      res.status(200).json(shopData);
    } catch (error) {
      res.status(500).send("Error fetching shop data: " + error.message);
    }
  }

  static async getOrders(req, res) {
    const { shop, token } = req.query;

    if (!shop || !token) {
      return res.status(400).send("Missing shop or token parameter.");
    }

    try {
      const ordersData = await ShopifyService.getOrders(shop, token);
      res.status(200).json(ordersData.data);
    } catch (error) {
      res.status(500).send("Error fetching orders data: " + error.message);
    }
  }

  static async getProducts(req, res) {
    const { shop, token } = req.query;

    if (!shop || !token) {
      return res.status(400).send("Missing shop or token parameter.");
    }

    try {
      const productsData = await ShopifyService.getProducts(shop, token);
      res.status(200).json(productsData.data);
    } catch (error) {
      res.status(500).send("Error fetching products data: " + error.message);
    }
  }

  static async install(req, res) {
    const { shop, timestamp } = req.query;

    if (!shop || !timestamp) {
      return res.status(400).send("Missing required parameters.");
    }

    const timeDiff = Math.abs(Date.now() / 1000 - timestamp);
    if (timeDiff > 60 * 5) {
      // 5 minutes tolerance
      return res.status(400).send("Request timestamp is too old.");
    }

    const state = `${ShopifyController.nonce()}`;

    const installUrl = ShopifyController.generateInstallUrl(shop, state);

    return res.redirect(installUrl);
  }

  static async createBulkOperation(req, res) {
    const { shop, token, query } = req.body;

    if (!shop || !token || !query) {
      return res
        .status(400)
        .json({ error: "Missing required fields: shop, token, or query" });
    }

    try {
      const response = await ShopifyService.runBulkOperation(
        shop,
        token,
        query
      );
      if (response.errors) {
        return res.status(400).json({ errors: response.errors });
      }
      return res.status(200).json(response.data.bulkOperationRunQuery);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
}
