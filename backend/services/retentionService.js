import Order from "../models/BulkTables/BulkOrder/order.js";
import Customer from "../models/BulkTables/BulkCustomer/customer.js";
import aggregateTotalSales from "./salesService.js";
import { calculateCOGS } from "./ordersService.js";
import Product from "../models/BulkTables/BulkProduct/product.js";
import { startOfWeek, endOfWeek,format, startOfMonth, endOfMonth,subMonths, startOfDay, endOfDay,subDays, differenceInDays, formatDate  } from 'date-fns';

export const calculateRepeatRateByCity = async () => {
  // Fetch total customers by city
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

  // Fetch repeat customers by city
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

  // Prepare cityData and calculate repeatRateConversion
  const cityData = totalCustomersByCity.map((total) => {
    const repeat = repeatCustomersByCity.find((r) => r.city === total.city);
    const repeatCustomers = repeat ? repeat.repeatCustomers : 0;
    
    return {
      name: total.city,
      volume: total.totalCustomers
    };
  }).sort((a, b) => b.volume - a.volume); // Sort in descending order of volume

  // Calculate repeatRateConversion
  const totalRepeatCustomers = repeatCustomersByCity.reduce((sum, city) => sum + city.repeatCustomers, 0);
  const totalCustomers = totalCustomersByCity.reduce((sum, city) => sum + city.totalCustomers, 0);

  const repeatRateConversion = totalCustomers > 0 ? (totalRepeatCustomers / totalCustomers) * 100 : 0;

  // Return the response in the desired format
  return {
    cityData,
    repeatRateConversion: parseFloat(repeatRateConversion.toFixed(2)) // Limit to 2 decimal points
  };
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
  // Flatten line items and associate with product and customer details
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

  // Calculate total customers for each product
  const totalCustomersByProduct = flattenedLineItems.reduce((acc, item) => {
    const productKey = `${item.productId}-${item.productTitle}`;
    if (!acc[productKey]) acc[productKey] = new Set();
    acc[productKey].add(item.customerId);
    return acc;
  }, {});

  // Map total customers for each product to a new structure
  const totalCustomers = Object.entries(totalCustomersByProduct).map(([productKey, customerSet]) => {
    const [productId, productTitle] = productKey.split("-");
    return {
      name: productTitle,
      volume: customerSet.size
    };
  });

  // Sort products by volume in descending order
  return totalCustomers.sort((a, b) => b.volume - a.volume);
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

// LTV Calculation Logic
export const calculateLTV = async (filter) => {
  // Step 1: Define date filter
  const dateFilter = subDays(new Date(), filter);
  console.log(`Date filter: Orders since ${dateFilter}`);

  // Step 2: Calculate Average Order Value (AOV) for orders within the filter range
  const totalOrderValue = await Order.aggregate([
      { $match: { createdAt: { $gte: dateFilter } } },
      { $group: { _id: null, totalPriceSum: { $sum: { $toDouble: "$totalPrice" } }, orderCount: { $sum: 1 } } },
  ]);
  console.log(`Total order value: ${JSON.stringify(totalOrderValue)}`);

  const AOV = totalOrderValue.length > 0 ? totalOrderValue[0].totalPriceSum / totalOrderValue[0].orderCount : 0;
  console.log(`AOV: ${AOV}`);

  // Step 3: Calculate Purchase Frequency
  const orderCount = await Order.countDocuments({ createdAt: { $gte: dateFilter } });
  console.log(`Order count: ${orderCount}`);

  const customerCount = await Customer.countDocuments({ createdAt: { $gte: dateFilter } });
  console.log(`Customer count: ${customerCount}`);

  const purchaseFrequency = customerCount > 0 ? orderCount / customerCount : 0;
  console.log(`Purchase frequency: ${purchaseFrequency}`);

  // Step 4: Calculate Customer Lifespan (for all customers in the filter)
  const customers = await Customer.find({ createdAt: { $gte: dateFilter } }).lean();
  console.log(`Customers in the filter: ${customers.length}`);

  let totalLifespan = 0;
  for (const customer of customers) {
      const firstOrder = await Order.findOne({ customerId: customer._id }).sort({ createdAt: 1 });
      const lastOrder = await Order.findOne({ customerId: customer._id }).sort({ createdAt: -1 });

      if (firstOrder && lastOrder) {
          const lifespan = (lastOrder.createdAt - firstOrder.createdAt) / (1000 * 60 * 60 * 24); // lifespan in days
          totalLifespan += lifespan;
      }
  }

  const averageLifespan = customers.length > 0 ? totalLifespan / customers.length : 0;
  console.log(`Average lifespan: ${averageLifespan}`);

  // Step 5: Calculate Gross Margin
  const totalSales = await Order.aggregate([
      { $match: { createdAt: { $gte: dateFilter } } },
      { $group: { _id: null, totalSales: { $sum: { $toDouble: "$totalPrice" } } } },
  ]);
  const totalSalesValue = totalSales.length > 0 ? totalSales[0].totalSales : 0;
  console.log(`Total sales value: ${totalSalesValue}`);

  const totalCOGS = await Order.aggregate([
      { $unwind: "$lineItems" },
      {
          $lookup: {
              from: "products",
              localField: "lineItems.productId",
              foreignField: "_id",
              as: "productDetails",
          },
      },
      { $unwind: "$productDetails" },
      {
          $group: {
              _id: null,
              totalCOGS: { $sum: { $multiply: ["$productDetails.cost_price", "$lineItems.quantity"] } },
          },
      },
  ]);
  const totalCOGSValue = totalCOGS.length > 0 ? totalCOGS[0].totalCOGS : 0;
  const grossMargin = totalSalesValue > 0 ? (totalSalesValue - totalCOGSValue) / totalSalesValue : 0;
  console.log(`Gross margin: ${grossMargin}`);

  // Step 6: Calculate LTV
  const overallLTV = AOV * purchaseFrequency * averageLifespan * grossMargin;
  console.log(`Overall LTV: ${overallLTV}`);

  // Step 7: Categorize by "New" and "Old" customers
  const newCustomersCount = await Customer.countDocuments({ createdAt: { $gte: dateFilter } });
  const oldCustomersCount = await Customer.countDocuments({ createdAt: { $lt: dateFilter } });
  console.log(`New customers count: ${newCustomersCount}`);
  console.log(`Old customers count: ${oldCustomersCount}`);

  const newCustomerLTV = overallLTV * (newCustomersCount / (newCustomersCount + oldCustomersCount));
  const oldCustomerLTV = overallLTV * (oldCustomersCount / (newCustomersCount + oldCustomersCount));
  console.log(`New customer LTV: ${newCustomerLTV}`);
  console.log(`Old customer LTV: ${oldCustomerLTV}`);

  // Step 8: Return response based on categories
  return [
      { category: "overall", price: overallLTV },
      { category: "new", price: newCustomerLTV },
      { category: "old", price: oldCustomerLTV },
  ];
};
const getDateRangeByDays = (filter) => {
  const now = new Date();
  const startDate = subDays(now, filter);
  const endDate = now;
  return { startDate, endDate };
};

const calculateRepeatPurchases = async (startDate, endDate) => {
  const repeatPurchases = await Order.aggregate([
    {
      $match: {
        processedAt: { $gte: startDate, $lte: endDate },
        customer: { $ne: null },
      },
    },
    {
      $group: {
        _id: "$customer.id",
        purchases: { $sum: 1 },
      },
    },
    {
      $sort: { purchases: 1 },
    },
  ]);

  return repeatPurchases;
};

export const calculateRepeatPurchaseRate = async (filter) => {
  const { startDate, endDate } = getDateRangeByDays(filter);
  
  const repeatPurchases = await calculateRepeatPurchases(startDate, endDate);
  
  const totalCustomers = repeatPurchases.length;
  
  const purchaseRanges = [1, 2, 3, 4, 5, 6]; 
  const result = [];

  purchaseRanges.forEach((range) => {
    const currentRangePurchases = repeatPurchases.filter((p) => p.purchases === range).length;
    const nextRangePurchases = repeatPurchases.filter((p) => p.purchases === range + 1).length;

    const nonPurchases = currentRangePurchases - nextRangePurchases;

    const purchaseConversion = currentRangePurchases > 0 ? ((nextRangePurchases / currentRangePurchases) * 100).toFixed(2) + "%" : "0%";
    const nonPurchaseDropOff = currentRangePurchases > 0 ? ((nonPurchases / currentRangePurchases) * 100).toFixed(2) + "%" : "0%";

    let label;
    switch (range) {
      case 1:
        label = "1st to 2nd";
        break;
      case 2:
        label = "2nd to 3rd";
        break;
      case 3:
        label = "3rd to 4th";
        break;
      case 4:
        label = "4th to 5th";
        break;
      case 5:
        label = "5th to 6th";
        break;
      case 6:
        label = "6th to 7th";
        break;
      default:
        label = `${range}th to ${range + 1}th`;
    }

    result.push({
      label: label,
      purchases: currentRangePurchases,
      nonPurchases: nonPurchases,
      purchaseConversion: purchaseConversion,
      nonPurchaseDropOff: nonPurchaseDropOff,
    });
  });

  return result;
};
const getCurrentAndPreviousDateRanges = (filter) => {
  const now = new Date();
  const startDateCurrent = subDays(now, filter);
  const endDateCurrent = now;

  const startDatePrevious = subDays(startDateCurrent, filter);
  const endDatePrevious = subDays(startDateCurrent, 1); 

  return {
    current: { startDate: startDateCurrent, endDate: endDateCurrent },
    previous: { startDate: startDatePrevious, endDate: endDatePrevious },
  };
};

export const calculateRepeatPurchaseRateCompare = async (filter) => {
  const { current, previous } = getCurrentAndPreviousDateRanges(filter);
  console.log(`Calculating Repeat Purchase Rate Compare:
    Current Period: ${current.startDate} to ${current.endDate}
    Previous Period: ${previous.startDate} to ${previous.endDate}`);

  const currentPeriodPurchases = await calculateRepeatPurchases(current.startDate, current.endDate);
  const previousPeriodPurchases = await calculateRepeatPurchases(previous.startDate, previous.endDate);

  console.log(`Current Period Purchases: ${currentPeriodPurchases.length}`);
  console.log(`Previous Period Purchases: ${previousPeriodPurchases.length}`);

  const purchaseRanges = [1, 2, 3, 4, 5, 6];
  const comparisonData = [];

  purchaseRanges.forEach((range) => {
    const currentRangePurchases = currentPeriodPurchases.filter((p) => p.purchases === range).length;
    const currentNextRangePurchases = currentPeriodPurchases.filter((p) => p.purchases === range + 1).length;
    const currentNonPurchases = currentRangePurchases - currentNextRangePurchases;

    const previousRangePurchases = previousPeriodPurchases.filter((p) => p.purchases === range).length;
    const previousNextRangePurchases = previousPeriodPurchases.filter((p) => p.purchases === range + 1).length;
    const previousNonPurchases = previousRangePurchases - previousNextRangePurchases;

    const purchaseConversion = currentRangePurchases > 0 ? ((currentNextRangePurchases / currentRangePurchases) * 100).toFixed(2) + "%" : "0%";
    const nonPurchaseDropOff = currentRangePurchases > 0 ? ((currentNonPurchases / currentRangePurchases) * 100).toFixed(2) + "%" : "0%";

    const previousPurchaseConversion = previousRangePurchases > 0 ? ((previousNextRangePurchases / previousRangePurchases) * 100).toFixed(2) + "%" : "0%";
    const previousNonPurchaseDropOff = previousRangePurchases > 0 ? ((previousNonPurchases / previousRangePurchases) * 100).toFixed(2) + "%" : "0%";

    let label;
    switch (range) {
      case 1:
        label = "1st to 2nd";
        break;
      case 2:
        label = "2nd to 3rd";
        break;
      case 3:
        label = "3rd to 4th";
        break;
      case 4:
        label = "4th to 5th";
        break;
      case 5:
        label = "5th to 6th";
        break;
      case 6:
        label = "6th to 7th";
        break;
      default:
        label = `${range}th to ${range + 1}th`;
    }

    comparisonData.push({
      label: label,
      purchases: currentRangePurchases,
      nonPurchases: currentNonPurchases,
      previousPurchases: previousRangePurchases,
      previousNonPurchases: previousNonPurchases,
      purchaseConversion: purchaseConversion,
      previousPurchaseConversion: previousPurchaseConversion,
      nonPurchaseDropOff: nonPurchaseDropOff,
      previousNonPurchaseDropOff: previousNonPurchaseDropOff,
    });
  });

  console.log("Comparison Data:", comparisonData);

  return comparisonData;
};


export const calculateTimeBetweenOrders = async (filter) => {
  const dateFilter = subDays(new Date(), filter);
  console.log(`Date filter: Orders since ${dateFilter}`);

  const orders = await Order.aggregate([
    { $match: { createdAt: { $gte: dateFilter } } },
    { $sort: { createdAt: 1 } }, 
    { $group: { _id: "$customer.id", orders: { $push: "$createdAt" } } },
  ]);

  const timeIntervals = [];
  
  orders.forEach((order) => {
    if (order.orders.length > 1) {
      for (let i = 1; i < order.orders.length; i++) {
        const timeDifference = (order.orders[i] - order.orders[i - 1]) / (1000 * 60 * 60 * 24); 
        timeIntervals.push(timeDifference);
      }
    }
  });

  if (timeIntervals.length === 0) {
    return [];
  }

  const calculateMean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const calculateMedian = (arr) => {
    const sorted = arr.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  const timeStats = [];
  
  for (let i = 1; i < 7; i++) {
    const intervalsForStage = timeIntervals.filter((_, index) => index % i === 0); 
    if (intervalsForStage.length > 0) {
      timeStats.push({
        label: `${i}st to ${i + 1}nd`,
        mean: calculateMean(intervalsForStage),
        median: calculateMedian(intervalsForStage),
      });
    }
  }

  return timeStats;
};

export const calculateAveragePerOrder = async (filter) => {
  const dateFilter = subDays(new Date(), filter);
  console.log(`Date filter: Orders since ${dateFilter}`);

  const orders = await Order.aggregate([
    { $match: { createdAt: { $gte: dateFilter } } },
    { $sort: { createdAt: 1 } }, 
    { $group: { _id: "$customer.id", orders: { $push: { totalPrice: { $toDouble: "$totalPrice" }, createdAt: "$createdAt" } } } },
  ]);

  const aggregatedData = {};

  orders.forEach((order) => {
    if (order.orders.length > 1) {
      for (let i = 1; i < order.orders.length; i++) {
        let totalOrderValue = order.orders[i].totalPrice;

        if (totalOrderValue < 1) {
          totalOrderValue *= 100; 
        }

        const label = `${i}${getOrdinalSuffix(i)} to ${i + 1}${getOrdinalSuffix(i + 1)}`;

        if (!aggregatedData[label]) {
          aggregatedData[label] = { totalOrderValue: 0, orderCount: 0 };
        }

        aggregatedData[label].totalOrderValue += totalOrderValue;
        aggregatedData[label].orderCount += 1;

        console.log(`Label: ${label}, Total Order Value: ${totalOrderValue}, Order Count: ${aggregatedData[label].orderCount}`);
      }
    }
  });

  const averagesPerOrder = Object.keys(aggregatedData).map((label) => {
    const { totalOrderValue, orderCount } = aggregatedData[label];
    
    // console.log(`Final Label: ${label}, Total Value: ${totalOrderValue}, Number of Orders: ${orderCount}`);

    return {
      label: label,
      order: Math.round(totalOrderValue * 100) / 100,
      average: Math.round((totalOrderValue / orderCount) * 100) / 100, 
    };
  });

  if (averagesPerOrder.length === 0) {
    return [];
  }

  return averagesPerOrder;
};

const getOrdinalSuffix = (i) => {
  const j = i % 10,
    k = i % 100;
  if (j == 1 && k != 11) {
    return "st";
  }
  if (j == 2 && k != 12) {
    return "nd";
  }
  if (j == 3 && k != 13) {
    return "rd";
  }
  return "th";
};

export const getRFMCohunt = async (req, res) => {
  try {
    const filter = req.query.filter || "R"; // Default filter is Recency
    const now = new Date();

    if (filter === "R") {
      // Filter based on Recency
      const customers = await Customer.aggregate([
        {
          $lookup: {
            from: "orders",
            localField: "id",
            foreignField: "customer.id",
            as: "orders",
          },
        },
        {
          $addFields: {
            lastOrderDate: { $max: "$orders.createdAt" },
          },
        },
        {
          $project: {
            _id: 0,
            customerId: "$id",
            lastOrderDate: 1,
          },
        },
      ]);

      const cohorts = [
        { name: "1%", customerName: "Champions", days: 0, size: 0 },
        { name: "15%", customerName: "Loyal customers", days: 5, size: 0 },
        { name: "24%", customerName: "Potential Loyalists", days: 10, size: 0 },
        { name: "15%", customerName: "New Customers", days: 15, size: 0 },
        { name: "7%", customerName: "Promising", days: 20, size: 0 },
        { name: "5%", customerName: "Need Attention", days: 25, size: 0 },
        { name: "10%", customerName: "About to Sleep", days: 30, size: 0 },
        { name: "16%", customerName: "Can't Lose Them", days: 35, size: 0 },
        { name: "3%", customerName: "At Risk", days: 40, size: 0 },
        { name: "4%", customerName: "Hibernating", days: 45, size: 0 },
      ];

      customers.forEach((customer) => {
        const daysSinceLastOrder = Math.floor((now - new Date(customer.lastOrderDate)) / (1000 * 60 * 60 * 24));

        for (const cohort of cohorts) {
          if (daysSinceLastOrder >= cohort.days) {
            cohort.size += 1;
            break;
          }
        }
      });

      res.status(200).json({
        status: "success",
        data: cohorts,
      });

    } else if (filter === "F") {
      // Filter based on Frequency (Order count)
      const customers = await Customer.aggregate([
        {
          $lookup: {
            from: "orders",
            localField: "id",
            foreignField: "customer.id",
            as: "orders",
          },
        },
        {
          $addFields: {
            orderCount: { $size: "$orders" },
          },
        },
        {
          $project: {
            _id: 0,
            customerId: "$id",
            orderCount: 1,
          },
        },
      ]);

      const frequencyCohorts = [
        { name: "1%", customerName: "Champions", size: 0, orders: 0 },
        { name: "15%", customerName: "Loyal customers", size: 0, orders: 0 },
        { name: "24%", customerName: "Potential Loyalists", size: 0, orders: 0 },
        { name: "15%", customerName: "New Customers", size: 0, orders: 0 },
        { name: "7%", customerName: "Promising", size: 0, orders: 0 },
        { name: "5%", customerName: "Need Attention", size: 0, orders: 0 },
        { name: "10%", customerName: "About to Sleep", size: 0, orders: 0 },
        { name: "16%", customerName: "Can't Lose Them", size: 0, orders: 0 },
        { name: "3%", customerName: "At Risk", size: 0, orders: 0 },
        { name: "4%", customerName: "Hibernating", size: 0, orders: 0 },
      ];

      customers.forEach((customer) => {
        const orderCount = customer.orderCount;

        for (const cohort of frequencyCohorts) {
          if (orderCount >= cohort.orders) {
            cohort.size += 1;
            cohort.orders += orderCount;
            break;
          }
        }
      });

      res.status(200).json({
        status: "success",
        data: frequencyCohorts,
      });

    } else if (filter === "M") {
      // Filter based on Monetary (Total spending)
      const customers = await Customer.aggregate([
        {
          $lookup: {
            from: "orders",
            localField: "id",
            foreignField: "customer.id",
            as: "orders",
          },
        },
        {
          $addFields: {
            totalSpent: { $sum: "$orders.totalPrice" },
          },
        },
        {
          $project: {
            _id: 0,
            customerId: "$id",
            totalSpent: 1,
          },
        },
      ]);

      const monetaryCohorts = [
        { name: "1%", customerName: "Champions", size: 0, ltr: 0 },
        { name: "15%", customerName: "Loyal customers", size: 0, ltr: 0 },
        { name: "24%", customerName: "Potential Loyalists", size: 0, ltr: 0 },
        { name: "15%", customerName: "New Customers", size: 0, ltr: 0 },
        { name: "7%", customerName: "Promising", size: 0, ltr: 0 },
        { name: "5%", customerName: "Need Attention", size: 0, ltr: 0 },
        { name: "10%", customerName: "About to Sleep", size: 0, ltr: 0 },
        { name: "16%", customerName: "Can't Lose Them", size: 0, ltr: 0 },
        { name: "3%", customerName: "At Risk", size: 0, ltr: 0 },
        { name: "4%", customerName: "Hibernating", size: 0, ltr: 0 },
      ];

      customers.forEach((customer) => {
        const totalSpent = customer.totalSpent;

        for (const cohort of monetaryCohorts) {
          if (totalSpent >= cohort.ltr) {
            cohort.size += 1;
            cohort.ltr += totalSpent; // Increment LTR (total spent)
            break;
          }
        }
      });

      res.status(200).json({
        status: "success",
        data: monetaryCohorts,
      });
    } else {
      res.status(400).json({ status: "error", message: "Invalid filter parameter" });
    }

  } catch (error) {
    console.error("Error in RFM cohort analysis:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
};


const getDateRange = (filter, customStartDate, customEndDate) => {
  const now = new Date();
  let startDate;
  let endDate;

  switch (filter) {
    case "three_months":
      startDate = subMonths(now, 2);
      startDate.setDate(1);
      endDate = now;
      break;
    case "yesterday":
      startDate = subDays(now, 1);
      endDate = startDate;
      break;
    case "one_week":
      endDate = subDays(now, 1);
      startDate = subDays(endDate, 7);
      break;
    case "one_month":
      endDate = subDays(now, 1);
      startDate = subMonths(endDate, 1);
      break;
    case "six_months":
      startDate = subMonths(now, 6);
      endDate = now;
      break;
    case "twelve_months":
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


export const getRetentionCurveData = async ({ filter, breakdown, format, customStartDate, customEndDate }) => {
  const { startDate, endDate } = getDateRange(filter, customStartDate, customEndDate);

  let groupBy;
  let incrementFunction;

  switch (format) {
    case "day":
      groupBy = {
        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
      };
      incrementFunction = d => {
        const formattedDate = formatDate(d, 'yyyy-MM-dd');
        return { date: formattedDate, quantitySold: 0 };
      };
      break;
    case "week":
      groupBy = {
        $dateToString: { format: "%Y-W%U", date: "$createdAt" }
      };
      incrementFunction = d => {
        const weekNumber = getWeekNumber(d);
        const formattedDate = `${d.getFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
        return { date: formattedDate, quantitySold: 0 };
      };
      break;
    case "month":
      groupBy = {
        $dateToString: { format: "%Y-%m", date: "$createdAt" }
      };
      incrementFunction = d => {
        const formattedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        return { date: formattedDate, quantitySold: 0 };
      };
      break;
    case "quarter":
      groupBy = {
        $concat: [
          { $toString: { $year: "$createdAt" } },
          "-Q",
          { $ceil: { $divide: [{ $month: "$createdAt" }, 3] } }
        ]
      };
      incrementFunction = d => {
        const quarter = Math.ceil((d.getMonth() + 1) / 3);
        const formattedDate = `${d.getFullYear()}-Q${quarter}`;
        return { date: formattedDate, quantitySold: 0 };
      };
      break;
    default:
      throw new Error("Invalid format specified");
  }

  const dateRange = [];
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    dateRange.push(incrementFunction(new Date(currentDate)));
    switch (format) {
      case "day":
        currentDate.setDate(currentDate.getDate() + 1);
        break;
      case "week":
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case "month":
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
      case "quarter":
        currentDate.setMonth(currentDate.getMonth() + 3);
        break;
    }
  }

  let breakdownGroup;
  switch (breakdown) {
    case "productTitle":
      breakdownGroup = "$lineItems.title";
      break;
    case "city":
      breakdownGroup = {
        $ifNull: ["$shippingAddress.city", "Other"]
      };
      break;
    case "region":
      breakdownGroup = {
        $ifNull: ["$shippingAddress.province", "Other"] 
      };
      break;
    case "aov":
      breakdownGroup = {
        $switch: {
          branches: [
            {
              case: { $lt: [{ $toDouble: "$totalPrice" }, 100] },
              then: "AOV Segment 1"
            },
            {
              case: { $and: [
                { $gte: [{ $toDouble: "$totalPrice" }, 100] },
                { $lt: [{ $toDouble: "$totalPrice" }, 200] }
              ] },
              then: "AOV Segment 2"
            },
            {
              case: { $gte: [{ $toDouble: "$totalPrice" }, 200] },
              then: "AOV Segment 3"
            }
          ],
          default: "Other"
        }
      };
      break;
    default:
      throw new Error("Invalid breakdown specified");
  }

  const pipeline = [
    {
      $match: {
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },
    {
      $unwind: "$lineItems",
    },
    {
      $group: {
        _id: {
          breakdown: breakdownGroup,
          date: groupBy,
        },
        quantitySold: { $sum: "$lineItems.quantity" },
      },
    },
    {
      $group: {
        _id: "$_id.breakdown",
        dates: {
          $push: {
            date: "$_id.date",
            quantitySold: "$quantitySold",
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        breakdown: "$_id",
        dates: 1,
      },
    },
  ];

  const aggregationResults = await Order.aggregate(pipeline);

  let formattedResults = [];

  if (breakdown === "productTitle") {
    const allProducts = await Product.find({}, 'title').lean();
    const productTitles = allProducts.map(product => product.title);

    formattedResults = dateRange.map(dateObj => {
      const breakdownData = {};
      productTitles.forEach(title => {
        breakdownData[title] = 0;
      });

      aggregationResults.forEach(item => {
        const productTitle = item.breakdown;
        if (productTitles.includes(productTitle)) {
          const sale = item.dates.find(d => d.date === dateObj.date);
          if (sale) {
            breakdownData[productTitle] = sale.quantitySold;
          }
        }
      });

      return {
        date: dateObj.date,
        breakdownData,
      };
    });
  } else {
    let uniqueCategories = [];
    if (breakdown === "region") {
      uniqueCategories = await Order.distinct('shippingAddress.province', {
        createdAt: { $gte: startDate, $lte: endDate }
      });
    } else if (breakdown === "city") {
      uniqueCategories = await Order.distinct('shippingAddress.city', {
        createdAt: { $gte: startDate, $lte: endDate }
      });
    } else if (breakdown === "aov") {
      uniqueCategories = ["AOV Segment 1", "AOV Segment 2", "AOV Segment 3", "Other"];
    }

    if (breakdown !== "aov") {
      uniqueCategories = uniqueCategories.filter(cat => cat); 
      uniqueCategories.push("Other");
    }

    formattedResults = dateRange.map(dateObj => {
      const breakdownData = {};
      uniqueCategories.forEach(category => {
        breakdownData[category] = 0;
      });

      aggregationResults.forEach(item => {
        const category = item.breakdown;
        if (uniqueCategories.includes(category)) {
          const sale = item.dates.find(d => d.date === dateObj.date);
          if (sale) {
            breakdownData[category] += sale.quantitySold;
          }
        }
      });

      return {
        date: dateObj.date,
        breakdownData,
      };
    });
  }

  return formattedResults;
};


const getWeekNumber = (d) => {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return weekNo;
};


export const getRetentionCurveCompareData = async ({ filter, breakdown, format, customStartDate, customEndDate }) => {
  const { startDate, endDate } = getDateRange(filter, customStartDate, customEndDate);

  let groupBy;
  let incrementFunction;

  switch (format) {
    case "day":
      groupBy = {
        $dateToString: { format: "%Y-%m-%d", date: "$processedAt" }
      };
      incrementFunction = d => {
        const formattedDate = formatDate(d, 'yyyy-MM-dd');
        return { date: formattedDate, quantitySold: 0 };
      };
      break;
    case "week":
      groupBy = {
        $dateToString: { format: "%Y-W%U", date: "$processedAt" }
      };
      incrementFunction = d => {
        const weekNumber = getWeekNumber(d);
        const formattedDate = `${d.getFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
        return { date: formattedDate, quantitySold: 0 };
      };
      break;
    case "month":
      groupBy = {
        $dateToString: { format: "%Y-%m", date: "$processedAt" }
      };
      incrementFunction = d => {
        const formattedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        return { date: formattedDate, quantitySold: 0 };
      };
      break;
    case "quarter":
      groupBy = {
        $concat: [
          { $toString: { $year: "$processedAt" } },
          "-Q",
          { $ceil: { $divide: [{ $month: "$processedAt" }, 3] } }
        ]
      };
      incrementFunction = d => {
        const quarter = Math.ceil((d.getMonth() + 1) / 3);
        const formattedDate = `${d.getFullYear()}-Q${quarter}`;
        return { date: formattedDate, quantitySold: 0 };
      };
      break;
    default:
      throw new Error("Invalid format specified");
  }

  const dateRange = [];
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    dateRange.push(incrementFunction(new Date(currentDate)));
    switch (format) {
      case "day":
        currentDate.setDate(currentDate.getDate() + 1);
        break;
      case "week":
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case "month":
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
      case "quarter":
        currentDate.setMonth(currentDate.getMonth() + 3);
        break;
    }
  }

  let breakdownGroup;
  switch (breakdown) {
    case "productTitle":
      breakdownGroup = "$lineItems.title";
      break;
    case "city":
      breakdownGroup = {
        $ifNull: ["$lineItems.address.city", "Other"] 
      };
      break;
    case "region":
      breakdownGroup = {
        $ifNull: ["$lineItems.address.province", "Other"]
      };
      break;
    case "aov":
      breakdownGroup = {
        $switch: {
          branches: [
            {
              case: { $lt: [{ $toDouble: "$totalPrice" }, 100] },
              then: "AOV Segment 1"
            },
            {
              case: { $and: [
                { $gte: [{ $toDouble: "$totalPrice" }, 100] },
                { $lt: [{ $toDouble: "$totalPrice" }, 200] }
              ] },
              then: "AOV Segment 2"
            },
            {
              case: { $gte: [{ $toDouble: "$totalPrice" }, 200] },
              then: "AOV Segment 3"
            }
          ],
          default: "Other"
        }
      };
      break;
    default:
      throw new Error("Invalid breakdown specified");
  }

  const pipeline = [
    {
      $match: {
        processedAt: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },
    {
      $group: {
        _id: {
          breakdown: breakdownGroup,
          date: groupBy,
        },
        totalPriceSum: { $sum: { $toDouble: "$totalPrice" } }, 
      },
    },
    {
      $group: {
        _id: "$_id.breakdown",
        dates: {
          $push: {
            date: "$_id.date",
            totalPriceSum: "$totalPriceSum",
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        breakdown: "$_id",
        dates: 1,
      },
    },
  ];

  const aggregationResults = await Order.aggregate(pipeline);

  let formattedResults = [];

  if (breakdown === "productTitle") {
    const allProducts = await Product.find({}, 'title').lean();
    const productTitles = allProducts.map(product => product.title);

    formattedResults = dateRange.map(dateObj => {
      const breakdownData = {};
      productTitles.forEach(title => {
        breakdownData[title] = 0;
      });

      aggregationResults.forEach(item => {
        const productTitle = item.breakdown;
        if (productTitles.includes(productTitle)) {
          const sale = item.dates.find(d => d.date === dateObj.date);
          if (sale) {
            breakdownData[productTitle] = sale.totalPriceSum;
          }
        }
      });

      return {
        date: dateObj.date,
        breakdownData,
      };
    });
  } else {
    let uniqueCategories = [];
    if (breakdown === "region") {
      uniqueCategories = await Order.distinct('lineItems.address.province', {
        processedAt: { $gte: startDate, $lte: endDate }
      });
    } else if (breakdown === "city") {
      uniqueCategories = await Order.distinct('lineItems.address.city', {
        processedAt: { $gte: startDate, $lte: endDate }
      });
    } else if (breakdown === "aov") {
      uniqueCategories = ["AOV Segment 1", "AOV Segment 2", "AOV Segment 3", "Other"];
    }

    if (breakdown !== "aov") {
      uniqueCategories = uniqueCategories.filter(cat => cat); 
      uniqueCategories.push("Other");
    }

    formattedResults = dateRange.map(dateObj => {
      const breakdownData = {};
      uniqueCategories.forEach(category => {
        breakdownData[category] = 0;
      });

      aggregationResults.forEach(item => {
        const category = item.breakdown;
        if (uniqueCategories.includes(category)) {
          const sale = item.dates.find(d => d.date === dateObj.date);
          if (sale) {
            breakdownData[category] += sale.totalPriceSum;
          }
        }
      });

      return {
        date: dateObj.date,
        breakdownData,
      };
    });
  }

  return formattedResults;
};

const mapTimelineFilterToDateRangeFilter = (timelineFilter) => {
  const mapping = {
    "lastMonth": "one_month",
    "3months": "three_months",
    "6months": "six_months"
  };

  return mapping[timelineFilter];
};


export const calculateFollowUpPurchases = async (filter, order, timelineFilter) => {
  try {
    const dateRangeFilter = mapTimelineFilterToDateRangeFilter(timelineFilter);
    if (!dateRangeFilter) {
      throw new Error("Invalid timelineFilter provided");
    }

    const { startDate, endDate } = getDateRange(dateRangeFilter, null, null); 

    console.log(`Calculating follow-up purchases:
      Filter: ${filter}
      Order: ${order}
      TimelineFilter: ${timelineFilter}
      Date Range: ${startDate} to ${endDate}`);

    let orderNumber;
    switch (order) {
      case 'second_order':
        orderNumber = 2;
        break;
      case 'third_order':
        orderNumber = 3;
        break;
      case 'fourth_order':
        orderNumber = 4;
        break;
      default:
        throw new Error("Invalid order specified");
    }

    const initialMatch = {
      processedAt: { $gte: startDate, $lte: endDate },
      "customer.id": { $ne: null },
    };

    const matchingOrdersCount = await Order.countDocuments(initialMatch);
    console.log(`Number of matching orders: ${matchingOrdersCount}`);

    if (matchingOrdersCount === 0) {
      console.log("There are no orders matching the specified criteria.");
      return [];
    }

    const groupedCustomers = await Order.aggregate([
      { $match: initialMatch },
      { $group: { _id: "$customer.id", purchases: { $sum: 1 }, orders: { $push: "$$ROOT" } } },
      { $match: { purchases: orderNumber } }
    ]);

    console.log(`Number of customers with ${orderNumber} orders: ${groupedCustomers.length}`);

    if (groupedCustomers.length === 0) {
      console.log(`No customers have ${orderNumber} orders in the specified date range.`);
      return [];
    }

    const customerIds = groupedCustomers.map(customer => customer._id);
    console.log("Customer IDs with required order count:", customerIds);

    const nthOrders = await Order.aggregate([
      { $match: initialMatch },
      { $sort: { "customer.id": 1, "processedAt": 1 } },
      {
        $group: {
          _id: "$customer.id",
          orders: { $push: "$$ROOT" }
        }
      },
      {
        $project: {
          nthOrder: { $arrayElemAt: ["$orders", orderNumber - 1] }
        }
      },
      {
        $match: {
          "nthOrder.processedAt": { $gte: startDate, $lte: endDate }
        }
      }
    ]);

    console.log(`Number of nthOrders within date range: ${nthOrders.length}`);

    if (nthOrders.length === 0) {
      console.log("No nthOrders match the specified date range.");
      return [];
    }

    let pipeline = [
      { $match: { _id: { $in: nthOrders.map(order => order._id) } } },
      { $unwind: "$nthOrder.lineItems" },
    ];

    if (filter === 'products') {
      pipeline = [
        { $match: { _id: { $in: nthOrders.map(order => order._id) } } },
        { $unwind: "$nthOrder.lineItems" },
        {
          $group: {
            _id: "$nthOrder.lineItems.product.id",
            purchaseFrequency: { $sum: 1 },
            skuImage: { $first: "$nthOrder.lineItems.product.variants.image.transformedSrc" },
          },
        },
        { $sort: { purchaseFrequency: -1 } },
        {
          $project: {
            _id: 0,
            sku: "$_id",
            purchaseFrequency: 1,
            skuImage: 1
          }
        },
        { $limit: 12 }
      ];
    } else if (filter === 'variants') {
      pipeline = [
        { $match: { _id: { $in: nthOrders.map(order => order._id) } } },
        { $unwind: "$nthOrder.lineItems" },
        { $unwind: "$nthOrder.lineItems.product.variants" },
        {
          $group: {
            _id: "$nthOrder.lineItems.product.variants.sku",
            purchaseFrequency: { $sum: 1 },
            skuImage: { $first: "$nthOrder.lineItems.product.variants.image.transformedSrc" },
          },
        },
        { $sort: { purchaseFrequency: -1 } },
        {
          $project: {
            _id: 0,
            sku: "$_id",
            purchaseFrequency: 1,
            skuImage: 1
          }
        },
        { $limit: 12 }
      ];
    } else if (filter === 'categories') {
      pipeline = [
        { $match: { _id: { $in: nthOrders.map(order => order._id) } } },
        { $unwind: "$nthOrder.lineItems" },
        {
          $lookup: {
            from: "products", 
            localField: "nthOrder.lineItems.product.id",
            foreignField: "id",
            as: "productDetails"
          }
        },
        { $unwind: "$productDetails" },
        {
          $group: {
            _id: "$productDetails.productType",
            purchaseFrequency: { $sum: 1 },
          },
        },
        { $sort: { purchaseFrequency: -1 } },
        {
          $project: {
            _id: 0,
            category: "$_id",
            purchaseFrequency: 1
          }
        },
        { $limit: 12 }
      ];
    } else {
      throw new Error("Invalid filter specified");
    }

    console.log(`Executing Aggregation Pipeline for filter=${filter}:`, JSON.stringify(pipeline, null, 2));

    const aggregationResults = await Order.aggregate(pipeline);

    console.log(`Aggregation Results for filter=${filter}:`, aggregationResults);

    if (filter === 'categories') {
      return aggregationResults.map(item => ({
        category: item.category || "Unknown",
        purchaseFrequency: item.purchaseFrequency || 0
      }));
    } else {
      return aggregationResults.map(item => ({
        sku: item.sku || "Unknown",
        purchaseFrequency: item.purchaseFrequency || 0,
        skuImage: item.skuImage || null
      }));
    }
  } catch (error) {
    console.error("Error in calculateFollowUpPurchases:", error);
    throw error;
  }
};