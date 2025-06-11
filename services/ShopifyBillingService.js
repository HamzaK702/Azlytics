import { Shopify } from '@shopify/shopify-api';

Shopify.Context.initialize({
  API_KEY: process.env.SHOPIFY_API_KEY,
  API_SECRET_KEY: process.env.SHOPIFY_API_SECRET,
  SCOPES: ['read_orders', 'read_products', 'write_billing'],
  HOST_NAME: process.env.HOST.replace(/https?:\/\//, ''),
  API_VERSION: '2023-04', // Use the version you're targeting
  IS_EMBEDDED_APP: true,
  SESSION_STORAGE: new Shopify.Session.MemorySessionStorage(), // Replace with persistent storage if needed
});


export class ShopifyBillingService {
  static async ensureBilling(shop, session) {
    const billingSettings = {
      recurringName: 'Pro Plan',
      recurringChargeDetails: {
        amount: 19.99,
        currencyCode: 'USD',
        interval: 'EVERY_30_DAYS', // Billing cycle
      },
      trialDays: 7,
      isTest: process.env.NODE_ENV !== 'production', // Use test charges in non-production
    };

    try {
      const confirmationUrl = await Shopify.Billing.check({
        session,
        plans: [billingSettings],
      });

      return confirmationUrl;
    } catch (error) {
      console.error('Error in billing setup:', error);
      throw error;
    }
  }
}
