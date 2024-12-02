import express from "express";
import { ShopifyController } from "../controllers/ShopifyController.js";

const router = express.Router();
//http://localhost:3001/api/shopify?shop=dumbclient.myshopify.com&userId=66bb684d7c41ca028cbeb0ab
router.get("/shopify", (req, res) => {
  const shop = req.query.shop;
  const userId = req.query.userId;
  if (shop) {
    const state = `${userId}-${ShopifyController.nonce()}`;
    const installUrl = ShopifyController.generateInstallUrl(shop, state);
    console.log(state);
    console.log(installUrl);
    res.cookie("state", state);
    res.redirect(installUrl);
  } else {
    res
      .status(400)
      .send(
        "Missing shop parameter. Please add ?shop=your-development-shop.myshopify.com to your request"
      );
  }
});

router.post("/install", (req, res) => {
  const { host, shop, timestamp } = req.body;
  const { hmac } = req.query;
  res
    .status(200)
    .send(
      `Queries and Body Recived hmac=${hmac}, host=${host},shop=${shop} and timestamp=${timestamp}`
    );
});

router.get("/shopify/callback", ShopifyController.handleAuth); //we got the token for dumb client store: shpua_9dd90273c982021d4c9bed11b7bc6e6c
// new updated token with customer fields --> shpua_9dd90273c982021d4c9bed11b7bc6e6c
router.get("/shopdata", ShopifyController.getShopData);

router.get("/shopify/orders", ShopifyController.getOrders);
router.get("/shopify/products", ShopifyController.getProducts);

router.post("/bulk-operation", ShopifyController.createBulkOperation);

export default router;
