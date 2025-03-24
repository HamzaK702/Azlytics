// googleAccessibleCustomers.js
import axios from 'axios';

export const listAccessibleCustomers = async (accessToken, userId) => {
  try {
    const response = await axios.get('https://googleads.googleapis.com/v17/customers:listAccessibleCustomers', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': process.env.GOOGLE_AD_MANAGER_TOKEN, // Ensure this is set in your environment variables
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching accessible customers for user ${userId}:`, error.response ? error.response.data : error.message);
    throw new Error('Failed to fetch accessible customers');
  }
};
