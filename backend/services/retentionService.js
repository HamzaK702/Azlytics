import Order from "../models/BulkTables/BulkOrder/order.js";
import Customer from "../models/BulkTables/BulkCustomer/customer.js";
import aggregateTotalSales from "./salesService.js";
import { calculateCOGS } from "./ordersService.js";
import Product from "../models/BulkTables/BulkProduct/product.js";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';

export const calculateRepeatRateByCity = async () => {
  const totalCustomersByCity = await Order.aggregate([
    {
      $match: {
        customer: { $ne: null }, 
      }
    },
    {
      $group: {
        _id: "$shippingAddress.city",
        totalCustomers: { $addToSet: "$customer.id" }
      }
    },
    {
      $project: {
        city: "$_id",
        totalCustomers: { $size: "$totalCustomers" }
      }
    }
  ]);
  const repeatCustomersByCity = await Order.aggregate([
    {
      $match: {
        customer: { $ne: null },  
      }
    },
    {
      $lookup: {
        from: "customers",
        localField: "customer.id",
        foreignField: "id",
        as: "customerData"
      }
    },
    {
      $unwind: {
        path: "$customerData",
        preserveNullAndEmptyArrays: false
      }
    },
    {
      $match: {
        "customerData.numberOfOrders": { $gt: 1 }
      }
    },
    {
      $group: {
        _id: "$shippingAddress.city",
        repeatCustomers: { $addToSet: "$customer.id" }
      }
    },
    {
      $project: {
        city: "$_id",
        repeatCustomers: { $size: "$repeatCustomers" }
      }
    }
  ]);
  return totalCustomersByCity.map((total) => {
    const repeat = repeatCustomersByCity.find(
      (r) => r.city === total.city
    );
    const repeatCustomers = repeat ? repeat.repeatCustomers : 0;
    return {
      city: total.city,
      totalCustomers: total.totalCustomers,
      repeatCustomers,
      repeatRate: (repeatCustomers / total.totalCustomers) * 100
    };
  });
};


export const calculateRepeatRateBySKU = async () => {
  const repeatRateData = await Order.aggregate([
    { $unwind: "$lineItems" },
    {
      $lookup: {
        from: "products",
        localField: "lineItems.product.id",
        foreignField: "id",
        as: "productData"
      }
    },
    { $unwind: "$productData" },
    {
      $match: {
        "productData.variants": { $ne: [] }, 
        "productData.variants.sku": { $ne: null } 
      }
    },
    {
      $group: {
        _id: "$productData.variants.sku",
        totalCustomers: { $addToSet: "$customer.id" },
        repeatCustomers: {
          $addToSet: {
            $cond: [{ $gt: ["$customer.numberOfOrders", 1] }, "$customer.id", null]
          }
        }
      }
    },
    {
      $project: {
        SKU: "$_id",
        totalCustomersCount: { $size: "$totalCustomers" },
        repeatCustomersCount: {
          $size: {
            $filter: {
              input: "$repeatCustomers",
              as: "customerId",
              cond: { $ne: ["$$customerId", null] }
            }
          }
        }
      }
    },
    {
      $addFields: {
        repeatRate: {
          $multiply: [
            { $divide: ["$repeatCustomersCount", "$totalCustomersCount"] },
            100
          ]
        }
      }
    },
    {
      $project: {
        _id: 0,
        SKU: 1,
        totalCustomersCount: 1,
        repeatCustomersCount: 1,
        repeatRate: 1
      }
    }
  ]);

  return repeatRateData;
};

export const calculateRepeatRateByProduct = async () => {
  const flattenedLineItems = await Order.aggregate([
    { $unwind: "$lineItems" },
    {
      $lookup: {
        from: "products",
        localField: "lineItems.product.id",
        foreignField: "id",
        as: "productData"
      }
    },
    { $unwind: "$productData" },
    {
      $project: {
        customerId: "$customer.id",
        productId: "$productData.id",
        productTitle: "$productData.title"
      }
    }
  ]);
  const totalCustomersByProduct = flattenedLineItems.reduce((acc, item) => {
    const productKey = `${item.productId}-${item.productTitle}`;
    if (!acc[productKey]) acc[productKey] = new Set();
    acc[productKey].add(item.customerId);
    return acc;
  }, {});
  const totalCustomers = Object.entries(totalCustomersByProduct).map(([productKey, customerSet]) => {
    const [productId, productTitle] = productKey.split("-");
    return {
      productId,
      productTitle,
      totalCustomersCount: customerSet.size
    };
  });
  const repeatCustomersByProduct = await Order.aggregate([
    { $unwind: "$lineItems" },
    {
      $lookup: {
        from: "products",
        localField: "lineItems.product.id",
        foreignField: "id",
        as: "productData"
      }
    },
    { $unwind: "$productData" },
    {
      $lookup: {
        from: "customers",
        localField: "customer.id",
        foreignField: "id",
        as: "customerData"
      }
    },
    { $unwind: "$customerData" },
    {
      $match: {
        "customerData.numberOfOrders": { $gt: 1 }
      }
    },
    {
      $group: {
        _id: {
          productId: "$productData.id",
          productTitle: "$productData.title"
        },
        repeatCustomers: { $addToSet: "$customer.id" }
      }
    },
    {
      $project: {
        productId: "$_id.productId",
        productTitle: "$_id.productTitle",
        repeatCustomersCount: { $size: "$repeatCustomers" }
      }
    }
  ]);
  return totalCustomers.map((total) => {
    const repeat = repeatCustomersByProduct.find((r) => r.productId === total.productId);
    const repeatCustomersCount = repeat ? repeat.repeatCustomersCount : 0;
    return {
      productId: total.productId,
      productTitle: total.productTitle,
      totalCustomersCount: total.totalCustomersCount,
      repeatCustomersCount: repeatCustomersCount,
      repeatRate: (repeatCustomersCount / total.totalCustomersCount) * 100
    };
  });
};



export const calculateCustomerStickiness = async () => {
  try {
    // Step 1: Extract customerId and createdAt date from Orders
    const customerOrders = await Order.aggregate([
      {
        $match: {
          'customer.id': { $ne: null },
          createdAt: { $exists: true }
        }
      },
      {
        $project: {
          customerId: "$customer.id",
          createdAt: 1
        }
      },
      {
        $sort: {
          customerId: 1,
          createdAt: 1
        }
      },
      {
        $group: {
          _id: "$customerId",
          orders: {
            $push: {
              createdAt: "$createdAt"
            }
          }
        }
      },
      {
        $unwind: {
          path: "$orders",
          includeArrayIndex: "orderSequence"
        }
      },
      {
        $addFields: {
          orderSequence: {
            $add: [1, "$orderSequence"] // Convert zero-based index to one-based
          },
          createdAt: "$orders.createdAt" // Retain the createdAt date for each order
        }
      },
      {
        $project: {
          customerId: "$_id",
          orderSequence: 1,
          createdAt: 1
        }
      }
    ]);

    // Step 2: Count the number of customers at each order sequence level
    const stickinessCounts = customerOrders.reduce((acc, item) => {
      const { orderSequence, customerId } = item;
      if (orderSequence <= 10 && customerId) {
        if (!acc[orderSequence]) acc[orderSequence] = new Set();
        acc[orderSequence].add(customerId);
      }
      return acc;
    }, {});

    // Convert to array format for easier processing
    const stickinessData = Object.entries(stickinessCounts).map(([orderSequence, customerSet]) => ({
      orderSequence: parseInt(orderSequence, 10),
      numberOfCustomers: customerSet.size
    }));

    // Return the stickiness data
    return { stickinessData };

  } catch (error) {
    console.error("Error calculating customer stickiness:", error);
    throw new Error("Failed to calculate customer stickiness.");
  }
};



export const getRetentionCurve = async () => {
  try {
    const orders = await Order.aggregate([
      {
        $match: {
          customer: { $ne: null }, 
        },
      },
      {
        $sort: {
          'customer.id': 1,
          createdAt: 1, 
        },
      },
    ]);
    if (orders.length === 0) return [];
    const firstPurchaseMap = new Map();
    orders.forEach(order => {
      const customerId = order.customer.id;
      if (!firstPurchaseMap.has(customerId)) {
        firstPurchaseMap.set(customerId, order.createdAt);
      }
    });
    const retentionData = [];
    orders.forEach(order => {
      const customerId = order.customer.id;
      const firstPurchaseDate = firstPurchaseMap.get(customerId);
      const daysSinceFirstPurchase = Math.floor((order.createdAt - firstPurchaseDate) / (1000 * 60 * 60 * 24)); 
      const orderSequence = retentionData.filter(data => data.customerId === customerId).length + 1;

      retentionData.push({
        customerId,
        daysSinceFirstPurchase,
        orderSequence,
      });
    });
    const retentionRates = {};
    const firstOrderCount = Array.from(firstPurchaseMap.keys()).length; 

    retentionData.forEach(data => {
      const key = `${data.orderSequence}_${data.daysSinceFirstPurchase}`;
      if (!retentionRates[key]) retentionRates[key] = 0;
      retentionRates[key] += 1;
    });
    const result = [];
    Object.keys(retentionRates).forEach(key => {
      const [orderSequence, daysSinceFirstPurchase] = key.split('_').map(Number);
      const retentionRate = (retentionRates[key] / firstOrderCount) * 100;

      result.push({
        orderSequence,
        daysSinceFirstPurchase,
        retentionRate,
      });
    });
    result.sort((a, b) => {
      if (a.orderSequence === b.orderSequence) {
        return a.daysSinceFirstPurchase - b.daysSinceFirstPurchase;
      }
      return a.orderSequence - b.orderSequence;
    });
    return result;
  } catch (error) {
    console.error('Error in getRetentionCurve:', error);
    throw new Error('Error analyzing customer retention');
  }
};


  

export const getRetentionChart = async (period) => {
    try {
      const validPeriods = ['daily', 'weekly', 'monthly'];
      if (!validPeriods.includes(period)) {
        throw new Error('Invalid period specified');
      }
      const orders = await Order.aggregate([
        { $match: { customer: { $ne: null } } },
        { $sort: { 'customer.id': 1, createdAt: 1 } },
        { $group: {
          _id: { customerId: '$customer.id', date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } } },
          firstPurchaseDate: { $min: "$createdAt" }
        }}
      ]);
  
      if (orders.length === 0) return { status: 'success', data: [] };
  
      const cohortMap = new Map();
      orders.forEach(order => {
        const customerId = order._id.customerId;
        const firstPurchaseDate = order.firstPurchaseDate.toISOString().slice(0, 10); // "YYYY-MM-DD"
        if (!cohortMap.has(customerId)) {
          cohortMap.set(customerId, firstPurchaseDate);
        }
      });
  
      const retentionData = [];
      for (const [customerId, cohort] of cohortMap.entries()) {
        const customerOrders = await Order.find({ 'customer.id': customerId }).sort({ createdAt: 1 });
  
        customerOrders.forEach(order => {
          const orderDate = new Date(order.createdAt);
          let periodKey;
  
          switch (period) {
            case 'daily':
              periodKey = orderDate.toISOString().slice(0, 10); // "YYYY-MM-DD"
              break;
            case 'weekly':
              periodKey = `${orderDate.getFullYear()}-W${Math.ceil(orderDate.getDate() / 7)}`;
              break;
            case 'monthly':
              periodKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
              break;
          }
  
          retentionData.push({ cohort, periodKey, customerId });
        });
      }
  
      const periodGroups = {};
  
      retentionData.forEach(data => {
        const { cohort, periodKey } = data;
        if (!periodGroups[cohort]) {
          periodGroups[cohort] = {};
        }
        if (!periodGroups[cohort][periodKey]) {
          periodGroups[cohort][periodKey] = 0;
        }
        periodGroups[cohort][periodKey] += 1;
      });
  
      const retentionTable = {};
      Object.keys(periodGroups).forEach(cohort => {
        const cohortSize = periodGroups[cohort][Object.keys(periodGroups[cohort])[0]] || 0;
        retentionTable[cohort] = {};
  
        Object.keys(periodGroups[cohort]).forEach(periodKey => {
          const retentionRate = (periodGroups[cohort][periodKey] / cohortSize) * 100;
          retentionTable[cohort][periodKey] = retentionRate.toFixed(2);
        });
      });
  
      return { status: 'success', data: retentionTable };
  
    } catch (error) {
      console.error('Error in getRetentionChart:', error);
      throw new Error('Error generating retention chart');
    }
  };
  
  
  
  
  


  export const getCityBreakdown = async () => {
    try {
      const now = new Date();
      const cityCohorts = await Order.aggregate([
        {
          $match: {
            'shippingAddress.city': { $ne: null } 
          }
        },
        {
          $group: {
            _id: '$shippingAddress.city',
            totalCustomers: { $sum: 1 },
            customers: { 
              $push: {
                customerId: '$customer.id', 
                firstOrderDate: '$createdAt' 
              }
            }
          }
        }
      ]);
      const orders = await Order.aggregate([
        {
          $match: {
            'shippingAddress.city': { $ne: null }  
          }
        },
        {
          $project: {
            customerId: '$customer.id',
            createdAt: '$createdAt',
            shippingCity: '$shippingAddress.city'
          }
        }
      ]);
      const orderMap = {};
      orders.forEach(order => {
        if (!orderMap[order.customerId]) {
          orderMap[order.customerId] = [];
        }
        orderMap[order.customerId].push(order);
      });
      const retentionData = cityCohorts.map(cohort => {
        const { _id: city, totalCustomers, customers } = cohort;
        const customersMap = new Map(customers.map(c => [c.customerId, c.firstOrderDate]));
  
        const retentionRates = [30, 60, 90].map(days => {
          const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
          let repeatCustomersCount = 0;
  
          customers.forEach(({ customerId, firstOrderDate }) => {
            const customerOrders = orderMap[customerId] || [];
            const repeatPurchases = customerOrders.filter(order => 
              new Date(order.createdAt) > startDate && new Date(order.createdAt) > new Date(firstOrderDate)
            ).length;
  
            if (repeatPurchases > 0) {
              repeatCustomersCount += 1;
            }
          });
  
          return {
            days,
            rate: (repeatCustomersCount / totalCustomers) * 100
          };
        });
  
        return {
          city,
          totalCustomers,
          retentionRates
        };
      });
  
      return { cities: retentionData };
    } catch (error) {
      throw error;
    }
  };
  
  export const getRegionBreakdown = async () => {
    try {
      const now = new Date();
  
      // Step 1: Extract customer addresses and group by state, excluding null states
      const customers = await Customer.aggregate([
        {
          $unwind: '$addresses'
        },
        {
          $match: {
            'addresses.province': { $ne: null }  // Exclude null states
          }
        },
        {
          $group: {
            _id: {
              customerId: '$id',
              state: '$addresses.province'
            },
            firstOrderDate: { $min: '$createdAt' }  // Assuming first order date can be taken from the customer creation date
          }
        }
      ]);
  
      // Step 2: Extract all orders and their details
      const orders = await Order.aggregate([
        {
          $project: {
            customerId: '$customer.id',
            createdAt: '$createdAt'
          }
        }
      ]);
  
      // Convert orders to a more usable format for further processing
      const orderMap = {};
      orders.forEach(order => {
        if (!orderMap[order.customerId]) {
          orderMap[order.customerId] = [];
        }
        orderMap[order.customerId].push(order.createdAt);
      });
  
      // Step 3: Calculate retention rates for each region cohort
      const retentionData = customers.reduce((acc, customer) => {
        const { _id: { state }, customerId, firstOrderDate } = customer;
        const stateData = acc[state] || { totalCustomers: 0, customers: [] };
  
        stateData.totalCustomers += 1;
        stateData.customers.push({ customerId, firstOrderDate });
  
        acc[state] = stateData;
        return acc;
      }, {});
  
      const result = Object.entries(retentionData).map(([state, data]) => {
        const { totalCustomers, customers } = data;
  
        const retentionRates = [30, 60, 90].map(days => {
          const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  
          // Count the number of customers who made repeat purchases within the given time period
          let repeatCustomersCount = 0;
  
          customers.forEach(({ customerId, firstOrderDate }) => {
            const customerOrders = orderMap[customerId] || [];
            const repeatPurchases = customerOrders.filter(orderDate =>
              new Date(orderDate) > startDate && new Date(orderDate) > new Date(firstOrderDate)
            ).length;
  
            if (repeatPurchases > 0) {
              repeatCustomersCount += 1;
            }
          });
  
          const retentionRate = (repeatCustomersCount / totalCustomers) * 100;
  
          return {
            days,
            rate: retentionRate.toFixed(2)  // Round to two decimal places
          };
        });
  
        return {
          state,
          totalCustomers,
          retentionRates
        };
      });
  
      return { regions: result };
    } catch (error) {
      throw error;
    }
  };
  



export const getProductTitleBreakdown = async () => {
  try {
    const now = new Date();

    // Step 1: Extract orders and group by customer and product title
    const orders = await Order.aggregate([
      { $unwind: '$lineItems' },
      {
        $group: {
          _id: {
            customerId: '$customer.id',
            productTitle: '$lineItems.title'
          },
          firstOrderDate: { $min: '$createdAt' }
        }
      }
    ]);

    // Step 2: Group by product title and gather customers
    const productData = orders.reduce((acc, { _id: { productTitle }, customerId, firstOrderDate }) => {
      if (!acc[productTitle]) {
        acc[productTitle] = { totalCustomers: 0, customers: [] };
      }

      acc[productTitle].totalCustomers += 1;
      acc[productTitle].customers.push({ customerId, firstOrderDate });

      return acc;
    }, {});

    // Step 3: Extract all orders and map them
    const orderEntries = await Order.aggregate([
      { $unwind: '$lineItems' },
      {
        $project: {
          customerId: '$customer.id',
          createdAt: '$createdAt',
          productTitle: '$lineItems.title'
        }
      }
    ]);

    const orderMap = {};
    orderEntries.forEach(({ customerId, createdAt, productTitle }) => {
      if (!orderMap[customerId]) {
        orderMap[customerId] = [];
      }
      orderMap[customerId].push({ createdAt, productTitle });
    });

    // Step 4: Calculate retention rates for each product title cohort
    const result = Object.entries(productData).map(([productTitle, data]) => {
      const { totalCustomers, customers } = data;

      const retentionRates = [30, 60, 90].map(days => {
        const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

        // Count the number of customers who made repeat purchases within the given time period
        let repeatCustomersCount = 0;

        customers.forEach(({ customerId, firstOrderDate }) => {
          const customerOrders = orderMap[customerId] || [];
          const repeatPurchases = customerOrders.filter(order =>
            new Date(order.createdAt) > startDate && new Date(order.createdAt) > new Date(firstOrderDate) &&
            order.productTitle === productTitle
          ).length;

          if (repeatPurchases > 0) {
            repeatCustomersCount += 1;
          }
        });

        const retentionRate = (repeatCustomersCount / totalCustomers) * 100;

        return {
          days,
          rate: retentionRate.toFixed(2) // Round to two decimal places
        };
      });

      return {
        productTitle,
        totalCustomers,
        retentionRates
      };
    });

    return { products: result };
  } catch (error) {
    throw error;
  }
};


export const getAovBreakdown = async () => {
  try {
    const now = new Date();

    // Step 1: Extract all orders and group by customer and calculate AOV
    const customerFirstOrders = await Order.aggregate([
      { $sort: { createdAt: 1 } }, // Sort by date to get the first order
      { $group: {
        _id: '$customer.id',
        firstOrderDate: { $first: '$createdAt' },
        firstOrderTotalPrice: { $first: { $toDouble: '$totalPrice' } } // Ensure totalPrice is numeric
      }}
    ]);

    // Step 2: Define AOV ranges and categorize customers
    const aovRanges = {
      Low: { min: 0, max: 50 },
      Medium: { min: 50, max: 150 },
      High: { min: 150, max: Infinity }
    };

    const aovCohorts = {
      Low: { totalCustomers: 0, customers: [] },
      Medium: { totalCustomers: 0, customers: [] },
      High: { totalCustomers: 0, customers: [] }
    };

    customerFirstOrders.forEach(({ _id: customerId, firstOrderDate, firstOrderTotalPrice }) => {
      let cohort;
      if (firstOrderTotalPrice < aovRanges.Low.max) {
        cohort = 'Low';
      } else if (firstOrderTotalPrice <= aovRanges.Medium.max) {
        cohort = 'Medium';
      } else {
        cohort = 'High';
      }
      
      aovCohorts[cohort].totalCustomers += 1;
      aovCohorts[cohort].customers.push({ customerId, firstOrderDate });
    });

    // Step 3: Extract all orders and map them
    const allOrders = await Order.aggregate([
      { $project: { customerId: '$customer.id', createdAt: '$createdAt', totalPrice: { $toDouble: '$totalPrice' } } }
    ]);

    const orderMap = {};
    allOrders.forEach(({ customerId, createdAt }) => {
      if (!orderMap[customerId]) {
        orderMap[customerId] = [];
      }
      orderMap[customerId].push({ createdAt });
    });

    // Step 4: Calculate retention rates for each AOV cohort
    const result = Object.entries(aovCohorts).map(([cohort, data]) => {
      const { totalCustomers, customers } = data;

      const retentionRates = [30, 60, 90].map(days => {
        if (totalCustomers === 0) {
          return {
            days,
            rate: 0 // If there are no customers, retention rate is 0%
          };
        }

        const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

        // Count the number of customers who made repeat purchases within the given time period
        let repeatCustomersCount = 0;

        customers.forEach(({ customerId, firstOrderDate }) => {
          const customerOrders = orderMap[customerId] || [];
          const repeatPurchases = customerOrders.filter(order =>
            new Date(order.createdAt) > startDate && new Date(order.createdAt) > new Date(firstOrderDate)
          ).length;

          if (repeatPurchases > 0) {
            repeatCustomersCount += 1;
          }
        });

        const retentionRate = (repeatCustomersCount / totalCustomers) * 100;

        return {
          days,
          rate: retentionRate.toFixed(2) // Round to two decimal places
        };
      });

      return {
        cohort,
        totalCustomers,
        retentionRates
      };
    });

    return { aovSegments: result };
  } catch (error) {
    throw error;
  }
};



export const calculateLTV = async () => {
    // Step 1: Calculate Average Order Value (AOV)
    const totalOrderValue = await Order.aggregate([
        { $group: { _id: null, totalPriceSum: { $sum: { $toDouble: "$totalPrice"} }, orderCount: { $sum: 1 } } }
    ]);
    console.log(`totalOrderValue ${totalOrderValue}`);
    

    // Handle cases where no orders are found
    const AOV = totalOrderValue.length > 0 ? totalOrderValue[0].totalPriceSum / totalOrderValue[0].orderCount : 0;
    console.log(AOV , "aov");

    // Step 2: Calculate Purchase Frequency
    const orderCount = await Order.countDocuments();
    const customerCount = await Customer.countDocuments();
    const purchaseFrequency = customerCount > 0 ? orderCount / customerCount : 0;
    console.log(purchaseFrequency , "purchaseFrequency");

    // Step 3: Calculate Customer Lifespan
    const customers = await Customer.find().lean();
    let totalLifespan = 0;

    for (const customer of customers) {
        const firstOrder = await Order.findOne({ customerId: customer._id }).sort({ createdAt: 1 });
        console.log(customer);
        
        // console.log(firstOrder);
        
        const lastOrder = await Order.findOne({ customerId: customer._id }).sort({ createdAt: -1 });
// console.log(`firstOrder ${firstOrder}`);
// console.log(`lastOrder ${lastOrder}`);
        if (firstOrder && lastOrder) {
            const lifespan = (lastOrder.createdAt - firstOrder.createdAt) / (1000 * 60 * 60 * 24); // lifespan in days
            totalLifespan += lifespan;
        }
    }
    const averageLifespan = customers.length > 0 ? totalLifespan / customers.length : 0;
    console.log(averageLifespan , "averageLifespan");

    // Step 4: Calculate Gross Margin
    const totalSales = await Order.aggregate([
        { $group: { _id: null, totalSales: { $sum: {$toDouble:"$totalPrice"} } } }
    ]);

    // Handle cases where no sales are found
    const totalSalesValue = totalSales.length > 0 ? totalSales[0].totalSales : 0;
    console.log(totalSalesValue , "totalSalesValue");

    const totalCOGS = await Order.aggregate([
        { $unwind: "$lineItems" },
        {
            $lookup: {
                from: "products",
                localField: "lineItems.productId",
                foreignField: "_id",
                as: "productDetails"
            }
        },
        { $unwind: "$productDetails" },
        {
            $group: {
                _id: null,
                totalCOGS: { $sum: { $multiply: ["$productDetails.cost_price", "$lineItems.quantity"] } }
            }
        }
    ]);

    // Handle cases where no COGS data is found
    const totalCOGSValue = totalCOGS.length > 0 ? totalCOGS[0].totalCOGS : 0;

    // Avoid division by zero in gross margin calculation
    const grossMargin = totalSalesValue > 0 ? (totalSalesValue - totalCOGSValue) / totalSalesValue : 0;
    console.log(grossMargin , "grossMargin");

    // Step 5: Calculate LTV
    const LTV = AOV * purchaseFrequency * averageLifespan * grossMargin;

    return LTV;
};







  
