import Order from "../models/BulkTables/BulkOrder/order.js";
import Customer from "../models/BulkTables/BulkCustomer/customer.js";
import Product from "../models/BulkTables/BulkProduct/product.js";
import salesService from "./salesService.js";

export const getOrdersTrend = async () => {
  try {
    // Fetch all orders and customers
    const orders = await Order.find();
    const customers = await Customer.find();

    // Convert data to a more accessible format
    const customerMap = new Map();
    customers.forEach((customer) => {
      if (customer && customer.id) {
        customerMap.set(customer.id, customer.createdAt);
      }
    });

    // Initialize data storage for the results
    const results = {};

    // Process each order
    orders.forEach((order) => {
      if (order.customer && order.customer.id) {
        const orderDate = order.createdAt.toISOString().split("T")[0];
        const customerCreatedAt = customerMap.get(order.customer.id);

        if (!results[orderDate]) {
          results[orderDate] = {
            totalOrders: 0,
            newCustomerOrders: 0,
            returningCustomerOrders: 0,
          };
        }

        // Increment total orders
        results[orderDate].totalOrders += 1;

        // Determine if the order is from a new or returning customer
        if (
          customerCreatedAt &&
          order.createdAt.toISOString() === customerCreatedAt.toISOString()
        ) {
          results[orderDate].newCustomerOrders += 1;
        } else {
          results[orderDate].returningCustomerOrders += 1;
        }
      }
    });

    // Convert results to an array format for easier frontend handling
    return Object.keys(results).map((date) => ({
      orderDate: date,
      ...results[date],
    }));
  } catch (error) {
    throw new Error("Error fetching orders trend");
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
