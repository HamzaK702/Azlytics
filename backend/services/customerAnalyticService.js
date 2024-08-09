import Order from "../models/BulkTables/BulkOrder/order.js";

export const getChampions = async () => {
  try {
    const now = new Date();

    const customerSpending = await Order.aggregate([
      {
        $group: {
          _id: "$customer.id",
          totalSpend: { $sum: { $toDouble: "$totalPrice" } },
          orderCount: { $sum: 1 },
          lastPurchaseDate: { $max: "$createdAt" },
        },
      },
      {
        $match: {
          lastPurchaseDate: {
            $gte: new Date(now.setDate(now.getDate() - 30)),
          },
        },
      },
      {
        $match: {
          orderCount: { $gte: 5 },
        },
      },
      {
        $sort: { totalSpend: -1 }, // Sort customers by total spend in descending order
      },
      {
        $facet: {
          sortedBySpend: [{ $match: {} }],
          totalCustomers: [{ $count: "count" }],
        },
      },
      {
        $project: {
          topCustomers: {
            $slice: [
              "$sortedBySpend",
              {
                $ceil: {
                  $multiply: [
                    {
                      $divide: [
                        { $arrayElemAt: ["$totalCustomers.count", 0] },
                        100,
                      ],
                    },
                    15,
                  ],
                },
              },
            ],
          },
        },
      },
      {
        $unwind: "$topCustomers",
      },
      {
        $replaceRoot: { newRoot: "$topCustomers" },
      },
    ]);

    return customerSpending;
  } catch (error) {
    console.error("Error fetching champions:", error);
    throw error;
  }
};

export const getLoyalCustomers = async () => {
  try {
    const now = new Date();

    const customerSpending = await Order.aggregate([
      {
        $group: {
          _id: "$customer.id",
          totalSpend: { $sum: { $toDouble: "$totalPrice" } },
          orderCount: { $sum: 1 },
          lastPurchaseDate: { $max: "$createdAt" },
        },
      },
      {
        $match: {
          lastPurchaseDate: {
            $gte: new Date(now.setDate(now.getDate() - 60)),
            $lte: new Date(now.setDate(now.getDate() - 30)),
          },
        },
      },
      {
        $match: {
          orderCount: { $gte: 5 },
        },
      },
      {
        $setWindowFields: {
          partitionBy: null,
          sortBy: { totalSpend: -1 },
          output: {
            rank: {
              $rank: {},
            },
          },
        },
      },
      {
        $match: {
          rank: { $lte: { $multiply: [{ $size: "$$ROOT" }, 0.3] } }, // Top 30% by spend
        },
      },
    ]);

    return customerSpending;
  } catch (error) {
    console.error("Error fetching loyal customers:", error);
    throw error;
  }
};

export const getPotentialLoyalists = async () => {
  try {
    const now = new Date();

    // Get total count of customers to calculate percentiles
    const totalCustomers = await Order.aggregate([
      {
        $group: {
          _id: "$customer.id",
          totalSpend: { $sum: { $toDouble: "$totalPrice" } },
          orderCount: { $sum: 1 },
          lastPurchaseDate: { $max: "$createdAt" },
        },
      },
      {
        $count: "count",
      },
    ]);

    const customerCount = totalCustomers[0]?.count || 0;

    const customerSpending = await Order.aggregate([
      {
        $group: {
          _id: "$customer.id",
          totalSpend: { $sum: { $toDouble: "$totalPrice" } },
          orderCount: { $sum: 1 },
          lastPurchaseDate: { $max: "$createdAt" },
        },
      },
      {
        $match: {
          lastPurchaseDate: {
            $gte: new Date(now.setDate(now.getDate() - 60)),
            $lte: new Date(now.setDate(now.getDate() - 31)),
          },
        },
      },
      {
        $match: {
          orderCount: { $gte: 3, $lte: 4 },
        },
      },
      {
        $setWindowFields: {
          partitionBy: null,
          sortBy: { totalSpend: -1 },
          output: {
            rank: {
              $rank: {},
            },
          },
        },
      },
      {
        $match: {
          rank: {
            $gte: Math.floor(customerCount * 0.3),
            $lte: Math.floor(customerCount * 0.5),
          },
        },
      },
    ]);

    return customerSpending;
  } catch (error) {
    console.error("Error fetching potential loyalists:", error);
    throw error;
  }
};

export const getNewCustomers = async () => {
  try {
    const now = new Date();

    // Get new customers who have made their first purchase within the last 30 days and have only one order.
    const newCustomers = await Order.aggregate([
      {
        $group: {
          _id: "$customer.id",
          totalOrders: { $sum: 1 },
          firstPurchaseDate: { $min: "$createdAt" },
        },
      },
      {
        $match: {
          totalOrders: 1, // Only customers with 1 order
          firstPurchaseDate: {
            $gte: new Date(now.setDate(now.getDate() - 30)), // Last purchase within the last 30 days
          },
        },
      },
    ]);

    return newCustomers;
  } catch (error) {
    console.error("Error fetching new customers:", error);
    throw error;
  }
};

export const getPromisingCustomers = async () => {
  try {
    const now = new Date();
    const totalCustomerData = await Order.aggregate([
      {
        $group: {
          _id: "$customer.id",
          totalSpend: { $sum: { $toDouble: "$totalPrice" } },
          orderCount: { $sum: 1 },
          lastPurchaseDate: { $max: "$createdAt" },
        },
      },
      {
        $count: "count",
      },
    ]);

    const totalCustomerCount = totalCustomerData[0]?.count || 0;
    const promisingCustomers = await Order.aggregate([
      {
        $group: {
          _id: "$customer.id",
          totalSpend: { $sum: { $toDouble: "$totalPrice" } },
          orderCount: { $sum: 1 },
          lastPurchaseDate: { $max: "$createdAt" },
        },
      },
      {
        $match: {
          lastPurchaseDate: {
            $gte: new Date(now.setDate(now.getDate() - 30)),
          },
          orderCount: { $gte: 2 },
        },
      },
      {
        $setWindowFields: {
          partitionBy: null,
          sortBy: { totalSpend: 1 },
          output: {
            rank: {
              $rank: {},
            },
          },
        },
      },
      {
        $match: {
          rank: {
            $lte: Math.floor(totalCustomerCount * 0.5),
          },
        },
      },
    ]);

    return promisingCustomers;
  } catch (error) {
    console.error("Error fetching promising customers:", error);
    throw error;
  }
};

export const getNeedAttentionCustomers = async () => {
  try {
    const now = new Date();
    const totalCustomerData = await Order.aggregate([
      {
        $group: {
          _id: "$customer.id",
          totalSpend: { $sum: { $toDouble: "$totalPrice" } },
          orderCount: { $sum: 1 },
          lastPurchaseDate: { $max: "$createdAt" },
        },
      },
      {
        $count: "count",
      },
    ]);

    const totalCustomerCount = totalCustomerData[0]?.count || 0;
    const needAttentionCustomers = await Order.aggregate([
      {
        $group: {
          _id: "$customer.id",
          totalSpend: { $sum: { $toDouble: "$totalPrice" } },
          orderCount: { $sum: 1 },
          lastPurchaseDate: { $max: "$createdAt" },
        },
      },
      {
        $match: {
          lastPurchaseDate: {
            $gte: new Date(now.setDate(now.getDate() - 90)),
            $lte: new Date(now.setDate(now.getDate() - 61)),
          },
          orderCount: { $gte: 3 },
        },
      },
      {
        $setWindowFields: {
          partitionBy: null,
          sortBy: { totalSpend: -1 },
          output: {
            rank: {
              $rank: {},
            },
          },
        },
      },
      {
        $match: {
          rank: {
            $gte: Math.floor(totalCustomerCount * 0.3),
            $lte: Math.floor(totalCustomerCount * 0.5),
          },
        },
      },
    ]);

    return needAttentionCustomers;
  } catch (error) {
    console.error("Error fetching need attention customers:", error);
    throw error;
  }
};

export const getAboutToSleepCustomers = async () => {
  try {
    const now = new Date();
    const totalCustomerData = await Order.aggregate([
      {
        $group: {
          _id: '$customer.id',
          totalSpend: { $sum: { $toDouble: '$totalPrice' } },
          orderCount: { $sum: 1 },
          lastPurchaseDate: { $max: '$createdAt' }
        }
      },
      {
        $count: "count" 
      }
    ]);

    const totalCustomerCount = totalCustomerData[0]?.count || 0;
    const aboutToSleepCustomers = await Order.aggregate([
      {
        $group: {
          _id: '$customer.id',
          totalSpend: { $sum: { $toDouble: '$totalPrice' } },
          orderCount: { $sum: 1 },
          lastPurchaseDate: { $max: '$createdAt' }
        }
      },
      {
        $match: {
          lastPurchaseDate: {
            $gte: new Date(now.setDate(now.getDate() - 120)), 
            $lte: new Date(now.setDate(now.getDate() - 91))
          },
          orderCount: { $gte: 2, $lte: 3 } 
        }
      },
      {
        $setWindowFields: {
          partitionBy: null,
          sortBy: { totalSpend: 1 }, 
          output: {
            rank: {
              $rank: {}
            }
          }
        }
      },
      {
        $match: {
          rank: {
            $lte: Math.floor(totalCustomerCount * 0.5) 
          }
        }
      }
    ]);

    return aboutToSleepCustomers;
  } catch (error) {
    console.error('Error fetching about to sleep customers:', error);
    throw error;
  }
};

export const getCantLoseThemCustomers = async () => {
  try {
    const now = new Date();
    const [{ totalCustomerCount }] = await Order.aggregate([
      {
        $group: {
          _id: '$customer.id',
          totalSpend: { $sum: { $toDouble: '$totalPrice' } },
          orderCount: { $sum: 1 },
          lastPurchaseDate: { $max: '$createdAt' }
        }
      },
      {
        $count: "totalCustomerCount" 
      }
    ]);
    const cantLoseThemCustomers = await Order.aggregate([
      {
        $group: {
          _id: '$customer.id',
          totalSpend: { $sum: { $toDouble: '$totalPrice' } },
          orderCount: { $sum: 1 },
          lastPurchaseDate: { $max: '$createdAt' }
        }
      },
      {
        $match: {
          lastPurchaseDate: { $lte: new Date(now.setDate(now.getDate() - 120)) }, 
          orderCount: { $gte: 5 } 
        }
      },
      {
        $setWindowFields: {
          partitionBy: null,
          sortBy: { totalSpend: -1 }, 
          output: {
            rank: {
              $rank: {} 
            }
          }
        }
      },
      {
        $match: {
          rank: {
            $lte: Math.floor(totalCustomerCount * 0.15) 
          }
        }
      }
    ]);

    return cantLoseThemCustomers;
  } catch (error) {
    console.error('Error fetching Can not Lose Them customers:', error);
    throw error;
  }
};


export const getAtRiskCustomers = async () => {
  try {
    const now = new Date();
    const [{ totalCustomerCount }] = await Order.aggregate([
      {
        $group: {
          _id: '$customer.id',
          totalSpend: { $sum: { $toDouble: '$totalPrice' } },
          orderCount: { $sum: 1 },
          lastPurchaseDate: { $max: '$createdAt' }
        }
      },
      {
        $count: "totalCustomerCount"
      }
    ]);
    const atRiskCustomers = await Order.aggregate([
      {
        $group: {
          _id: '$customer.id',
          totalSpend: { $sum: { $toDouble: '$totalPrice' } },
          orderCount: { $sum: 1 },
          lastPurchaseDate: { $max: '$createdAt' }
        }
      },
      {
        $match: {
          lastPurchaseDate: { $lte: new Date(now.setDate(now.getDate() - 120)) },
          orderCount: { $gte: 2, $lte: 3 }
        }
      },
      {
        $setWindowFields: {
          partitionBy: null,
          sortBy: { totalSpend: 1 }, 
          output: {
            rank: {
              $rank: {} 
            }
          }
        }
      },
      {
        $match: {
          rank: {
            $lte: Math.floor(totalCustomerCount * 0.5) 
          }
        }
      }
    ]);

    return atRiskCustomers;
  } catch (error) {
    console.error('Error fetching At Risk customers:', error);
    throw error;
  }
};


export const getHibernatingCustomers = async () => {
  try {
    const now = new Date();
    const [{ totalCustomerCount }] = await Order.aggregate([
      {
        $group: {
          _id: '$customer.id',
          totalSpend: { $sum: { $toDouble: '$totalPrice' } },
          orderCount: { $sum: 1 },
          lastPurchaseDate: { $max: '$createdAt' }
        }
      },
      {
        $count: "totalCustomerCount"
      }
    ]);
    const hibernatingCustomers = await Order.aggregate([
      {
        $group: {
          _id: '$customer.id',
          totalSpend: { $sum: { $toDouble: '$totalPrice' } },
          orderCount: { $sum: 1 },
          lastPurchaseDate: { $max: '$createdAt' }
        }
      },
      {
        $match: {
          lastPurchaseDate: { $lte: new Date(now.setDate(now.getDate() - 180)) },
          orderCount: { $in: [1, 2] } 
        }
      },
      {
        $setWindowFields: {
          partitionBy: null,
          sortBy: { totalSpend: 1 },
          output: {
            rank: {
              $rank: {} 
            }
          }
        }
      },
      {
        $match: {
          rank: {
            $lte: Math.floor(totalCustomerCount * 0.5) 
          }
        }
      }
    ]);

    return hibernatingCustomers;
  } catch (error) {
    console.error('Error fetching Hibernating customers:', error);
    throw error;
  }
};




