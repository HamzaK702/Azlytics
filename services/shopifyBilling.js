// services/billingService.js
import axios from "axios";

export const checkIfMerchantHasActivePlan = async (shop, accessToken) => {
  try {
    const response = await axios.get(
      `https://${shop}/admin/api/2024-10/recurring_application_charges.json`,
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      }
    );

    const activeCharges = response.data.recurring_application_charges.filter(
      (charge) => charge.status === "active"
    );

    return activeCharges.length > 0;
  } catch (error) {
    console.error(
      "Error checking active charge:",
      error.response?.data || error.message
    );
    return false;
  }
};
