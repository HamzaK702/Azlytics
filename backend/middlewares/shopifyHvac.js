import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

export function validateWebhook(req, res, next) {
  const generatedHash = crypto
    .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
    .update(Buffer.from(req.rawbody))
    .digest('base64');

  if (generatedHash === req.headers['x-shopify-hmac-sha256']) {
    next(); // Continue if valid
  } else {
    res.sendStatus(403); // Forbidden if invalid
  }
}


export const verifySHA256 = (req, res, next) => {
  const query = { ...req.query }; // Make a copy of the query parameters

  console.log("Complete query parameters:", query);

  const hmac = query.hmac; // Extract the HMAC from the query
  delete query.hmac; // Remove the HMAC for verification

  if (!process.env.SHOPIFY_API_SECRET) {
    console.error("SHOPIFY_API_SECRET is undefined.");
    return res.status(500).json({ error: "SHOPIFY_API_SECRET is not set." });
  }

  if (!hmac) {
    console.error("HMAC parameter is missing from the request.");
    return res.status(400).json({ error: "HMAC parameter is required." });
  }

  // Generate the message string from query parameters
  const message = Object.keys(query)
    .sort() // Alphabetically sort the keys
    .map((key) => `${key}=${query[key]}`) // Convert to `key=value` format
    .join('&'); // Join with `&`

  // Generate the HMAC using the Shopify API secret
  const generatedHmac = crypto
    .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
    .update(message)
    .digest('hex');

  console.log("Generated HMAC:", generatedHmac);
  console.log("HMAC from Shopify:", hmac);

  // Compare the generated HMAC with the one from Shopify
  if (crypto.timingSafeEqual(Buffer.from(generatedHmac, 'utf-8'), Buffer.from(hmac, 'utf-8'))) {
    console.log("HMAC verification succeeded.");
    next(); // Proceed to the next middleware/controller
  } else {
    console.error("HMAC verification failed.");
    res.status(401).json({ error: "Unauthorized: Invalid HMAC." });
  }
};
