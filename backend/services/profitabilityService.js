// services/profitabilityService.js

import Order from '../models/BulkTables/BulkOrder/order.js';
import Product from '../models/BulkTables/BulkProduct/product.js';
import OverheadCost from '../models/overheadCostModel.js';
import MetaAdInsights from '../models/metaAdInsightModel.js';
import moment from 'moment';

// Helper functions for date ranges and periods
import {
  getDateRange,
  generateDateArray,
  generateWeeklyPeriods,
  generateMonthArray,
} from './dateHelpers.js'; // Adjust the import path accordingly

const calculateProfitTrends = async (filter, format) => {
  try {
    // Get the date range based on the filter
    const { startDate, endDate } = getDateRange(filter);

    // Generate periods based on the format
    let periods = [];
    if (format === 'day') {
      periods = generateDateArray(startDate, endDate);
    } else if (format === 'week') {
      periods = generateWeeklyPeriods(startDate, endDate);
    } else if (format === 'month') {
      periods = generateMonthArray(startDate, endDate);
    } else {
      throw new Error('Invalid format specified');
    }

    // Convert periods to string keys for mapping
    const periodKeys = periods.map((period) => formatPeriodKey(period, format));

    // Initialize data map with periods
    const dataMap = new Map();
    periodKeys.forEach((key) => {
      dataMap.set(key, {
        date: formatPeriodLabel(key, format),
        grossProfit: 0,
        netMargin: 0,
      });
    });

    // Fetch and calculate gross profit per period
    const grossProfits = await calculateGrossProfitPerPeriod(
      startDate,
      endDate,
      format
    );
    grossProfits.forEach((item) => {
      if (dataMap.has(item._id)) {
        dataMap.get(item._id).grossProfit = item.grossProfit;
      }
    });

    // Fetch and map other cost components per period
    const marketingCosts = await getMarketingCosts(startDate, endDate, format);
    const overheadCosts = await getOverheadCosts(startDate, endDate, format);
    const shippingCosts = await getShippingCosts(startDate, endDate, format);
    const transactionCosts = await getTransactionCosts(startDate, endDate, format);
    const refunds = await getRefunds(startDate, endDate, format);
    const taxes = await getTaxes(startDate, endDate, format);

    // Calculate net margin per period
    dataMap.forEach((value, key) => {
      const grossProfit = value.grossProfit;

      const marketingCost = marketingCosts.get(key) || 0;
      const overheadCost = overheadCosts.get(key) || 0;
      const shippingCost = shippingCosts.get(key) || 0;
      const transactionCost = transactionCosts.get(key) || 0;
      const refund = refunds.get(key) || 0;
      const tax = taxes.get(key) || 0;

      const netMargin =
        grossProfit -
        marketingCost -
        overheadCost -
        shippingCost -
        transactionCost -
        refund -
        tax;

      value.netMargin = netMargin;
    });

    // Convert dataMap to array and return
    const result = Array.from(dataMap.values());

    return result;
  } catch (error) {
    console.error('Error in calculateProfitTrends:', error.message);
    throw error;
  }
};

const formatPeriodKey = (date, format) => {
  if (format === 'day') {
    return moment(date).format('YYYY-MM-DD');
  } else if (format === 'week') {
    return moment(date).startOf('isoWeek').format('YYYY-MM-DD');
  } else if (format === 'month') {
    return moment(date).format('YYYY-MM');
  }
};

const formatPeriodLabel = (periodKey, format) => {
  if (format === 'day') {
    return moment(periodKey, 'YYYY-MM-DD').format('D MMM');
  } else if (format === 'week') {
    return moment(periodKey, 'YYYY-MM-DD').format('D MMM');
  } else if (format === 'month') {
    return moment(periodKey, 'YYYY-MM').format('MMM YYYY');
  }
};

// Helper function to calculate gross profit per period
const calculateGrossProfitPerPeriod = async (startDate, endDate, format) => {
  let groupFormat;
  if (format === 'day') {
    groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
  } else if (format === 'week') {
    groupFormat = {
      $dateToString: {
        format: '%Y-%m-%d',
        date: {
          $dateFromParts: {
            isoWeekYear: { $isoWeekYear: '$createdAt' },
            isoWeek: { $isoWeek: '$createdAt' },
            isoDayOfWeek: 1,
          },
        },
      },
    };
  } else if (format === 'month') {
    groupFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
  }

  const grossProfits = await Order.aggregate([
    {
      $match: {
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },
    {
      $unwind: '$lineItems',
    },
    {
      $lookup: {
        from: 'products',
        localField: 'lineItems.product.id',
        foreignField: 'id',
        as: 'productDetails',
      },
    },
    {
      $unwind: '$productDetails',
    },
    {
      $project: {
        createdAt: 1,
        sellingPrice: { $toDouble: '$lineItems.price' },
        costPrice: { $toDouble: '$productDetails.costPrice' },
        quantity: '$lineItems.quantity',
      },
    },
    {
      $addFields: {
        period: groupFormat,
      },
    },
    {
      $group: {
        _id: '$period',
        totalSales: { $sum: { $multiply: ['$sellingPrice', '$quantity'] } },
        totalCOGS: { $sum: { $multiply: ['$costPrice', '$quantity'] } },
      },
    },
    {
      $project: {
        _id: 1,
        grossProfit: { $subtract: ['$totalSales', '$totalCOGS'] },
      },
    },
  ]);

  return grossProfits;
};

// Helper functions to fetch other cost components per period
const getMarketingCosts = async (startDate, endDate, format) => {
  let groupFormat;
  if (format === 'day') {
    groupFormat = {
      $dateToString: { format: '%Y-%m-%d', date: { $toDate: '$date' } },
    };
  } else if (format === 'week') {
    groupFormat = {
      $dateToString: {
        format: '%Y-%m-%d',
        date: {
          $dateFromParts: {
            isoWeekYear: { $isoWeekYear: { $toDate: '$date' } },
            isoWeek: { $isoWeek: { $toDate: '$date' } },
            isoDayOfWeek: 1,
          },
        },
      },
    };
  } else if (format === 'month') {
    groupFormat = {
      $dateToString: { format: '%Y-%m', date: { $toDate: '$date' } },
    };
  }

  const marketingData = await MetaAdInsights.aggregate([
    {
      $match: {
        date: {
          $gte: startDate.toISOString().split('T')[0],
          $lte: endDate.toISOString().split('T')[0],
        },
      },
    },
    {
      $unwind: '$insights',
    },
    {
      $group: {
        _id: groupFormat,
        totalMarketingCost: { $sum: { $toDouble: '$insights.spend' } },
      },
    },
  ]);

  const marketingCosts = new Map();
  marketingData.forEach((item) => {
    marketingCosts.set(item._id, item.totalMarketingCost);
  });

  return marketingCosts;
};

const getOverheadCosts = async (startDate, endDate, format) => {
  // Fetch overhead costs from OverheadCost model
  // Assuming overhead costs are stored per month
  const overheadData = await OverheadCost.aggregate([
    {
      $match: {
        year: { $gte: startDate.getFullYear(), $lte: endDate.getFullYear() },
        month: { $gte: startDate.getMonth() + 1, $lte: endDate.getMonth() + 1 },
      },
    },
    {
      $project: {
        year: 1,
        month: 1,
        overheadCost: 1,
        period: {
          $dateToString: {
            format: '%Y-%m',
            date: {
              $dateFromParts: {
                year: '$year',
                month: '$month',
                day: 1,
              },
            },
          },
        },
      },
    },
  ]);

  const overheadCosts = new Map();
  overheadData.forEach((item) => {
    overheadCosts.set(item.period, item.overheadCost);
  });

  return overheadCosts;
};

const getShippingCosts = async (startDate, endDate, format) => {
  let groupFormat;
  if (format === 'day') {
    groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
  } else if (format === 'week') {
    groupFormat = {
      $dateToString: {
        format: '%Y-%m-%d',
        date: {
          $dateFromParts: {
            isoWeekYear: { $isoWeekYear: '$createdAt' },
            isoWeek: { $isoWeek: '$createdAt' },
            isoDayOfWeek: 1,
          },
        },
      },
    };
  } else if (format === 'month') {
    groupFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
  }

  const shippingData = await Order.aggregate([
    {
      $match: {
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },
    {
      $group: {
        _id: groupFormat,
        totalShippingCost: { $sum: { $toDouble: '$totalShippingPrice' } },
      },
    },
  ]);

  const shippingCosts = new Map();
  shippingData.forEach((item) => {
    shippingCosts.set(item._id, item.totalShippingCost);
  });

  return shippingCosts;
};

const getTransactionCosts = async (startDate, endDate, format) => {
  let groupFormat;
  if (format === 'day') {
    groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
  } else if (format === 'week') {
    groupFormat = {
      $dateToString: {
        format: '%Y-%m-%d',
        date: {
          $dateFromParts: {
            isoWeekYear: { $isoWeekYear: '$createdAt' },
            isoWeek: { $isoWeek: '$createdAt' },
            isoDayOfWeek: 1,
          },
        },
      },
    };
  } else if (format === 'month') {
    groupFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
  }

  const transactionData = await Order.aggregate([
    {
      $match: {
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },
    { $unwind: '$transactions' },
    { $unwind: '$transactions.fees' },
    {
      $group: {
        _id: groupFormat,
        totalFees: { $sum: { $toDouble: '$transactions.fees.amount' } },
      },
    },
  ]);

  const transactionCosts = new Map();
  transactionData.forEach((item) => {
    transactionCosts.set(item._id, item.totalFees);
  });

  return transactionCosts;
};

const getRefunds = async (startDate, endDate, format) => {
  let groupFormat;
  if (format === 'day') {
    groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
  } else if (format === 'week') {
    groupFormat = {
      $dateToString: {
        format: '%Y-%m-%d',
        date: {
          $dateFromParts: {
            isoWeekYear: { $isoWeekYear: '$createdAt' },
            isoWeek: { $isoWeek: '$createdAt' },
            isoDayOfWeek: 1,
          },
        },
      },
    };
  } else if (format === 'month') {
    groupFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
  }

  const refundData = await Order.aggregate([
    {
      $match: {
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },
    {
      $group: {
        _id: groupFormat,
        totalRefunds: { $sum: { $toDouble: '$totalRefunded' } },
      },
    },
  ]);

  const refunds = new Map();
  refundData.forEach((item) => {
    refunds.set(item._id, item.totalRefunds);
  });

  return refunds;
};

const getTaxes = async (startDate, endDate, format) => {
  let groupFormat;
  if (format === 'day') {
    groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
  } else if (format === 'week') {
    groupFormat = {
      $dateToString: {
        format: '%Y-%m-%d',
        date: {
          $dateFromParts: {
            isoWeekYear: { $isoWeekYear: '$createdAt' },
            isoWeek: { $isoWeek: '$createdAt' },
            isoDayOfWeek: 1,
          },
        },
      },
    };
  } else if (format === 'month') {
    groupFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
  }

  const taxData = await Order.aggregate([
    {
      $match: {
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },
    { $unwind: '$taxLines' },
    {
      $group: {
        _id: groupFormat,
        totalTaxes: { $sum: { $toDouble: '$taxLines.price' } },
      },
    },
  ]);

  const taxes = new Map();
  taxData.forEach((item) => {
    taxes.set(item._id, item.totalTaxes);
  });

  return taxes;
};

export default {
  calculateProfitTrends,
};
