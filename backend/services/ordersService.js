import Order from "../models/BulkTables/BulkOrder/order.js";
import Customer from "../models/BulkTables/BulkCustomer/customer.js";
import Product from "../models/BulkTables/BulkProduct/product.js";
import salesService from "./salesService.js";

export const getOrdersTrend = async (filter, customStartDate, customEndDate) => {
  try {
    const now = new Date();
    let startDate;
    let endDate;

    switch (filter) {
      case 'yesterday':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 1);
        endDate = startDate;
        break;
      case 'one_week':
        endDate = new Date(now);
        endDate.setDate(now.getDate() - 1);
        startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'one_month':
        endDate = new Date(now);
        endDate.setDate(now.getDate() - 1);
        startDate = new Date(endDate);
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case 'three_months':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 3);
        endDate = now;
        break;
      case 'six_months':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 6);
        endDate = now;
        break;
      case 'twelve_months':
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        endDate = now;
        break;
      case 'custom_date_range':
        if (!customStartDate || !customEndDate) {
          throw new Error('Custom start and end dates are required for custom_date_range filter');
        }
        startDate = new Date(customStartDate);
        endDate = new Date(customEndDate);
        break;
      default:
        throw new Error('Invalid filter specified');
    }

    const startDateISO = startDate.toISOString();
    const endDateISO = endDate.toISOString();

    const dayDifference = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const dateFormat = dayDifference <= 60 ? '%Y-%m-%d' : '%Y-%m';

    const pipeline = [
      {
        $match: {
          createdAt: { $gte: new Date(startDateISO), $lte: new Date(endDateISO) },
        },
      },
      {
        $unwind: "$lineItems"
      },
      {
        $group: {
          _id: {
            productId: "$lineItems.productId",
            productTitle: "$lineItems.title",
            date: { $dateToString: { format: dateFormat, date: '$createdAt' } }
          },
          totalQuantitySold: { $sum: "$lineItems.quantity" }
        },
      },
      {
        $group: {
          _id: {
            productId: "$_id.productId",
            productTitle: "$_id.productTitle"
          },
          dates: {
            $push: {
              date: "$_id.date",
              quantitySold: "$totalQuantitySold"
            }
          },
          totalQuantity: { $sum: "$totalQuantitySold" } 
        }
      },
      {
        $project: {
          id: "$_id.productId",
          title: "$_id.productTitle",
          dates: 1,
          average: { $divide: ["$totalQuantity", dayDifference] }
        }
      }
    ];

    const results = await Order.aggregate(pipeline);

    const finalResults = results.map(product => {
      const datesObj = product.dates.reduce((acc, dateItem) => {
        acc[dateItem.date] = dateItem.quantitySold;
        return acc;
      }, {});

      return {
        id: product.id,
        title: product.title,
        average: product.average,
        values: Object.keys(datesObj).map(date => ({
          date: date,
          value: datesObj[date] || 0 
        }))
      };
    });

    return {
      products: finalResults
    };
  } catch (error) {
    console.error('Error fetching orders trend:', error.message);
    throw new Error('Error fetching orders trend');
  }
};


export const getOrdersTrendComparison = async (filter, customStartDate, customEndDate) => {
  try {
    const currentPeriodData = await getOrdersTrend(filter, customStartDate, customEndDate);
    const { startDate, endDate } = salesService.getDateRange(filter, customStartDate, customEndDate);
    const dayDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const previousStartDate = new Date(startDate);
    const previousEndDate = new Date(endDate);
    previousStartDate.setDate(previousStartDate.getDate() - dayDiff);
    previousEndDate.setDate(previousEndDate.getDate() - dayDiff);
    const previousPeriodData = await getOrdersTrend(
      'custom_date_range',
      previousStartDate.toISOString().split('T')[0],
      previousEndDate.toISOString().split('T')[0]
    );
    const aggregateOrdersData = (data) => {
      return data.reduce(
        (acc, item) => {
          acc.totalOrders += item.totalOrders;
          acc.newCustomerOrders += item.newCustomerOrders;
          acc.returningCustomerOrders += item.returningCustomerOrders;
          return acc;
        },
        { totalOrders: 0, newCustomerOrders: 0, returningCustomerOrders: 0 }
      );
    };

    const currentAggregate = aggregateOrdersData(currentPeriodData);
    const previousAggregate = aggregateOrdersData(previousPeriodData);

    // Helper function to calculate percentage change
    const calculatePercentageChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / Math.abs(previous)) * 100;
    };

    // Prepare comparison results
    const comparison = {
      currentPeriod: currentPeriodData,
      previousPeriod: previousPeriodData,
      percentageComparison: {
        totalOrders: calculatePercentageChange(currentAggregate.totalOrders, previousAggregate.totalOrders),
        newCustomerOrders: calculatePercentageChange(currentAggregate.newCustomerOrders, previousAggregate.newCustomerOrders),
        returningCustomerOrders: calculatePercentageChange(currentAggregate.returningCustomerOrders, previousAggregate.returningCustomerOrders),
      },
    };

    return comparison;
  } catch (error) {
    console.error('Error in getOrdersTrendComparison:', error.message);
    throw new Error('Error fetching orders trend comparison');
  }
};

export const calculateOrderTimeDifferences = async (req, res) => {
  try {
    const customerOrders = await Order.aggregate([
      {
        $match: {
          "customer.id": { $ne: null }, // Ensure customer id exists
          createdAt: { $exists: true }, // Ensure createdAt date exists
        },
      },
      {
        $project: {
          customerId: "$customer.id",
          createdAt: 1,
        },
      },
      {
        $sort: {
          customerId: 1,
          createdAt: 1,
        },
      },
      {
        $group: {
          _id: "$customerId",
          orders: {
            $push: {
              createdAt: "$createdAt",
            },
          },
        },
      },
    ]);
    const timeDifferences = customerOrders.map(({ orders }) => {
      const differences = [];
      for (let i = 1; i < orders.length && i <= 10; i++) {
        const diff =
          (new Date(orders[i].createdAt) - new Date(orders[i - 1].createdAt)) /
          (1000 * 60 * 60 * 24); // Difference in days
        differences.push(diff);
      }
      return differences;
    });
    const meanAndMedianTimeDifferences = {};

    for (let i = 0; i < 10; i++) {
      const nthOrderDifferences = timeDifferences
        .map((diffs) => diffs[i])
        .filter((diff) => diff !== undefined);

      if (nthOrderDifferences.length > 0) {
        const mean =
          nthOrderDifferences.reduce((acc, diff) => acc + diff, 0) /
          nthOrderDifferences.length;
        const formattedMean = mean.toFixed(4); // Format mean to 2 decimal places

        const sortedDifferences = nthOrderDifferences.sort((a, b) => a - b);
        const middle = Math.floor(sortedDifferences.length / 2);
        const median =
          sortedDifferences.length % 2 === 0
            ? (sortedDifferences[middle - 1] + sortedDifferences[middle]) / 2
            : sortedDifferences[middle];
        const formattedMedian = median.toFixed(4); // Format median to 2 decimal places

        meanAndMedianTimeDifferences[`Order ${i + 1} to ${i + 2}`] = {
          mean: parseFloat(formattedMean),
          median: parseFloat(formattedMedian),
        };
      }
    }
    return res.status(200).json({
      meanAndMedianTimeDifferences,
    });
  } catch (error) {
    console.error("Error fetching order time differences:", error);
    return res.status(500).json({
      message: "An error occurred while calculating time differences.",
    });
  }
};

export const calculateAOV = async () => {
  try {
    const orders = await Order.aggregate([
      { $sort: { "customer.id": 1, createdAt: 1 } },
      {
        $group: {
          _id: "$customer.id",
          orders: {
            $push: {
              createdAt: "$createdAt",
              totalPrice: { $toDouble: "$totalPrice" },
            },
          },
        },
      },
      {
        $project: {
          orders: {
            $map: {
              input: { $range: [0, { $size: "$orders" }] }, // Create an array [0, 1, 2, ...]
              as: "index",
              in: {
                sequenceNumber: { $add: ["$$index", 1] }, // Sequence starts from 1
                createdAt: { $arrayElemAt: ["$orders.createdAt", "$$index"] },
                totalPrice: { $arrayElemAt: ["$orders.totalPrice", "$$index"] },
              },
            },
          },
        },
      },
      { $unwind: "$orders" },
      {
        $group: {
          _id: "$orders.sequenceNumber", // Group by sequence number
          AOV: { $avg: "$orders.totalPrice" }, // Calculate the average of totalPrice
        },
      },
      { $match: { _id: { $lte: 10 } } },
      { $sort: { _id: 1 } },
    ]);

    return orders;
  } catch (error) {
    console.error("Error calculating AOV:", error);
    throw error;
  }
};

export const calculateCOGS = async () => {
  try {
    const products = await Order.aggregate([
      { $unwind: "$lineItems" },
      {
        $group: {
          _id: "$lineItems.product.id",
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      {
        $replaceRoot: { newRoot: "$productDetails" },
      },
    ]);
    console.log("Products:", products);
    const productMap = {};
    products.forEach((product) => {
      const price = parseFloat(product.costPrice);
      if (!isNaN(price)) {
        productMap[product.id] = price;
      } else {
        console.warn(
          `Invalid price for product ID: ${product.id}. Price: ${product.price}`
        );
        productMap[product.id] = 0;
      }
    });
    console.log("Product Map:", productMap);
    const orders = await Order.find({});
    let totalCOGS = 0;

    orders.forEach((order) => {
      order.lineItems.forEach((lineItem) => {
        const productId = lineItem.product.id;
        const quantity = parseInt(lineItem.quantity);
        console.log("Product ID:", productId, "Quantity:", quantity);

        const price = productMap[productId] || 0;
        const lineItemCOGS = price * quantity;
        console.log("Line Item COGS:", lineItemCOGS);
        totalCOGS += lineItemCOGS;
      });
    });
    console.log("Total COGS:", totalCOGS);

    return totalCOGS;
  } catch (error) {
    console.error("Error calculating total COGS:", error);
    throw error;
  }
};

export const calculateGrossProfit = async () => {
  try {
    const totalCOGS = await calculateCOGS();
    const orders = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalPrice: { $sum: { $toDouble: "$totalPrice" } },
        },
      },
    ]);

    const totalPrice = orders[0]?.totalPrice || 0;
    const grossProfit = totalPrice - totalCOGS;

    return {
      totalPrice,
      totalCOGS,
      grossProfit,
    };
  } catch (error) {
    console.error("Error calculating Gross Profit:", error);
    throw error;
  }
};

export const calculateNetProfit = async () => {
  try {
    const grossProfit = (await calculateGrossProfit());
    const totalExpenses =
      (await salesService.calculateTotalAdSpend()) +
      (await salesService.calculateTotalTaxes()) +
      (await salesService.calculateTotalShippingCost()) +
      (await salesService.calculateTotalFees()) +
      (await salesService.calculateTotalRefunds());
    console.log("Total Expenses:", totalExpenses);
    console.log("Gross Profit:", grossProfit);
    const netProfit = grossProfit.grossProfit - totalExpenses;
    console.log("Net Profit:", netProfit);

    return {
      ...grossProfit,
      totalExpenses,
      netProfit,
    };
  } catch (error) {
    console.error("Error calculating Net Profit:", error);
    throw error;
  }
};
