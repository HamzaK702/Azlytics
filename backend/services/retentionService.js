import Order from "../models/BulkTables/BulkOrder/order.js";
import Customer from "../models/BulkTables/BulkCustomer/customer.js";
import Product from "../models/BulkTables/BulkProduct/product.js";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';

export const calculateRepeatRateByCity = async () => {
  // Calculate total customers by city
  const totalCustomersByCity = await Order.aggregate([
    {
      $match: {
        customer: { $ne: null },  // Skip orders where customer is null
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

  // Calculate repeat customers by city
  const repeatCustomersByCity = await Order.aggregate([
    {
      $match: {
        customer: { $ne: null },  // Skip orders where customer is null
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

  // Calculate repeat rate by city
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
  // Step 1: Flatten line items with SKU from Product model
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
        sku: "$productData.variants.sku"
      }
    }
  ]);

  // Total number of customers who purchased each product (SKU)
  const totalCustomersBySKU = flattenedLineItems.reduce((acc, item) => {
    if (!acc[item.sku]) acc[item.sku] = new Set();
    acc[item.sku].add(item.customerId);
    return acc;
  }, {});

  // Convert to an array format for easier processing
  const totalCustomers = Object.entries(totalCustomersBySKU).map(([sku, customerSet]) => ({
    SKU: sku,
    totalCustomers: customerSet.size
  }));

  // Number of repeat customers who purchased each product
  const repeatCustomersBySKU = await Order.aggregate([
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
        _id: "$productData.variants.sku",
        repeatCustomers: { $addToSet: "$customer.id" }
      }
    },
    {
      $project: {
        SKU: "$_id",
        repeatCustomers: { $size: "$repeatCustomers" }
      }
    }
  ]);

  // Convert to an array format for easier processing
  const repeatCustomers = repeatCustomersBySKU.map(({ SKU, repeatCustomers }) => ({
    SKU,
    repeatCustomers
  }));

  // Calculate repeat rate by SKU
  return totalCustomers.map((total) => {
    const repeat = repeatCustomers.find((r) => r.SKU === total.SKU);
    const repeatCustomersCount = repeat ? repeat.repeatCustomers : 0;
    return {
      SKU: total.SKU,
      totalCustomers: total.totalCustomers,
      repeatCustomers: repeatCustomersCount,
      repeatRate: (repeatCustomersCount / total.totalCustomers) * 100
    };
  });
};



export const calculateCustomerStickiness = async () => {
    // Step 1: Extract customer orders with sequence numbers
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
  
    // Debugging: Log customerOrders to verify results
    console.log("Customer Orders:", customerOrders);
  
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
  
    // Debugging: Log stickinessData to verify results
    console.log("Stickiness Data:", stickinessData);
  
    return {
      stickinessData,
      customerOrders // Include customerOrders with createdAt and customerId
    };
  };


  export const getRetentionCurve = async () => {
    try {
      const orders = await Order.aggregate([
        {
          $match: {
            customer: { $ne: null } 
          }
        },
        {
          $sort: {
            'customer.id': 1, 
            createdAt: 1 
          }
        }
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
        const retentionRate = (retentionRates[key] / firstOrderCount) * 100; // Calculate percentage
  
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
  
      // Step 2: Get all orders and their details
      const orders = await Order.aggregate([
        {
          $project: {
            customerId: '$customer.id',
            createdAt: '$createdAt',
            shippingCity: '$shippingAddress.city'
          }
        }
      ]);
  
      // Convert orders to a more usable format for further processing
      const orderMap = {};
      orders.forEach(order => {
        if (!orderMap[order.customerId]) {
          orderMap[order.customerId] = [];
        }
        orderMap[order.customerId].push(order);
      });
  
      // Step 3: Calculate retention rates for each city cohort
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
  
      // Step 1: Extract customer addresses and group by state
      const customers = await Customer.aggregate([
        {
          $unwind: '$addresses'
        },
        {
          $group: {
            _id: {
              customerId: '$id',
              state: '$addresses.province'
            },
            firstOrderDate: { $min: '$createdAt' } // Assuming first order date can be taken from the customer creation date
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
            rate: retentionRate.toFixed(2) // Round to two decimal places
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



  
