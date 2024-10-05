// services/grossProfitService.js

import Order from '../models/BulkTables/BulkOrder/order.js';
import Product from '../models/BulkTables/BulkProduct/product.js';
import OverheadCost from '../models/overheadCostModel.js';
import MetaAdInsights from '../models/metaAdInsightModel.js';
import moment from 'moment';
import { subMonths, format, addMonths,subDays } from 'date-fns';
import { getDateRange } from './dateHelpers.js'; 
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

export const calculatePerformanceMetrics = async (timeFormat) => {
  const now = new Date();
  const startDate = subMonths(now, 12);

  const ordersAggregation = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: now },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        revenue: { $sum: { $toDouble: "$totalPrice" } },
        totalCost: { $sum: { $toDouble: "$totalCost" } },
        orderCount: { $sum: 1 },
        unitsSold: { $sum: { $sum: "$lineItems.quantity" } },
      },
    },
    {
      $sort: { "_id.year": 1, "_id.month": 1 },
    },
  ]);

  const adsAggregation = await MetaAdInsights.aggregate([
    {
      $match: {
        date: {
          $gte: format(startDate, 'yyyy-MM'),
          $lte: format(now, 'yyyy-MM'),
        },
      },
    },
    { $unwind: "$insights" },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        totalAdsSpend: { $sum: "$insights.spend" },
      },
    },
    {
      $sort: { "_id.year": 1, "_id.month": 1 },
    },
  ]);

  const overheadAggregation = await OverheadCost.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: now },
      },
    },
    {
      $group: {
        _id: {
          year: "$year",
          month: "$month",
        },
        overheadCost: { $sum: "$overheadCost" },
      },
    },
    {
      $sort: { "_id.year": 1, "_id.month": 1 },
    },
  ]);

  const performanceMap = {};

  ordersAggregation.forEach((order) => {
    const { year, month } = order._id;
    const key = `${year}-${month}`;
    performanceMap[key] = {
      year,
      month,
      revenue: order.revenue,
      totalCost: order.totalCost,
      orderCount: order.orderCount,
      unitsSold: order.unitsSold,
      grossProfit: order.revenue - order.totalCost,
    };
  });

  adsAggregation.forEach((ad) => {
    const { year, month } = ad._id;
    const key = `${year}-${month}`;
    if (performanceMap[key]) {
      performanceMap[key].totalAdsSpend = ad.totalAdsSpend;
    } else {
      performanceMap[key] = {
        year,
        month,
        totalAdsSpend: ad.totalAdsSpend,
      };
    }
  });

  overheadAggregation.forEach((overhead) => {
    const { year, month } = overhead._id;
    const key = `${year}-${month}`;
    if (performanceMap[key]) {
      performanceMap[key].overheadCost = overhead.overheadCost;
    } else {
      performanceMap[key] = {
        year,
        month,
        overheadCost: overhead.overheadCost,
      };
    }
  });

  const performanceData = Object.keys(performanceMap).map((key) => {
    const data = performanceMap[key];
    
    const date = timeFormat === 'month' 
      ? format(new Date(data.year, data.month - 1), 'MMM yyyy') 
      : format(new Date(data.year, 0), 'yyyy'); 

    const grossProfit = data.grossProfit || 0;
    const totalAdsSpend = data.totalAdsSpend || 0;
    const overheadCost = data.overheadCost || 0;
    const netProfit = grossProfit - totalAdsSpend - overheadCost;
    const netProfitMargin = data.revenue ? (netProfit / data.revenue) * 100 : 0;
    const grossProfitMargin = data.revenue ? (grossProfit / data.revenue) * 100 : 0;

    return {
      date,
      grossProfit: parseFloat(grossProfit.toFixed(2)),
      netMargin: parseFloat((netProfit + overheadCost).toFixed(2)), 
      previousProfit: 0, 
      revenue: parseFloat(data.revenue.toFixed(2)),
      totalAdsSpend: parseFloat(totalAdsSpend.toFixed(2)),
      netProfit: parseFloat(netProfit.toFixed(2)),
      netProfitMargin: parseFloat(netProfitMargin.toFixed(2)),
      orderCount: data.orderCount || 0,
      totalCost: parseFloat((data.totalCost + overheadCost).toFixed(2)),
      grossProfitMargin: parseFloat(grossProfitMargin.toFixed(2)),
      unitsSold: data.unitsSold || 0,
    };
  });

  performanceData.sort((a, b) => new Date(a.date) - new Date(b.date));

  for (let i = 0; i < performanceData.length; i++) {
    if (i === 0) {
      performanceData[i].previousProfit = 0;
    } else {
      performanceData[i].previousProfit = performanceData[i - 1].grossProfit;
    }
  }

  return performanceData;
};

const getDateRangeTable = (filter, customStartDate, customEndDate) => {
  const now = new Date();
  let startDate;
  let endDate;

  switch (filter) {
    case "3m": 
      startDate = subMonths(now, 2);
      startDate.setDate(1);
      endDate = now;
      break;
    case "yesterday":
      startDate = subDays(now, 1);
      endDate = startDate;
      break;
    case "7d":  
      endDate = subDays(now, 1);
      startDate = subDays(endDate, 7);
      break;
    case "30d":  
      endDate = subDays(now, 1);
      startDate = subMonths(endDate, 1);
      break;
    case "6m": 
      startDate = subMonths(now, 6);
      endDate = now;
      break;
    case "12m":  
      startDate = new Date(now.setFullYear(now.getFullYear() - 1));
      endDate = new Date();
      break;
    case "custom_date_range":
      if (!customStartDate || !customEndDate) {
        throw new Error("Custom start and end dates are required for custom_date_range filter");
      }
      startDate = new Date(customStartDate);
      endDate = new Date(customEndDate);
      break;
    default:
      throw new Error("Invalid filter specified");
  }

  return { startDate, endDate };
};

export const getProfitTableService = async (filter, customStartDate, customEndDate) => {
  const { startDate, endDate } = getDateRangeTable(filter, customStartDate, customEndDate);

  const formattedStartDate = format(startDate, 'yyyy-MM');
  const formattedEndDate = format(endDate, 'yyyy-MM');

  const salesAndCosts = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        totalSales: { $sum: { $toDouble: "$totalPrice" } },
        costOfGoodsSold: { $sum: { $toDouble: "$totalCost" } },
        totalRefunds: { $sum: { $toDouble: "$totalRefunded" } },
      },
    },
    {
      $sort: { "_id.year": 1, "_id.month": 1 },
    },
  ]);

  const marketing = await MetaAdInsights.aggregate([
    {
      $match: {
        date: {
          $gte: formattedStartDate,
          $lte: formattedEndDate,
        },
      },
    },
    { $unwind: "$insights" },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        marketingSpend: { $sum: "$insights.spend" },
      },
    },
    {
      $sort: { "_id.year": 1, "_id.month": 1 },
    },
  ]);


  const shippingHandling = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        shippingHandlingCost: { $sum: { $toDouble: "$shippingCost" } }, 
      },
    },
    {
      $sort: { "_id.year": 1, "_id.month": 1 },
    },
  ]);


  const transactionCosts = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        transactionCost: { $sum: { $toDouble: "$transactionFee" } }, 
      },
    },
    {
      $sort: { "_id.year": 1, "_id.month": 1 },
    },
  ]);


  const taxes = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        taxes: { $sum: { $toDouble: "$taxes" } }, 
      },
    },
    {
      $sort: { "_id.year": 1, "_id.month": 1 },
    },
  ]);

  const overhead = await OverheadCost.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        overheadCost: { $sum: "$overheadCost" },
      },
    },
    {
      $sort: { "_id.year": 1, "_id.month": 1 },
    },
  ]);

  const dataMap = {};

  const generateKey = (year, month) => `${year}-${month}`;

  // Populate sales and costs
  salesAndCosts.forEach(item => {
    const { year, month } = item._id;
    const key = generateKey(year, month);
    if (!dataMap[key]) dataMap[key] = {};
    dataMap[key].totalSales = item.totalSales;
    dataMap[key].costOfGoodsSold = item.costOfGoodsSold;
    dataMap[key].totalRefunds = item.totalRefunds;
  });

  // Populate marketing spend
  marketing.forEach(item => {
    const { year, month } = item._id;
    const key = generateKey(year, month);
    if (!dataMap[key]) dataMap[key] = {};
    dataMap[key].marketingSpend = item.marketingSpend;
  });

  // Populate shipping & handling
  shippingHandling.forEach(item => {
    const { year, month } = item._id;
    const key = generateKey(year, month);
    if (!dataMap[key]) dataMap[key] = {};
    dataMap[key].shippingHandlingCost = item.shippingHandlingCost;
  });

  // Populate transaction costs
  transactionCosts.forEach(item => {
    const { year, month } = item._id;
    const key = generateKey(year, month);
    if (!dataMap[key]) dataMap[key] = {};
    dataMap[key].transactionCost = item.transactionCost;
  });

  // Populate taxes
  taxes.forEach(item => {
    const { year, month } = item._id;
    const key = generateKey(year, month);
    if (!dataMap[key]) dataMap[key] = {};
    dataMap[key].taxes = item.taxes;
  });

  // Populate overhead costs
  overhead.forEach(item => {
    const { year, month } = item._id;
    const key = generateKey(year, month);
    if (!dataMap[key]) dataMap[key] = {};
    dataMap[key].overheadCost = item.overheadCost;
  });

  // Generate a list of months within the range
  const monthsList = [];
  const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const last = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  while (current <= last) {
    const monthName = format(current, 'MMM').toLowerCase(); // e.g., 'jan', 'feb'
    const key = `${current.getFullYear()}-${current.getMonth() + 1}`;
    monthsList.push({ key, month: monthName });
    current.setMonth(current.getMonth() + 1);
  }

  // Initialize the response structure
  const response = [
    { category: "Total Sales" },
    { category: "Costs of Goods Sold" },
    { category: "%" },
    { category: "Marketing" },
    { category: "%" },
    { category: "Shipping & Handling" },
    { category: "%" },
    { category: "Transaction" },
    { category: "%" },
    { category: "Refunds" },
    { category: "%" },
    { category: "Taxes" },
    { category: "%" },
    { category: "Overhead" },
    { category: "Net Profit" },
  ];

  // Populate the response with monthly data
  monthsList.forEach(({ key, month }) => {
    const data = dataMap[key] || {};

    // Calculate Net Profit
    const netProfit =
      (data.totalSales || 0) -
      (data.costOfGoodsSold || 0) -
      (data.marketingSpend || 0) -
      (data.shippingHandlingCost || 0) -
      (data.transactionCost || 0) -
      (data.totalRefunds || 0) -
      (data.taxes || 0) -
      (data.overheadCost || 0);

    // Calculate percentages relative to Total Sales
    const totalSales = data.totalSales || 0;
    const costsOfGoodsSoldPct = totalSales ? ((data.costOfGoodsSold || 0) / totalSales) * 100 : 0;
    const marketingPct = totalSales ? ((data.marketingSpend || 0) / totalSales) * 100 : 0;
    const shippingHandlingPct = totalSales ? ((data.shippingHandlingCost || 0) / totalSales) * 100 : 0;
    const transactionPct = totalSales ? ((data.transactionCost || 0) / totalSales) * 100 : 0;
    const refundsPct = totalSales ? ((data.totalRefunds || 0) / totalSales) * 100 : 0;
    const taxesPct = totalSales ? ((data.taxes || 0) / totalSales) * 100 : 0;
    const overheadPct = totalSales ? ((data.overheadCost || 0) / totalSales) * 100 : 0;

    // Populate each category in the response
    response[0][month] = `$${(data.totalSales || 0).toFixed(2)}`;
    response[1][month] = `$${(data.costOfGoodsSold || 0).toFixed(2)}`;
    response[2][month] = `${costsOfGoodsSoldPct.toFixed(2)}%`;
    response[3][month] = `$${(data.marketingSpend || 0).toFixed(2)}`;
    response[4][month] = `${marketingPct.toFixed(2)}%`;
    response[5][month] = `$${(data.shippingHandlingCost || 0).toFixed(2)}`;
    response[6][month] = `${shippingHandlingPct.toFixed(2)}%`;
    response[7][month] = `$${(data.transactionCost || 0).toFixed(2)}`;
    response[8][month] = `${transactionPct.toFixed(2)}%`;
    response[9][month] = `$${(data.totalRefunds || 0).toFixed(2)}`;
    response[10][month] = `${refundsPct.toFixed(2)}%`;
    response[11][month] = `$${(data.taxes || 0).toFixed(2)}`;
    response[12][month] = `${taxesPct.toFixed(2)}%`;
    response[13][month] = `$${(data.overheadCost || 0).toFixed(2)}`;
    response[14][month] = `$${netProfit.toFixed(2)}`;
  });

  return response;
};

export const getCostTrendsService = async (filter, customStartDate, customEndDate) => {
  const { startDate, endDate } = getDateRangeTable(filter, customStartDate, customEndDate);

  const costsWithoutOverhead = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          day: { $dayOfMonth: "$createdAt" },
          month: { $month: "$createdAt" },
          year: { $year: "$createdAt" },
        },
        totalCost: { $sum: { $toDouble: "$totalCost" } },
      },
    },
    {
      $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 },
    },
  ]);

  const overheadCosts = await OverheadCost.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          day: { $dayOfMonth: "$createdAt" },
          month: { $month: "$createdAt" },
          year: { $year: "$createdAt" },
        },
        overheadCost: { $sum: "$overheadCost" },
      },
    },
    {
      $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 },
    },
  ]);

  const costsMap = {};

  const generateKey = (year, month, day) => `${year}-${month}-${day}`;

  costsWithoutOverhead.forEach(item => {
    const { year, month, day } = item._id;
    const key = generateKey(year, month, day);
    if (!costsMap[key]) costsMap[key] = { date: "", totalCostsWithoutOverhead: 0, totalCostsWithOverhead: 0 };
    costsMap[key].totalCostsWithoutOverhead += item.totalCost;
  });

  overheadCosts.forEach(item => {
    const { year, month, day } = item._id;
    const key = generateKey(year, month, day);
    if (!costsMap[key]) costsMap[key] = { date: "", totalCostsWithoutOverhead: 0, totalCostsWithOverhead: 0 };
    costsMap[key].totalCostsWithOverhead += item.overheadCost;
  });

  Object.keys(costsMap).forEach(key => {
    costsMap[key].totalCostsWithOverhead += costsMap[key].totalCostsWithoutOverhead;
  });

  const datesList = [];
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const key = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}-${currentDate.getDate()}`;
    const formattedDate = format(currentDate, 'dd MMM');
    datesList.push({ key, date: formattedDate });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const response = datesList.map(({ key, date }) => {
    const data = costsMap[key] || { totalCostsWithOverhead: 0, totalCostsWithoutOverhead: 0 };
    return {
      date,
      totalCostsWithOverhead: parseFloat(data.totalCostsWithOverhead.toFixed(2)),
      totalCostsWithoutOverhead: parseFloat(data.totalCostsWithoutOverhead.toFixed(2)),
    };
  });

  return response;
};

export const getGrossProfitService = async (filter, customStartDate, customEndDate) => {
  const { startDate, endDate } = getDateRangeTable(filter, customStartDate, customEndDate);

  // Aggregate Overhead from OverheadCost collection
  const overheadAggregation = await OverheadCost.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: null,
        totalOverhead: { $sum: "$overheadCost" },
      },
    },
  ]);

  const totalOverhead = overheadAggregation.length > 0 ? overheadAggregation[0].totalOverhead : 0;

  // Aggregate Shipping from Orders collection
  const shippingAggregation = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: null,
        totalShipping: { $sum: { $toDouble: "$shippingCost" } },
      },
    },
  ]);

  const totalShipping = shippingAggregation.length > 0 ? shippingAggregation[0].totalShipping : 0;

  // Aggregate Transaction from Orders collection
  const transactionAggregation = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: null,
        totalTransaction: { $sum: { $toDouble: "$transactionFee" } },
      },
    },
  ]);

  const totalTransaction = transactionAggregation.length > 0 ? transactionAggregation[0].totalTransaction : 0;

  // Aggregate Refunds from Orders collection
  const refundsAggregation = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: null,
        totalRefunds: { $sum: { $toDouble: "$totalRefunded" } },
      },
    },
  ]);

  const totalRefunds = refundsAggregation.length > 0 ? refundsAggregation[0].totalRefunds : 0;

  // Aggregate Taxes from Orders collection
  const taxesAggregation = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: null,
        totalTaxes: { $sum: { $toDouble: "$taxes" } },
      },
    },
  ]);

  const totalTaxes = taxesAggregation.length > 0 ? taxesAggregation[0].totalTaxes : 0;

  const response = [
    { "name": "Overhead", "value": parseFloat(totalOverhead.toFixed(2)) },
    { "name": "Shipping", "value": parseFloat(totalShipping.toFixed(2)) },
    { "name": "Transaction", "value": parseFloat(totalTransaction.toFixed(2)) },
    { "name": "Refunds", "value": parseFloat(totalRefunds.toFixed(2)) },
    { "name": "Taxes", "value": parseFloat(totalTaxes.toFixed(2)) },
  ];

  return response;
};

export const getCostsBreakdownService = async (filter, customStartDate, customEndDate) => {
  // Get the date range based on the filter
  const { startDate, endDate } = getDateRangeTable(filter, customStartDate, customEndDate);

  // Initialize total costs
  let totalOverhead = 0;
  let totalShipping = 0;
  let totalTransaction = 0;
  let totalRefunds = 0;
  let totalTaxes = 0;

  // Fetch Overhead Costs
  const overheadAggregation = await OverheadCost.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: null,
        totalOverhead: { $sum: "$overheadCost" },
      },
    },
  ]);

  if (overheadAggregation.length > 0) {
    totalOverhead = overheadAggregation[0].totalOverhead;
  }

  // Fetch Orders Data
  const ordersAggregation = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: null,
        totalShipping: { $sum: { $toDouble: "$shippingCost" } },
        totalTransaction: { $sum: { $toDouble: "$transactionFee" } },
        totalRefunds: { $sum: { $toDouble: "$totalRefunded" } },
        totalTaxes: { $sum: { $toDouble: "$taxes" } },
      },
    },
  ]);

  if (ordersAggregation.length > 0) {
    const data = ordersAggregation[0];
    totalShipping = data.totalShipping;
    totalTransaction = data.totalTransaction;
    totalRefunds = data.totalRefunds;
    totalTaxes = data.totalTaxes;
  }

  // Prepare the response
  const response = [
    { "name": "Overhead", "value": parseFloat(totalOverhead.toFixed(2)) },
    { "name": "Shipping", "value": parseFloat(totalShipping.toFixed(2)) },
    { "name": "Transaction", "value": parseFloat(totalTransaction.toFixed(2)) },
    { "name": "Refunds", "value": parseFloat(totalRefunds.toFixed(2)) },
    { "name": "Taxes", "value": parseFloat(totalTaxes.toFixed(2)) },
  ];

  return response;
};

export const getProductsBreakdownService = async (filter, customStartDate, customEndDate) => {
  // Get the date range based on the filter
  const { startDate, endDate } = getDateRangeTable(filter, customStartDate, customEndDate);

  // Fetch orders within the date range
  const orders = await Order.find({
    createdAt: { $gte: startDate, $lte: endDate },
  }).populate({
    path: 'lineItems.product',
    model: 'Product',
    select: 'title description images variants',
  });

  // Create a map to aggregate data per product
  const productMap = {};

  orders.forEach(order => {
    order.lineItems.forEach(lineItem => {
      const product = lineItem.product;
      if (!product) return; // Skip if product data is missing

      const productId = product.id;

      // Initialize product data if not already present
      if (!productMap[productId]) {
        productMap[productId] = {
          productImage: product.images && product.images.length > 0 ? product.images[0].originalSrc : '',
          productTitle: product.title,
          productSubTitle: product.description || '',
          sales: 0,
          netSales: 0,
          profit: 0,
          costOfGoodsSold: 0,
          refunds: 0,
          quantitySold: 0,
        };
      }

      const totalPrice = parseFloat(order.totalPrice) || 0;
      const totalRefunded = parseFloat(order.totalRefunded) || 0;
      const totalCost = parseFloat(order.totalCost) || 0;

      const quantity = lineItem.quantity || 0;

      productMap[productId].sales += totalPrice;
      productMap[productId].netSales += (totalPrice - totalRefunded);
      productMap[productId].profit += (totalPrice - totalRefunded - totalCost);
      productMap[productId].costOfGoodsSold += totalCost;
      productMap[productId].refunds += totalRefunded;
      productMap[productId].quantitySold += quantity;
    });
  });

  // Calculate profit margin and prepare the final response
  const response = Object.values(productMap).map(productData => {
    const { sales, netSales, profit } = productData;
    const profitMargin = sales ? (profit / sales) * 100 : 0;

    return {
      productImage: productData.productImage,
      productTitle: productData.productTitle,
      productSubTitle: productData.productSubTitle,
      sales: parseFloat(sales.toFixed(2)),
      netSales: parseFloat(netSales.toFixed(2)),
      profit: parseFloat(profit.toFixed(2)),
      profitMargin: parseFloat(profitMargin.toFixed(2)),
    };
  });

  // Sort the response based on sales or any other criteria if needed
  response.sort((a, b) => b.sales - a.sales);

  return response;
};
export default {
  calculateGrossProfitData,
};
