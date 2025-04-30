// services/billingService.js
import axios from "axios";

export const createRecurringCharge = async (shop, accessToken, userShopId) => {
  const billingUrl = `https://${shop}/admin/api/2024-10/recurring_application_charges.json`;

  const chargeData = {
    recurring_application_charge: {
      name: "Pro Plan",
      price: 10.0,
      return_url: `${process.env.FORWARDING_ADDRESS}/billing/confirm?userShopId=${userShopId}`,
      test: true,
    },
  };

  const headers = {
    "X-Shopify-Access-Token": accessToken,
    "Content-Type": "application/json",
  };

  const response = await axios.post(billingUrl, chargeData, { headers });
  return response.data.recurring_application_charge.confirmation_url;
};
