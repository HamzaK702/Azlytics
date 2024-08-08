import Order from "../models/BulkTables/BulkOrder/order.js";
import Customer from "../models/BulkTables/BulkCustomer/customer.js"

export const getOrdersTrend = async () => {
  try {
    // Fetch all orders and customers
    const orders = await Order.find();
    const customers = await Customer.find();

    // Convert data to a more accessible format
    const customerMap = new Map();
    customers.forEach(customer => {
      if (customer && customer.id) {
        customerMap.set(customer.id, customer.createdAt);
      }
    });

    // Initialize data storage for the results
    const results = {};

    // Process each order
    orders.forEach(order => {
      if (order.customer && order.customer.id) {
        const orderDate = order.createdAt.toISOString().split('T')[0];
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
        if (customerCreatedAt && order.createdAt.toISOString() === customerCreatedAt.toISOString()) {
          results[orderDate].newCustomerOrders += 1;
        } else {
          results[orderDate].returningCustomerOrders += 1;
        }
      }
    });

    // Convert results to an array format for easier frontend handling
    return Object.keys(results).map(date => ({
      orderDate: date,
      ...results[date],
    }));
  } catch (error) {
    throw new Error('Error fetching orders trend');
  }
};


export const calculateOrderTimeDifferences = async () => {
  try {
    const orders = await Order.aggregate([
      // Sort orders by customer id and createdAt
      { $sort: { 'customer.id': 1, createdAt: 1 } },

      // Group by customer id and push orders into an array
      {
        $group: {
          _id: '$customer.id',
          orders: {
            $push: {
              createdAt: '$createdAt'
            }
          }
        }
      },

      // Filter out customers with only one order
      { $match: { "orders.1": { $exists: true } } }, // Ensures at least 2 orders exist

      // Project to add sequence numbers and calculate time differences
      {
        $project: {
          orders: {
            $map: {
              input: { $range: [0, { $subtract: [{ $size: "$orders" }, 1] }] }, // Create an array [0, 1, 2, ...]
              as: "index",
              in: {
                orderSequence: { $add: ["$$index", 2] }, // Sequence starts from 2
                createdAt: { $arrayElemAt: ["$orders.createdAt", { $add: ["$$index", 1] }] },
                previousOrderDate: { $arrayElemAt: ["$orders.createdAt", "$$index"] },
                timeDifference: {
                  $divide: [
                    {
                      $subtract: [
                        { $arrayElemAt: ["$orders.createdAt", { $add: ["$$index", 1] }] },
                        { $arrayElemAt: ["$orders.createdAt", "$$index"] }
                      ]
                    },
                    1000 * 60 * 60 * 24 // Convert milliseconds to days
                  ] // Time difference in days
                }
              }
            }
          }
        }
      },

      // Unwind the orders array to process each order individually
      { $unwind: "$orders" },

      // Filter out the first orders as they don't have a previous order to compare
      { $match: { "orders.orderSequence": { $gt: 1 } } },

      // Group by order sequence and calculate mean and median time differences
      {
        $group: {
          _id: '$orders.orderSequence',
          meanTimeDifference: { $avg: '$orders.timeDifference' },
          allTimeDifferences: { $push: '$orders.timeDifference' }
        }
      },

      // Add median calculation for each order sequence
      {
        $project: {
          _id: 1,
          meanTimeDifference: 1,
          medianTimeDifference: {
            $cond: {
              if: { $eq: [{ $mod: [{ $size: "$allTimeDifferences" }, 2] }, 0] }, // If even number of elements
              then: {
                $avg: [
                  { $arrayElemAt: ["$allTimeDifferences", { $divide: [{ $size: "$allTimeDifferences" }, 2] }] },
                  { $arrayElemAt: ["$allTimeDifferences", { $subtract: [{ $divide: [{ $size: "$allTimeDifferences" }, 2] }, 1] }] }
                ]
              },
              else: {
                $arrayElemAt: ["$allTimeDifferences", { $floor: { $divide: [{ $size: "$allTimeDifferences" }, 2] } }]
              }
            }
          }
        }
      },

      // Filter to include only up to the 10th order
      { $match: { _id: { $lte: 10 } } },

      // Sort by order sequence number
      { $sort: { _id: 1 } }
    ]);

    return orders;
  } catch (error) {
    console.error('Error calculating order time differences:', error);
    throw error;
  }
};





export const calculateAOV = async () => {
  try {
    const orders = await Order.aggregate([
      // Sort orders by customer id and createdAt
      { $sort: { 'customer.id': 1, createdAt: 1 } },

      // Group by customer id, and push orders into an array
      {
        $group: {
          _id: '$customer.id',
          orders: {
            $push: {
              createdAt: '$createdAt',
              totalPrice: { $toDouble: '$totalPrice' } // Convert totalPrice to double
            }
          }
        }
      },

      // Project to add sequence numbers to each order
      {
        $project: {
          orders: {
            $map: {
              input: { $range: [0, { $size: "$orders" }] }, // Create an array [0, 1, 2, ...]
              as: "index",
              in: {
                sequenceNumber: { $add: ["$$index", 1] }, // Sequence starts from 1
                createdAt: { $arrayElemAt: ["$orders.createdAt", "$$index"] },
                totalPrice: { $arrayElemAt: ["$orders.totalPrice", "$$index"] }
              }
            }
          }
        }
      },

      // Unwind the orders array to process each order individually
      { $unwind: "$orders" },

      // Group by sequence number and calculate the average order value (AOV)
      {
        $group: {
          _id: "$orders.sequenceNumber", // Group by sequence number
          AOV: { $avg: "$orders.totalPrice" } // Calculate the average of totalPrice
        }
      },

      // Filter to include only up to the 10th order sequence
      { $match: { _id: { $lte: 10 } } },

      // Sort by order sequence number
      { $sort: { _id: 1 } }
    ]);

    return orders;
  } catch (error) {
    console.error('Error calculating AOV:', error);
    throw error;
  }
};







