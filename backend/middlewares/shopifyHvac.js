import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

export const verifySHA256 = (req, res, next) => {
  const query = req.query;

  console.log("Complete query parameters:", query);
  console.log("HMAC parameter from Shopify:", query.hmac);
  console.log("SHOPIFY_API_SECRET:", process.env.SHOPIFY_API_SECRET);

  if (!process.env.SHOPIFY_API_SECRET) {
    return res.status(500).json({ error: "SHOPIFY_API_SECRET is undefined." });
  }

  if (!query.hmac) {
    return res
      .status(400)
      .json({ error: "HMAC parameter is missing from the request." });
  }

  const parameters = [];
  for (const key in query) {
    if (key !== "hmac") {
      parameters.push(`${key}=${query[key]}`);
    }
  }

  const message = parameters.sort().join("");
  const digest = crypto
    .createHmac("sha256", process.env.SHOPIFY_API_SECRET)
    .update(message)
    .digest("hex");

  if (digest === query.hmac) {
    next(); // Proceed to the next middleware/controller
  } else {
    res.status(401).json({ error: "Unauthorized: Invalid HMAC" });
  }
};
