// services/profitService.js

import Order from '../models/BulkTables/BulkOrder/order.js';
import Product from '../models/BulkTables/BulkProduct/product.js';
import OverheadCost from "../models/overheadCostModel.js";
import MetaAdInsights from '../models/metaAdInsightModel.js';
import moment from 'moment';

const calculateProfitData = async () => {
  // Implement calculations for each category using your existing functions
  const totalSales = await calculateTotalSales();
  const cogs = await calculateCOGS();
  const grossProfit = totalSales - cogs;
  const transaction = await calculateTotalFees();
  const shippingAndHandling = await calculateTotalShippingCost();
  const marketing = await calculateTotalAdSpend();
  const refunds = await calculateTotalRefunds();
  const overhead = await getOverheadCost();
  const taxes = await calculateTotalTaxes();

  const data = [
    {
      category: 'Total Sales',
      amount: totalSales,
      change: 12, // Placeholder for percentage change
    },
    {
      category: 'COGS',
      amount: cogs,
      change: 10, // Placeholder
    },
    {
      category: 'Gross Profit',
      amount: grossProfit,
      change: 10, // Placeholder
    },
    {
      category: 'Transaction',
      amount: transaction,
      change: 8, // Placeholder
    },
    {
      category: 'Shipping & Handling',
      amount: shippingAndHandling,
      change: 12, // Placeholder
      charge: 80000, // Placeholder
      difference: 10000, // Placeholder
    },
    {
      category: 'Marketing',
      amount: marketing,
      change: 10, // Placeholder
    },
    {
      category: 'Refunds',
      amount: refunds,
      change: 11, // Placeholder
      details: 'Learn More', // Placeholder
    },
    {
      category: 'Overhead',
      amount: overhead,
      change: 10, // Placeholder
    },
    {
      category: 'Taxes',
      amount: taxes,
      change: 12, // Placeholder
    },
  ];

  return data;
};

// Function to calculate Gross Sales
const calculateGrossSales = async () => {
  try {
    const grossSales = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalGrossSales: {
            $sum: { $toDouble: '$subtotalPrice' },
          },
        },
      },
    ]);
    return grossSales[0]?.totalGrossSales || 0;
  } catch (error) {
    console.error('Error calculating Gross Sales:', error);
    throw error;
  }
};

// Function to calculate Total Refunds
const calculateTotalRefunds = async () => {
  try {
    const refunds = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalRefunded: {
            $sum: { $toDouble: '$totalRefunded' },
          },
        },
      },
    ]);
    return refunds[0]?.totalRefunded || 0;
  } catch (error) {
    console.error('Error calculating total refunds:', error);
    throw error;
  }
};

// Function to calculate Total Taxes
const calculateTotalTaxes = async () => {
  try {
    const taxes = await Order.aggregate([
      {
        $unwind: '$taxLines',
      },
      {
        $group: {
          _id: null,
          totalTaxes: {
            $sum: { $toDouble: '$taxLines.price' },
          },
        },
      },
    ]);
    return taxes[0]?.totalTaxes || 0;
  } catch (error) {
    console.error('Error calculating total taxes:', error);
    throw error;
  }
};

// Function to calculate Total Fees (Transaction Costs)
const calculateTotalFees = async () => {
  try {
    const fees = await Order.aggregate([
      {
        $unwind: '$transactions',
      },
      {
        $unwind: '$transactions.fees',
      },
      {
        $group: {
          _id: null,
          totalFees: {
            $sum: { $toDouble: '$transactions.fees.amount' },
          },
        },
      },
    ]);
    return fees[0]?.totalFees || 0;
  } catch (error) {
    console.error('Error calculating total fees:', error);
    throw error;
  }
};

// Function to calculate Total Shipping Cost
const calculateTotalShippingCost = async () => {
  try {
    const shippingCost = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalShippingCost: {
            $sum: {
              $toDouble: '$totalShippingPrice', // Adjust field name if necessary
            },
          },
        },
      },
    ]);
    return shippingCost[0]?.totalShippingCost || 0;
  } catch (error) {
    console.error('Error calculating total shipping cost:', error);
    throw error;
  }
};

// Function to calculate Total Ad Spend
const calculateTotalAdSpend = async () => {
  try {
    const result = await MetaAdInsights.aggregate([
      {
        $match: {
          insights: { $ne: [] },
        },
      },
      {
        $unwind: '$insights',
      },
      {
        $match: {
          'insights.spend': { $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          totalAdSpend: { $sum: { $toDouble: '$insights.spend' } },
        },
      },
    ]);

    return result[0]?.totalAdSpend || 0;
  } catch (error) {
    console.error('Error calculating total ad spend:', error);
    throw error;
  }
};

// Function to calculate Total Sales
const calculateTotalSales = async () => {
  try {
    // Fetch all necessary data
    const [grossSales, totalRefunds, totalTaxes, totalShippingCost, totalFees] =
      await Promise.all([
        calculateGrossSales(),
        calculateTotalRefunds(),
        calculateTotalTaxes(),
        calculateTotalShippingCost(),
        calculateTotalFees(),
      ]);

    // Duties are set to zero as per instructions

    // Calculate Total Sales
    const totalSales =
      grossSales +
      totalShippingCost +
      totalTaxes +
      totalFees -
      totalRefunds;
    return totalSales;
  } catch (error) {
    console.error('Error calculating total sales:', error);
    throw error;
  }
};

// Function to calculate COGS
const calculateCOGS = async () => {
  try {
    let totalCOGS = 0;

    // Fetch orders with line items
    const orders = await Order.find();

    for (const order of orders) {
      for (const lineItem of order.lineItems) {
        const variantId = lineItem.variant_id;
        const quantity = lineItem.quantity;

        // Fetch product variant to get cost_price
        const product = await Product.findOne({ 'variants.id': variantId });

        if (product) {
          const variant = product.variants.find((v) => v.id === variantId);
          const costPrice = parseFloat(variant.costPrice) || 0;
          totalCOGS += costPrice * quantity;
        }
      }
    }

    return totalCOGS;
  } catch (error) {
    console.error('Error calculating COGS:', error);
    throw error;
  }
};

// Function to get Overhead Cost
const getOverheadCost = async () => {
  try {
    // Replace with actual criteria for your overhead costs
    const overheadCostEntry = await OverheadCost.findOne({ /* criteria */ });

    if (overheadCostEntry) {
      return parseFloat(overheadCostEntry.overheadCost) || 0;
    } else {
      return 0; // Default value if no overhead cost is found
    }
  } catch (error) {
    console.error('Error getting overhead cost:', error);
    throw error;
  }
};

export default {
  calculateProfitData,
  calculateTotalSales,
  calculateCOGS,
  calculateTotalFees,
  calculateTotalShippingCost,
  calculateTotalAdSpend,
  calculateTotalRefunds,
  getOverheadCost,
  calculateTotalTaxes,
};
