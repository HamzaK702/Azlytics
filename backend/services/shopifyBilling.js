// services/billingService.js
import axios from "axios";

export const createRecurringCharge = async (shop, accessToken, userShopId) => {
  const billingUrl = `https://${shop}/admin/api/2024-10/recurring_application_charges.json`;

  const returnUrl = `${process.env.FORWARDING_ADDRESS}/billing/confirm?userShopId=${userShopId}`;
  console.log("🔁 Billing setup initiated...");
  console.log("Shop:", shop);
  console.log("Access Token Present:", !!accessToken);
  console.log("UserShopId:", userShopId);
  console.log("Return URL:", returnUrl);

  const chargeData = {
    recurring_application_charge: {
      name: "Pro Plan",
      price: 10.0,
      return_url: returnUrl,
      test: true,
    },
  };

  const headers = {
    "X-Shopify-Access-Token": accessToken,
    "Content-Type": "application/json",
  };

  try {
    const response = await axios.post(billingUrl, chargeData, { headers });
    console.log("✅ Billing created. Redirecting to confirmation URL...");
    return response.data.recurring_application_charge.confirmation_url;
  } catch (error) {
    console.error("❌ Error creating recurring charge:");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    } else {
      console.error("Message:", error.message);
    }
    throw error; // rethrow so the calling function can handle it
  }
};
