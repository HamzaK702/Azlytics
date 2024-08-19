import { GoogleAdsApi } from 'google-ads-api';

// Initialize the Google Ads API client with your credentials
const client = new GoogleAdsApi({
  client_id: process.env.GOOGLE_CLIENT_ID,
  client_secret: process.env.GOOGLE_CLIENT_SECRET,
  developer_token: process.env.GOOGLE_AD_MANAGER_TOKEN,
});

// Function to list accessible customers
export const listAccessibleCustomers = async (refreshToken) => {
  try {
    // Create a customer instance using the refresh token to authenticate the user
    const customer = client.Customer({
        refresh_token: refreshToken, // Do not specify customer_id for listing accessible customers
      });

      console.log(customer);
    // Query to list accessible customers
    const response = await customer.query(
      'SELECT customer.resource_name FROM customer'
    );

    console.log(`Total results: ${response.totalResultsCount}`);

    // Return the customer resource names
    return response.results.map(customer => customer.resource_name);

  } catch (error) {
    console.error('Error listing accessible customers:', error);
    throw error;
  }
};



