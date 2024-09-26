// services/grossProfitService.js

import Order from '../models/BulkTables/BulkOrder/order.js';
import Product from '../models/BulkTables/BulkProduct/product.js';
import OverheadCost from '../models/overheadCostModel.js';
import MetaAdInsights from '../models/metaAdInsightModel.js';
import moment from 'moment';

// Helper function to get date range
import { getDateRange } from './dateHelpers.js'; // Adjust the import path accordingly

const calculateGrossProfitData = async (filter) => {
  try {
    // Get the date range based on the filter
    const { startDate, endDate } = getDateRange(filter);

    // Calculate Total Sales, COGS, Gross Profit, and Net Profit for the date range
    const totalSales = await calculateTotalSales(startDate, endDate);
    const cogs = await calculateCOGS(startDate, endDate);
    const grossProfit = totalSales - cogs;

    // Other expenses
    const transactionFees = await calculateTotalFees(startDate, endDate);
    const shippingAndHandling = await calculateTotalShippingCost(startDate, endDate);
    const marketing = await calculateTotalAdSpend(startDate, endDate);
    const refunds = await calculateTotalRefunds(startDate, endDate);
    const overhead = await getOverheadCost(startDate, endDate);
    const taxes = await calculateTotalTaxes(startDate, endDate);

    // Calculate Net Profit
    const netProfit =
      grossProfit -
      (transactionFees + shippingAndHandling + marketing + refunds + overhead + taxes);

    // Calculate Gross Margin and Net Margin percentages
    const grossMarginPercentage = totalSales !== 0 ? (grossProfit / totalSales) * 100 : 0;
    const netMarginPercentage = totalSales !== 0 ? (netProfit / totalSales) * 100 : 0;

    // Fetch change percentages by comparing with the previous period
    const { previousGrossProfit, previousNetProfit } = await calculatePreviousPeriodData(filter);

    const grossProfitChange = calculatePercentageChange(grossProfit, previousGrossProfit);
    const netProfitChange = calculatePercentageChange(netProfit, previousNetProfit);

    const data = [
      {
        category: 'net profit',
        amount: Math.round(netProfit),
        change: `${netProfitChange.toFixed(2)}%`,
        grossMargin: `net margin ${netMarginPercentage.toFixed(2)}%`,
      },
      {
        category: 'gross profit',
        amount: Math.round(grossProfit),
        change: `${grossProfitChange.toFixed(2)}%`,
        grossMargin: `gross margin ${grossMarginPercentage.toFixed(2)}%`,
      },
    ];

    return data;
  } catch (error) {
    console.error('Error in calculateGrossProfitData:', error.message);
    throw error;
  }
};

// Helper function to calculate percentage change
const calculatePercentageChange = (current, previous) => {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
};

// Function to calculate data for the previous period
const calculatePreviousPeriodData = async (filter) => {
  const { startDate, endDate } = getDateRange(filter);
  const periodLength = endDate - startDate;
  const previousStartDate = new Date(startDate - periodLength);
  const previousEndDate = new Date(startDate - 1);

  // Calculate Gross Profit and Net Profit for the previous date range
  const totalSales = await calculateTotalSales(previousStartDate, previousEndDate);
  const cogs = await calculateCOGS(previousStartDate, previousEndDate);
  const previousGrossProfit = totalSales - cogs;

  // Other expenses
  const transactionFees = await calculateTotalFees(previousStartDate, previousEndDate);
  const shippingAndHandling = await calculateTotalShippingCost(previousStartDate, previousEndDate);
  const marketing = await calculateTotalAdSpend(previousStartDate, previousEndDate);
  const refunds = await calculateTotalRefunds(previousStartDate, previousEndDate);
  const overhead = await getOverheadCost(previousStartDate, previousEndDate);
  const taxes = await calculateTotalTaxes(previousStartDate, previousEndDate);

  // Calculate Net Profit
  const previousNetProfit =
    previousGrossProfit -
    (transactionFees + shippingAndHandling + marketing + refunds + overhead + taxes);

  return {
    previousGrossProfit,
    previousNetProfit,
  };
};

// Helper functions to calculate various metrics

// Function to calculate Total Sales
const calculateTotalSales = async (startDate, endDate) => {
  try {
    const totalSalesData = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalSales: {
            $sum: { $toDouble: '$totalPrice' },
          },
        },
      },
    ]);

    return totalSalesData[0]?.totalSales || 0;
  } catch (error) {
    console.error('Error calculating total sales:', error);
    throw error;
  }
};

// Function to calculate COGS
const calculateCOGS = async (startDate, endDate) => {
  try {
    const cogsData = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      { $unwind: '$lineItems' },
      {
        $lookup: {
          from: 'bulkproducts', // Adjust the collection name if necessary
          localField: 'lineItems.product.id',
          foreignField: 'id',
          as: 'productDetails',
        },
      },
      { $unwind: '$productDetails' },
      {
        $project: {
          costPrice: { $toDouble: '$productDetails.costPrice' },
          quantity: '$lineItems.quantity',
        },
      },
      {
        $group: {
          _id: null,
          totalCOGS: {
            $sum: { $multiply: ['$costPrice', '$quantity'] },
          },
        },
      },
    ]);

    return cogsData[0]?.totalCOGS || 0;
  } catch (error) {
    console.error('Error calculating COGS:', error);
    throw error;
  }
};

// Function to calculate Total Fees (Transaction Costs)
const calculateTotalFees = async (startDate, endDate) => {
  try {
    const feesData = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      { $unwind: '$transactions' },
      { $unwind: '$transactions.fees' },
      {
        $group: {
          _id: null,
          totalFees: {
            $sum: { $toDouble: '$transactions.fees.amount' },
          },
        },
      },
    ]);

    return feesData[0]?.totalFees || 0;
  } catch (error) {
    console.error('Error calculating total fees:', error);
    throw error;
  }
};

// Function to calculate Total Shipping Cost
const calculateTotalShippingCost = async (startDate, endDate) => {
  try {
    const shippingData = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalShippingCost: {
            $sum: { $toDouble: '$totalShippingPrice' },
          },
        },
      },
    ]);

    return shippingData[0]?.totalShippingCost || 0;
  } catch (error) {
    console.error('Error calculating total shipping cost:', error);
    throw error;
  }
};

// Function to calculate Total Ad Spend
const calculateTotalAdSpend = async (startDate, endDate) => {
  try {
    const startDateString = moment(startDate).format('YYYY-MM-DD');
    const endDateString = moment(endDate).format('YYYY-MM-DD');

    const adSpendData = await MetaAdInsights.aggregate([
      { $unwind: '$insights' },
      {
        $match: {
          date: { $gte: startDateString, $lte: endDateString },
        },
      },
      {
        $group: {
          _id: null,
          totalAdSpend: {
            $sum: { $toDouble: '$insights.spend' },
          },
        },
      },
    ]);

    return adSpendData[0]?.totalAdSpend || 0;
  } catch (error) {
    console.error('Error calculating total ad spend:', error);
    throw error;
  }
};

// Function to calculate Total Refunds
const calculateTotalRefunds = async (startDate, endDate) => {
  try {
    const refundsData = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalRefunds: {
            $sum: { $toDouble: '$totalRefunded' },
          },
        },
      },
    ]);

    return refundsData[0]?.totalRefunds || 0;
  } catch (error) {
    console.error('Error calculating total refunds:', error);
    throw error;
  }
};

// Function to get Overhead Cost
const getOverheadCost = async (startDate, endDate) => {
  try {
    const overheadData = await OverheadCost.aggregate([
      {
        $match: {
          year: { $gte: startDate.getFullYear(), $lte: endDate.getFullYear() },
          month: { $gte: startDate.getMonth() + 1, $lte: endDate.getMonth() + 1 },
        },
      },
      {
        $group: {
          _id: null,
          totalOverhead: {
            $sum: '$overheadCost',
          },
        },
      },
    ]);

    return overheadData[0]?.totalOverhead || 0;
  } catch (error) {
    console.error('Error getting overhead cost:', error);
    throw error;
  }
};

// Function to calculate Total Taxes
const calculateTotalTaxes = async (startDate, endDate) => {
  try {
    const taxesData = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      { $unwind: '$taxLines' },
      {
        $group: {
          _id: null,
          totalTaxes: {
            $sum: { $toDouble: '$taxLines.price' },
          },
        },
      },
    ]);

    return taxesData[0]?.totalTaxes || 0;
  } catch (error) {
    console.error('Error calculating total taxes:', error);
    throw error;
  }
};

export default {
  calculateGrossProfitData,
};
