import dotenv from "dotenv";
import UserShop from "../models/userShopModel.js";
import User from "../models/userModel.js";
import { eventEmitter } from "../services/bulkOperationPipeline.js"; // Import event emitter
import { checkIfMerchantHasActivePlan } from "../services/shopifyBilling.js"; // Import the billing service
import { ShopifyService } from "../services/ShopifyService.js";
import bcrypt from "bcryptjs/dist/bcrypt.js";
import authService from "../services/authService.js";
dotenv.config();

export class ShopifyController {
    static async handleAuth(req, res) {
        const { shop, hmac, code, state } = req.query;
        const userId = state.split("-")[0]; //Arham1: state me ab userId nhi milay gi
        const stateCookie = req.cookies.state;

        if (!(shop && code)) {
            return res.redirect(
                `${process.env.FRONTEND_URL}/sign-up?shopify=false`
            );
        }

        try {
            const accessToken = await ShopifyService.getAccessToken(shop, code);
            console.log("We received a token: " + accessToken);
            console.log(shop, hmac, code);
            await new Promise((resolve) => setTimeout(resolve, 1000));

            //Arham2: isko find and update k bjaye sirf create krdo orr isme humain ab userId nhi milay gi toh usko required se hata dena UserShopModel me jakr

            const shopData = await ShopifyService.getShopData(
                shop,
                accessToken
            );

            const hashedPassword = await bcrypt.hash(accessToken, 5);

            let user = await User.findOneAndUpdate(
                { email: shopData.shop.email },
                {
                    name: shopData.shop.name,
                    email: shopData.shop.email,
                    shopifyConnected: true,
                    password: hashedPassword,
                },
                {
                    new: true, // 🔄 return the updated (or newly created) document
                    upsert: true, // insert if not found
                }
            );

            const result = await UserShop.findOneAndUpdate(
                {
                    userId: user._id,
                },
                {
                    shop,
                    token: accessToken,
                    shopData: shopData.shop,
                },
                {
                    new: true, // 🔄 return the updated (or newly created) document
                    upsert: true, // insert if not found
                }
            );

            const userShopId = result._id; // Get the saved UserShop's ID

            eventEmitter.emit("shopAuthSuccess", {
                shop,
                accessToken,
                userShopId,
            });

            // Check if this shop already has an active plan
            const isSubscribed = await checkIfMerchantHasActivePlan(
                shop,
                accessToken
            );

            let token = authService.getJwtToken(user);

            if (!isSubscribed) {
                console.log(
                    "⛔ No active plan, redirecting to Shopify managed pricing page..."
                );
                return res.redirect(
                    `https://admin.shopify.com/store/${shop.replace(
                        ".myshopify.com",
                        ""
                    )}/charges/${process.env.APP_HANDLE}/pricing_plans`
                );
            }
            return res.redirect(
                `${process.env.FRONTEND_URL}/login?token=${token}`
            );
        } catch (error) {
            console.log(error);
            console.error("Error getting Shopify access token:", error.message);
            return res.redirect(
                `${process.env.FRONTEND_URL}/sign-up?shopify=false`
            );
        }
    }

    static generateInstallUrl(shop, state) {
        const scopes = process.env.SCOPES;
        const redirectUri = `${process.env.APP_URL}/shopify/callback`;
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
            res.status(500).send(
                "Error fetching orders data: " + error.message
            );
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
            res.status(500).send(
                "Error fetching products data: " + error.message
            );
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
            return res.status(400).json({
                error: "Missing required fields: shop, token, or query",
            });
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
