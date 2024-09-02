import Order from "./../models/BulkTables/BulkOrder/order.js";
import Customer from "./../models/BulkTables/BulkCustomer/customer.js";
import LineItem from "./../models/BulkTables/BulkCustomer/lineItem.js";
import MetaAdInsights from "./../models/metaAdInsightModel.js";
import Product from "./../models/BulkTables/BulkProduct/product.js";
import moment from "moment";



const getDateRange = (filter, customStartDate, customEndDate) => {
  const now = new Date();
  let startDate;
  let endDate;

  // Set start and end dates based on filter
  if (filter === 'yesterday') {
    startDate = new Date(now);
    startDate.setDate(now.getDate() - 1);
    endDate = startDate;
  } else if (filter === 'one_week') {
    startDate = new Date(now);
    startDate.setDate(now.getDate() - 7);
    endDate = now;
  } else if (filter === 'one_month') {
    startDate = new Date(now);
    startDate.setMonth(now.getMonth() - 1);
    endDate = now;
  } else if (filter === 'three_months') {
    startDate = new Date(now);
    startDate.setMonth(now.getMonth() - 3);
    endDate = now;
  } else if (filter === 'six_months') {
    startDate = new Date(now);
    startDate.setMonth(now.getMonth() - 6);
    endDate = now;
  } else if (filter === 'twelve_months') {
    startDate = new Date(now);
    startDate.setFullYear(now.getFullYear() - 1);
    endDate = now;
  } else if (filter === 'custom_date_range') {
    if (!customStartDate || !customEndDate) {
      throw new Error('Custom start and end dates are required for custom_date_range filter');
    }
    startDate = new Date(customStartDate);
    endDate = new Date(customEndDate);
  } else {
    throw new Error('Invalid filter specified');
  }

  // Set the time for endDate to the end of the day
  if (filter !== 'yesterday' && filter !== 'custom_date_range') {
    endDate.setHours(23, 59, 59, 999);
  }

  return { startDate, endDate };
};

const generateDateArray = (startDate, endDate) => {
  const dates = [];
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
};

const generateMonthArray = (startDate, endDate) => {
  const months = [];
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    months.push(new Date(currentDate));
    currentDate.setMonth(currentDate.getMonth() + 1);
    currentDate.setDate(1);
  }

  return months;
};

// Daily Period Helper Function
const generateDailyPeriods = (startDate, endDate) => {
  const periods = [];
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    periods.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return periods;
};

// Weekly Period Helper Function
const generateWeeklyPeriods = (startDate, endDate) => {
  const periods = [];
  let currentDate = new Date(startDate);
  
  // Align start date to the nearest previous Monday
  currentDate.setDate(currentDate.getDate() - (currentDate.getDay() + 6) % 7);

  while (currentDate <= endDate) {
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - weekStart.getDay() + 1); // Align to Monday
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6); // End of the week (Sunday)
    periods.push(`${weekStart.toISOString().split('T')[0]} - ${weekEnd.toISOString().split('T')[0]}`);
    currentDate.setDate(currentDate.getDate() + 7);
  }

  return periods;
};

// Quarterly Period Helper Function
const generateQuarterlyPeriods = (startDate, endDate) => {
  const periods = [];
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const quarterStart = new Date(currentDate.getFullYear(), Math.floor(currentDate.getMonth() / 3) * 3, 1);
    const quarterEnd = new Date(quarterStart.getFullYear(), quarterStart.getMonth() + 3, 0);
    periods.push(`${quarterStart.toISOString().split('T')[0]} - ${quarterEnd.toISOString().split('T')[0]}`);
    currentDate.setMonth(currentDate.getMonth() + 3);
  }

  return periods;
};


const aggregateTotalSales = async (startDate, endDate, groupBy) => {
  const matchStage = {
    createdAt: {
      $gte: startDate,
      $lte: endDate,
    },
  };

  const groupStage = {
    _id: { $dateToString: { format: groupBy === 'day' ? "%Y-%m-%d" : "%Y-%m", date: "$createdAt" } },
    totalSales: { $sum: { $toDouble: "$totalPrice" } },
    totalOrders: { $sum: 1 },
  };

  const projectStage = {
    _id: 0,
    orderDate: "$_id",
    totalSales: 1,
    totalOrders: 1,
  };

  const totalSales = await Order.aggregate([
    { $match: matchStage },
    { $group: groupStage },
    { $project: projectStage },
  ]);

  return totalSales;
};

const aggregateNewCustomerSales = async (startDate, endDate, groupBy) => {
  const matchStage = {
    createdAt: {
      $gte: startDate,
      $lte: endDate,
    },
  };

  const lookupStage = {
    from: "customers",
    localField: "customer.id",
    foreignField: "id",
    as: "customer",
  };

  const projectStage = {
    createdAt: 1,
    totalPrice: { $toDouble: "$totalPrice" },
    isNewCustomer: {
      $eq: [
        { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$customer.createdAt",
          },
        },
      ],
    },
  };

  const matchNewCustomer = { $match: { isNewCustomer: true } };

  const groupStage = {
    _id: { $dateToString: { format: groupBy === 'day' ? "%Y-%m-%d" : "%Y-%m", date: "$createdAt" } },
    newCustomerSales: { $sum: "$totalPrice" },
    newCustomerOrders: { $sum: 1 },
  };

  const projectNewCustomer = {
    _id: 0,
    orderDate: "$_id",
    newCustomerSales: 1,
    newCustomerOrders: 1,
  };

  const newCustomerSales = await Order.aggregate([
    { $match: matchStage },
    { $lookup: lookupStage },
    { $unwind: "$customer" },
    { $project: projectStage },
    matchNewCustomer,
    { $group: groupStage },
    { $project: projectNewCustomer },
  ]);

  return newCustomerSales;
};

const aggregateReturningCustomerSales = async (startDate, endDate, groupBy) => {
  const matchStage = {
    createdAt: {
      $gte: startDate,
      $lte: endDate,
    },
  };

  const lookupStage = {
    from: "customers",
    localField: "customer.id",
    foreignField: "id",
    as: "customer",
  };

  const projectStage = {
    createdAt: 1,
    totalPrice: { $toDouble: "$totalPrice" },
    isReturningCustomer: {
      $gt: [
        { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$customer.createdAt",
          },
        },
      ],
    },
  };

  const matchReturningCustomer = { $match: { isReturningCustomer: true } };

  const groupStage = {
    _id: { $dateToString: { format: groupBy === 'day' ? "%Y-%m-%d" : "%Y-%m", date: "$createdAt" } },
    returningCustomerSales: { $sum: "$totalPrice" },
    returningCustomerOrders: { $sum: 1 },
  };

  const projectReturningCustomer = {
    _id: 0,
    orderDate: "$_id",
    returningCustomerSales: 1,
    returningCustomerOrders: 1,
  };

  const returningCustomerSales = await Order.aggregate([
    { $match: matchStage },
    { $lookup: lookupStage },
    { $unwind: "$customer" },
    { $project: projectStage },
    matchReturningCustomer,
    { $group: groupStage },
    { $project: projectReturningCustomer },
  ]);

  return returningCustomerSales;
};



// Combines sales trends into a single dataset
const getSalesTrends = async (filter, customStartDate, customEndDate) => {
  const { startDate, endDate } = getDateRange(filter, customStartDate, customEndDate);
  const dayDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  const groupBy = dayDiff <= 61 ? 'day' : 'month';

  const [totalSales, newCustomerSales, returningCustomerSales] = await Promise.all([
    aggregateTotalSales(startDate, endDate, groupBy),
    aggregateNewCustomerSales(startDate, endDate, groupBy),
    aggregateReturningCustomerSales(startDate, endDate, groupBy),
  ]);

  const dateArray = groupBy === 'day'
    ? generateDateArray(startDate, endDate)
    : generateMonthArray(startDate, endDate);

  const dateMap = new Map(dateArray.map(date => {
    const dateKey = groupBy === 'day'
      ? date.toISOString().split('T')[0]
      : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    return [dateKey, {
      orderDate: dateKey,
      totalSales: 0,
      newCustomerSales: 0,
      returningCustomerSales: 0
    }];
  }));

  totalSales.forEach(sale => {
    const formattedDate = groupBy === 'day'
      ? new Date(sale.orderDate).toISOString().split('T')[0]
      : `${new Date(sale.orderDate).getFullYear()}-${String(new Date(sale.orderDate).getMonth() + 1).padStart(2, '0')}`;

    if (dateMap.has(formattedDate)) {
      dateMap.get(formattedDate).totalSales = sale.totalSales;
    }
  });

  newCustomerSales.forEach(sale => {
    const formattedDate = groupBy === 'day'
      ? new Date(sale.orderDate).toISOString().split('T')[0]
      : `${new Date(sale.orderDate).getFullYear()}-${String(new Date(sale.orderDate).getMonth() + 1).padStart(2, '0')}`;

    if (dateMap.has(formattedDate)) {
      dateMap.get(formattedDate).newCustomerSales = sale.newCustomerSales;
    }
  });

  returningCustomerSales.forEach(sale => {
    const formattedDate = groupBy === 'day'
      ? new Date(sale.orderDate).toISOString().split('T')[0]
      : `${new Date(sale.orderDate).getFullYear()}-${String(new Date(sale.orderDate).getMonth() + 1).padStart(2, '0')}`;

    if (dateMap.has(formattedDate)) {
      dateMap.get(formattedDate).returningCustomerSales = sale.returningCustomerSales;
    }
  });

  return Array.from(dateMap.values());
};



// Computes the average order value (AOV) for each date
const getAOV = async (filter, customStartDate, customEndDate) => {
  const { startDate, endDate } = getDateRange(filter, customStartDate, customEndDate);
  const dayDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  const groupBy = dayDiff <= 61 ? 'day' : 'month';

  const totalSales = await aggregateTotalSales(startDate, endDate, groupBy);
  const newCustomerSales = await aggregateNewCustomerSales(startDate, endDate, groupBy);
  const returningCustomerSales = await aggregateReturningCustomerSales(startDate, endDate, groupBy);

  console.log('Total Sales:', totalSales);
  console.log('New Customer Sales:', newCustomerSales);
  console.log('Returning Customer Sales:', returningCustomerSales);

  let dateArray;

  if (groupBy === 'day') {
    dateArray = generateDateArray(startDate, endDate);
  } else {
    dateArray = generateMonthArray(startDate, endDate);
  }

  // Create a dateMap with all dates initialized to 0
  const dateMap = new Map(dateArray.map(date => {
    const dateKey = groupBy === 'day' ? date.toISOString().split('T')[0] : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return [dateKey, {
      orderDate: dateKey,
      combinedAOV: 0,
      newCustomerAOV: 0,
      returningCustomerAOV: 0
    }];
  }));

  // Update the map with data from totalSales
  totalSales.forEach(sale => {
    const formattedDate = groupBy === 'day'
      ? new Date(sale.orderDate).toISOString().split('T')[0]
      : `${new Date(sale.orderDate).getFullYear()}-${String(new Date(sale.orderDate).getMonth() + 1).padStart(2, '0')}`;
    if (dateMap.has(formattedDate)) {
      dateMap.get(formattedDate).combinedAOV = parseFloat((sale.totalSales / (sale.totalOrders || 1)).toFixed(2));
    }
  });

  // Update the map with data from newCustomerSales
  newCustomerSales.forEach(sale => {
    const formattedDate = groupBy === 'day'
      ? new Date(sale.orderDate).toISOString().split('T')[0]
      : `${new Date(sale.orderDate).getFullYear()}-${String(new Date(sale.orderDate).getMonth() + 1).padStart(2, '0')}`;
    if (dateMap.has(formattedDate)) {
      dateMap.get(formattedDate).newCustomerAOV = parseFloat((sale.newCustomerSales / (sale.newCustomerOrders || 1)).toFixed(2));
    }
  });

  // Update the map with data from returningCustomerSales
  returningCustomerSales.forEach(sale => {
    const formattedDate = groupBy === 'day'
      ? new Date(sale.orderDate).toISOString().split('T')[0]
      : `${new Date(sale.orderDate).getFullYear()}-${String(new Date(sale.orderDate).getMonth() + 1).padStart(2, '0')}`;
    if (dateMap.has(formattedDate)) {
      dateMap.get(formattedDate).returningCustomerAOV = parseFloat((sale.returningCustomerSales / (sale.returningCustomerOrders || 1)).toFixed(2));
    }
  });

  // Return the final result
  return Array.from(dateMap.values());
};





const getTopCities = async (filter, customStartDate, customEndDate) => {
  try {
    const { startDate, endDate } = getDateRange(filter, customStartDate, customEndDate);
    const dayDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const groupBy = dayDiff <= 61 ? 'day' : 'month';
    const startDateISO = startDate.toISOString();
    const endDateISO = endDate.toISOString();

    const orders = await Order.find({
      createdAt: { $gte: startDateISO, $lte: endDateISO },
    }, "createdAt customer.id shippingAddress.city")
      .populate("customer.id", "createdAt numberOfOrders");

    const customerData = await Customer.find({}, "id createdAt numberOfOrders");

    const cityData = {
      newCustomers: {},
      returningCustomers: {},
    };

    orders.forEach((order) => {
      if (!order.customer || !order.customer.id) return;

      const customer = customerData.find((c) => c.id === order.customer.id);

      if (customer) {
        const isNewCustomer = customer.numberOfOrders === "1";
        const city = order.shippingAddress.city;

        // Skip counting if city is null or empty
        if (!city) return;

        const date = new Date(order.createdAt);
        const formattedDate = groupBy === 'day'
          ? date.toISOString().split('T')[0] // Format date as YYYY-MM-DD
          : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // Format date as YYYY-MM

        if (isNewCustomer) {
          if (!cityData.newCustomers[formattedDate]) cityData.newCustomers[formattedDate] = {};
          if (!cityData.newCustomers[formattedDate][city]) cityData.newCustomers[formattedDate][city] = 0;
          cityData.newCustomers[formattedDate][city]++;
        } else {
          if (!cityData.returningCustomers[formattedDate]) cityData.returningCustomers[formattedDate] = {};
          if (!cityData.returningCustomers[formattedDate][city]) cityData.returningCustomers[formattedDate][city] = 0;
          cityData.returningCustomers[formattedDate][city]++;
        }
      }
    });

    const generateDateOrMonthArray = (startDate, endDate, groupBy) => {
      const results = [];
      let currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        results.push(new Date(currentDate));
        if (groupBy === 'day') {
          currentDate.setDate(currentDate.getDate() + 1);
        } else {
          currentDate.setMonth(currentDate.getMonth() + 1);
          currentDate.setDate(1); 
        }
      }

      return results;
    };

    const allPeriods = generateDateOrMonthArray(startDate, endDate, groupBy);
    const initializeCityData = (data) => {
      return allPeriods.reduce((acc, date) => {
        const dateKey = groupBy === 'day'
          ? date.toISOString().split('T')[0]
          : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        acc[dateKey] = acc[dateKey] || {};
        return acc;
      }, data);
    };

    const initializedNewCustomers = initializeCityData({});
    const initializedReturningCustomers = initializeCityData({});
    const mergeCityData = (actualData, initializedData) => {
      for (const [date, cities] of Object.entries(actualData)) {
        if (!initializedData[date]) initializedData[date] = {};
        for (const [city, count] of Object.entries(cities)) {
          initializedData[date][city] = count;
        }
      }
      return initializedData;
    };

    const mergedNewCustomers = mergeCityData(cityData.newCustomers, initializedNewCustomers);
    const mergedReturningCustomers = mergeCityData(cityData.returningCustomers, initializedReturningCustomers);

    const formatCityData = (cityData) => {
      const result = [];
      let totalUserCount = 0; // Initialize total user count
      let totalNewUserCount = 0; // Initialize total new user count
      let totalReturningUserCount = 0; // Initialize total returning user count

      for (const [date, cities] of Object.entries(cityData)) {
        const rankedCities = Object.entries(cities)
          .sort((a, b) => b[1] - a[1])
          .map(([city, count]) => ({ city, count }));

        result.push({ date, cities: rankedCities });

        rankedCities.forEach(cityData => {
          if (cityData.city) {  // Only count if city is not null or empty
            totalUserCount += cityData.count;
          }
        });
      }
      
      return { rankedData: result.sort((a, b) => new Date(a.date) - new Date(b.date)), totalUserCount }; // Return counts along with the ranked data
    };

    const { rankedData: rankedNewCustomers, totalUserCount: totalNewUserCount } = formatCityData(mergedNewCustomers);
    const { rankedData: rankedReturningCustomers, totalUserCount: totalReturningUserCount } = formatCityData(mergedReturningCustomers);

    const totalUserCount = totalNewUserCount + totalReturningUserCount; // Total users across both new and returning customers

    return {
      rankedNewCustomers,
      rankedReturningCustomers,
      totalUserCount,          // Total users across all cities
      totalNewUserCount,       // Total new users
      totalReturningUserCount  // Total returning users
    };
  } catch (error) {
    throw new Error(error.message);
  }
};




export const getTopCitiesComparison = async (filter, customStartDate, customEndDate) => {
  try {
    // Calculate current period data
    const currentPeriodData = await getTopCities(filter, customStartDate, customEndDate);

    // Calculate the previous period date range
    const { startDate, endDate } = getDateRange(filter, customStartDate, customEndDate);
    const previousStartDate = new Date(startDate);
    const previousEndDate = new Date(endDate);

    const dayDiff = (endDate - startDate) / (1000 * 60 * 60 * 24);

    previousStartDate.setDate(previousStartDate.getDate() - dayDiff);
    previousEndDate.setDate(previousEndDate.getDate() - dayDiff);

    console.log('Previous Start Date:', previousStartDate);
    console.log('Previous End Date:', previousEndDate);

    const previousPeriodData = await getTopCities(filter="custom_date_range", previousStartDate, previousEndDate);

    // Compare current and previous periods
    const comparison = {
    
      currentPeriodData:currentPeriodData,
      previousPeriodData:previousPeriodData,
      percentageComparison: {
        totalCustomers: calculatePercentageChange(currentPeriodData.totalUserCount, previousPeriodData.totalUserCount),
        newCustomers: calculatePercentageChange(currentPeriodData.totalNewUserCount, previousPeriodData.totalNewUserCount),
        returningCustomers: calculatePercentageChange(currentPeriodData.totalReturningUserCount, previousPeriodData.totalReturningUserCount),
      },
    };

    return comparison;
  } catch (error) {
    throw new Error(error.message);
  }
};

// Helper function to calculate percentage change
const calculatePercentageChange = (current, previous) => {
  if (previous === 0) return current === 0 ? 0 : 100; // Handle divide by zero
  return ((current - previous) / previous) * 100;
};







const getTopSKUs = async () => {
  try {
    const orders = await Order.find({}, "id createdAt customer.id");

    const lineItems = await LineItem.find({}, "id quantity product __parentId");

    const customers = await Customer.find({}, "id createdAt numberOfOrders");

    const skuData = {
      newCustomers: {},
      returningCustomers: {},
    };

    orders.forEach((order) => {
      const customer = customers.find((c) => c.id === order.customer.id);
      if (!customer) return;

      const isNewCustomer = customer.numberOfOrders === "1";
      const orderLineItems = lineItems.filter(
        (item) => item.__parentId === order.id
      );

      orderLineItems.forEach((item) => {
        const sku = item.product.sku;
        const quantity = item.quantity;

        if (isNewCustomer) {
          if (!skuData.newCustomers[sku]) skuData.newCustomers[sku] = 0;
          skuData.newCustomers[sku] += quantity;
        } else {
          if (!skuData.returningCustomers[sku])
            skuData.returningCustomers[sku] = 0;
          skuData.returningCustomers[sku] += quantity;
        }
      });
    });

    const rankedNewCustomers = Object.entries(skuData.newCustomers)
      .sort((a, b) => b[1] - a[1])
      .map(([sku, quantity]) => ({ sku, quantity }));

    const rankedReturningCustomers = Object.entries(skuData.returningCustomers)
      .sort((a, b) => b[1] - a[1])
      .map(([sku, quantity]) => ({ sku, quantity }));

    return { rankedNewCustomers, rankedReturningCustomers };
  } catch (error) {
    throw new Error(error.message);
  }
};

const calculateGrossSales = async () => {
  try {
    const grossSales = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalGrossSales: {
            $sum: { $toDouble: "$subtotalPrice" },
          },
        },
      },
    ]);
    return grossSales[0]?.totalGrossSales || 0;
  } catch (error) {
    console.error("Error calculating Gross Sales:", error);
    throw error;
  }
};

const calculateTotalRefunds = async () => {
  try {
    const refunds = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalRefunded: {
            $sum: { $toDouble: "$totalRefunded" },
          },
        },
      },
    ]);
    return refunds[0]?.totalRefunded || 0;
  } catch (error) {
    console.error("Error calculating total refunds:", error);
    throw error;
  }
};

const calculateTotalTaxes = async () => {
  try {
    const taxes = await Order.aggregate([
      {
        $unwind: "$taxLines",
      },
      {
        $group: {
          _id: null,
          totalTaxes: {
            $sum: { $toDouble: "$taxLines.price" },
          },
        },
      },
    ]);
    return taxes[0]?.totalTaxes || 0;
  } catch (error) {
    console.error("Error calculating total taxes:", error);
    throw error;
  }
};

const calculateTotalFees = async () => {
  try {
    const fees = await Order.aggregate([
      {
        $unwind: "$transactions",
      },
      {
        $unwind: "$transactions.fees",
      },
      {
        $group: {
          _id: null,
          totalFees: {
            $sum: { $toDouble: "$transactions.fees.amount" },
          },
        },
      },
    ]);
    return fees[0]?.totalFees || 0;
  } catch (error) {
    console.error("Error calculating total fees:", error);
    throw error;
  }
};

const calculateTotalShippingCost = async () => {
  try {
      const shippingCost = await Order.aggregate([
          {
              $group: {
                  _id: null,
                  totalShippingCost: {
                      $sum: {
                          $toDouble: "$totalShippingPriceSet.shopMoney.amount" 
                      }
                  }
              }
          }
      ]);
      return shippingCost[0]?.totalShippingCost || 0;
  } catch (error) {
      console.error('Error calculating total shipping cost:', error);
      throw error;
  }
};


const calculateTotalAdSpend = async () => {
  try {
    const result = await MetaAdInsights.aggregate([
      {
        $match: {
          insights: { $ne: [] }
        }
      },
      { 
        $unwind: "$insights"
      },
      {
        $match: {
          "insights.spend": { $gt: 0 } 
        }
      },
      {
        $group: {
          _id: null, 
          totalAdSpend: { $sum: "$insights.spend" } 
        }
      }
    ]);
    
    return result[0]?.totalAdSpend || 0;
  } catch (error) {
    console.error('Error calculating total ad spend:', error);
    throw error;
  }
};


const calculateTotalAdSpendByDate = async (filter, customStartDate, customEndDate) => {
  try {
    const now = new Date();
    let startDate;
    let endDate = new Date(now);
    endDate.setDate(now.getDate() - 1); // Default endDate to yesterday

    // Set start and end dates based on filter
    if (filter === 'yesterday') {
      startDate = new Date(endDate);
    } else if (filter === 'one_week') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
    } else if (filter === 'one_month') {
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
    } else if (filter === 'three_months') {
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 3);
    } else if (filter === 'six_months') {
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 6);
    } else if (filter === 'twelve_months') {
      startDate = new Date(now);
      startDate.setFullYear(now.getFullYear() - 1);
    } else if (filter === 'custom_date_range') {
      if (!customStartDate || !customEndDate) {
        throw new Error('Custom start and end dates are required for custom_date_range filter');
      }
      startDate = new Date(customStartDate);
      endDate = new Date(customEndDate);
      endDate.setDate(endDate.getDate() - 1); // Exclude today's date for custom range as well
    } else {
      throw new Error('Invalid filter specified');
    }

    // Calculate the difference in days between start and end date
    const dayDifference = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

    // Define grouping format
    let groupBy;
    if (dayDifference <= 60) {
      groupBy = {
        $dateToString: { format: "%Y-%m-%d", date: { $dateFromString: { dateString: "$date" } } }
      };
    } else {
      groupBy = {
        $dateToString: { format: "%Y-%m", date: { $dateFromString: { dateString: "$date" } } }
      };
    }

    // Convert dates to string format "YYYY-MM-DD"
    const startDateString = startDate.toISOString().split('T')[0];
    const endDateString = endDate.toISOString().split('T')[0];

    console.log('Start Date:', startDateString);
    console.log('End Date:', endDateString);
    console.log('dayDifference:', dayDifference);
    console.log('Group By:', groupBy.$dateToString.date?.$dateFromString);

    // Fetch total ad spend (regardless of date filter)
    const totalAdSpend = await MetaAdInsights.aggregate([
      { $unwind: "$insights" }, // Unwind the insights array
      {
        $group: {
          _id: null,
          totalAdSpend: { $sum: { $toDouble: "$insights.spend" } },
        },
      },
    ]);

    // Fetch ad spend based on date filter
    const adSpendByDate = await MetaAdInsights.aggregate([
      { $unwind: "$insights" }, // Unwind the insights array
      {
        $match: {
          date: { $gte: startDateString, $lte: endDateString },
        },
      },
      {
        $project: {
          date: groupBy,
          spend: { $toDouble: "$insights.spend" } // Access spend from insights array
        }
      },
      {
        $group: {
          _id: "$date",
          totalSpendByDate: { $sum: "$spend" }
        }
      },
      {
        $sort: { _id: 1 } // Sort by date ascending
      }
    ]);

    // Generate a list of all periods within the range
    const generateAllPeriods = () => {
      const periods = [];
      let currentDate = moment(startDate);
      const endDateMoment = moment(endDate);

      if (dayDifference <= 60) {
        // Day-wise
        while (currentDate <= endDateMoment) {
          periods.push({ date: currentDate.format("YYYY-MM-DD"), spend: 0 });
          currentDate.add(1, 'day');
        }
      } else {
        // Month-wise
        while (currentDate <= endDateMoment) {
          periods.push({ date: currentDate.format("YYYY-MM"), spend: 0 });
          currentDate.add(1, 'month');
        }
      }

      return periods;
    };

    // Map ad spend data to the periods
    const allPeriods = generateAllPeriods();
    adSpendByDate.forEach(item => {
      const period = allPeriods.find(p => p.date === item._id);
      if (period) {
        period.spend = item.totalSpendByDate;
      }
    });

    return {
      totalAdSpend: totalAdSpend[0]?.totalAdSpend || 0,
      adSpendByDate: allPeriods,
    };
  } catch (error) {
    console.error('Error in calculateTotalAdSpendByDate:', error.message);
    throw error;
  }
};





const calculateTotalSales = async () => {
  try {
    // Fetch all necessary data
    const [
      grossSales,
      totalRefunds,
      totalTaxes,
      totalShippingCost,
      totalFees,
      totalAdSpend,
    ] = await Promise.all([
      calculateGrossSales(),
      calculateTotalRefunds(),
      calculateTotalTaxes(),
      calculateTotalShippingCost(),
      calculateTotalFees(),
      calculateTotalAdSpend(),
    ]);

    // Calculate Total Sales
    const totalSales =
      grossSales +
      totalShippingCost +
      totalTaxes +
      totalFees -
      totalRefunds -
      totalAdSpend;
    return totalSales;
  } catch (error) {
    console.error("Error calculating total sales:", error);
    throw error;
  }
};



export const calculateGrossProfitBreakdown = async () => {
  try {
    const orders = await Order.aggregate([
      { $unwind: "$lineItems" },
      {
        $lookup: {
          from: "products",
          localField: "lineItems.product.id",
          foreignField: "id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
    ]);

    const productGrossProfits = {};
    let totalGrossProfit = 0;

    orders.forEach((order) => {
      const sellingPrice = parseFloat(order.productDetails.userPrice);
      const costPrice = parseFloat(order.productDetails.costPrice);
      const quantity = order.lineItems.quantity;

      if (isNaN(sellingPrice) || isNaN(costPrice)) {
        console.log(
          `Skipping product with invalid prices. Product ID: ${order.lineItems.product.id}`
        );
        return;
      }

      console.log(
        "Selling Price:",
        sellingPrice,
        "Cost Price:",
        costPrice,
        "Quantity:",
        quantity
      );

      const grossProfit = (sellingPrice - costPrice) * quantity;
      totalGrossProfit += grossProfit;

      if (productGrossProfits[order.lineItems.product.id]) {
        productGrossProfits[order.lineItems.product.id] += grossProfit;
      } else {
        productGrossProfits[order.lineItems.product.id] = grossProfit;
      }
    });
    const productBreakdown = Object.entries(productGrossProfits).map(
      ([productId, grossProfit]) => ({
        productId,
        grossProfit,
        percentageContribution: `${(
          (grossProfit / totalGrossProfit) * 100
        ).toFixed(2)}%`, 
      })
    );

    return productBreakdown;
  } catch (error) {
    throw new Error(`Error calculating gross profit breakdown: ${error.message}`);
  }
};


const calculateProductProfitability = async () => {
  try {
    const orders = await Order.aggregate([
      { $unwind: "$lineItems" },
      {
        $lookup: {
          from: "products",
          localField: "lineItems.product.id",
          foreignField: "id",
          as: "productDetails"
        }
      },
      { $unwind: "$productDetails" }
    ]);

    const productMetrics = {};
    let totalGrossProfit = 0;
    orders.forEach(order => {
      const variantId = order.lineItems.product.id;
      const quantity = order.lineItems.quantity;
      const sellingPrice = parseFloat(order.productDetails.userPrice);
      const costPrice = parseFloat(order.productDetails.costPrice);
      const title = order.lineItems.title || order.productDetails.title;
      const imageUrl = order.productDetails.image || '';
      if (isNaN(sellingPrice) || isNaN(costPrice)) {
        console.log(`Skipping product with invalid prices. Variant ID: ${variantId}`);
        return;
      }

      const netSalesValue = sellingPrice * quantity;
      const cogs = costPrice * quantity;
      const grossProfit = netSalesValue - cogs;

      totalGrossProfit += grossProfit;

      if (productMetrics[variantId]) {
        productMetrics[variantId].netSalesValue += netSalesValue;
        productMetrics[variantId].netSalesUnits += quantity;
        productMetrics[variantId].cogs += cogs;
        productMetrics[variantId].grossProfit += grossProfit;
      } else {
        productMetrics[variantId] = {
          variantId,
          title,
          imageUrl,
          netSalesValue,
          netSalesUnits: quantity,
          cogs,
          grossProfit,
        };
      }
    });
    const productProfitability = Object.values(productMetrics).map(product => {
      const grossProfitMargin = (product.grossProfit / product.netSalesValue) * 100;
      return {
        ...product,
        grossProfitMargin: parseFloat(grossProfitMargin.toFixed(2)) 
      };
    });
    productProfitability.sort((a, b) => b.grossProfit - a.grossProfit);

    return productProfitability;

  } catch (error) {
    console.error("Error calculating product profitability:", error);
    throw error;
  }
};


const calculateLeastProfitableProducts = async () => {
  try {
    const productProfitability = await calculateProductProfitability();
    const leastProfitableProducts = productProfitability.sort(
      (a, b) => a.grossProfit - b.grossProfit
    );

    return leastProfitableProducts;
  } catch (error) {
    console.error("Error calculating least profitable products:", error);
    throw error;
  }
};

const calculateBestSellers = async () => {
  try {
    const productProfitability = await calculateProductProfitability();
    const bestSellers = productProfitability.sort(
      (a, b) => b.netSalesUnits - a.netSalesUnits
    );

    return bestSellers;
  } catch (error) {
    console.error("Error calculating best sellers:", error);
    throw error;
  }
};



export const calculateBlendedCAC = async (filter, customStartDate, customEndDate) => {
  try {
    // Get the date range
    const { startDate, endDate } = getDateRange(filter, customStartDate, customEndDate);
    
    // Generate the array of dates
    const dates = generateDateArray(startDate, endDate);
    
    // Convert dates to strings for querying MetaAdInsights
    const startDateString = startDate.toISOString().split('T')[0];
    const endDateString = endDate.toISOString().split('T')[0];

    // Fetch total ad spend within the date range
    const totalAdSpendResult = await MetaAdInsights.aggregate([
      { $unwind: "$insights" }, // Unwind the insights array
      {
        $match: {
          date: { $gte: startDateString, $lte: endDateString },
        },
      },
      {
        $group: {
          _id: "$date",
          totalAdSpend: { $sum: { $toDouble: "$insights.spend" } },
        },
      },
    ]);

    // Fetch the total number of unique customers who made a purchase within the date range
    const uniqueCustomersCountResult = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          "customer.id": { $ne: null } // Match orders by createdAt field
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          uniqueCustomers: { $addToSet: "$customer.id" } // Collect unique customer IDs
        },
      },
      {
        $project: {
          _id: 1,
          uniqueCustomersCount: { $size: "$uniqueCustomers" } // Count unique customer IDs
        },
      },
    ]);

    // Prepare maps of results
    const adSpendMap = totalAdSpendResult.reduce((acc, { _id, totalAdSpend }) => {
      acc[_id] = totalAdSpend;
      return acc;
    }, {});

    const uniqueCustomerMap = uniqueCustomersCountResult.reduce((acc, { _id, uniqueCustomersCount }) => {
      acc[_id] = uniqueCustomersCount;
      return acc;
    }, {});

    // Format the data by date and calculate daily Blended CAC
    const formattedData = dates.map(date => {
      const dateString = date.toISOString().split('T')[0];
      const adSpend = adSpendMap[dateString] || 0;
      const uniqueCustomers = uniqueCustomerMap[dateString] || 0;
      const dailyBlendedCAC = uniqueCustomers > 0 ? adSpend / uniqueCustomers : 0;
      return {
        date: dateString,
        adSpend,
        uniqueCustomers,
        blendedCAC: dailyBlendedCAC.toFixed(3),
      };
    });

    // Calculate total ad spend and unique customers
    const totalAdSpend = formattedData.reduce((sum, { adSpend }) => sum + adSpend, 0);
    const totalUniqueCustomers = formattedData.reduce((sum, { uniqueCustomers }) => sum + uniqueCustomers, 0);
    const blendedCAC = totalUniqueCustomers > 0 ? totalAdSpend / totalUniqueCustomers : 0;

    return {
      totalAdSpend: totalAdSpend.toFixed(3),
      totalUniqueCustomers,
      blendedCAC: blendedCAC.toFixed(3),
      dataByDate: formattedData,
    };
  } catch (error) {
    console.error('Error in calculateBlendedCAC:', error.message);
    throw error;
  }
};

export const calculateBlendedROAS = async (filter, customStartDate, customEndDate) => {
  try {
    // Get the date range
    const { startDate, endDate } = getDateRange(filter, customStartDate, customEndDate);

    // Calculate the difference in days
    const dateDifference = (endDate - startDate) / (1000 * 60 * 60 * 24);

    // Determine whether to group by day or month
    const groupByMonth = dateDifference > 61;

    // Generate the appropriate array of dates or months
    const dateArray = groupByMonth ? generateMonthArray(startDate, endDate) : generateDateArray(startDate, endDate);

    // Set the group format based on the date range
    const groupFormat = groupByMonth ? "%Y-%m" : "%Y-%m-%d";

    // Convert dates to strings for querying MetaAdInsights
    const startDateString = startDate.toISOString().split('T')[0];
    const endDateString = endDate.toISOString().split('T')[0];

    // Fetch total ad spend by date or month
    const adSpendByDate = await MetaAdInsights.aggregate([
      { $unwind: "$insights" },
      {
        $match: {
          date: { $gte: startDateString, $lte: endDateString },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: groupFormat, date: { $toDate: "$date" } } },
          totalAdSpend: { $sum: { $toDouble: "$insights.spend" } },
        },
      },
    ]);

    // Fetch total sales by date or month
    const salesByDate = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          "customer.id": { $ne: null },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: groupFormat, date: "$createdAt" } },
          totalSales: { $sum: { $toDouble: "$totalPrice" } },
        },
      },
    ]);

    // Create a map of dates or months to ad spend and sales
    const adSpendMap = adSpendByDate.reduce((acc, item) => {
      acc[item._id] = item.totalAdSpend;
      return acc;
    }, {});

    const salesMap = salesByDate.reduce((acc, item) => {
      acc[item._id] = item.totalSales;
      return acc;
    }, {});

    // Calculate ROAS for each date or month in the range
    const roasData = dateArray.map(date => {
      const dateString = groupByMonth
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        : date.toISOString().split('T')[0];
      const totalSales = salesMap[dateString] || 0;
      const totalAdSpend = adSpendMap[dateString] || 0;
      const roas = totalAdSpend > 0 ? totalSales / totalAdSpend : 0;

      return {
        date: dateString,
        totalSales: totalSales.toFixed(2),
        totalAdSpend: totalAdSpend.toFixed(2),
        roas: roas.toFixed(5),
      };
    });

    return {
      data: roasData,
    };
  } catch (error) {
    console.error('Error in calculateBlendedROAS:', error.message);
    throw error;
  }
};


export default {
  getSalesTrends,
  getAOV,
  getTopCities,
  getTopSKUs,
  calculateGrossSales,
  calculateTotalRefunds,
  calculateTotalTaxes,
  calculateTotalFees,
  calculateTotalShippingCost,
  calculateTotalAdSpend,
  calculateTotalAdSpendByDate,
  calculateBlendedCAC,
  calculateTotalSales,
  calculateGrossProfitBreakdown,
  calculateProductProfitability,
  calculateLeastProfitableProducts,
  calculateBestSellers,
  calculateBlendedROAS,
  getTopCitiesComparison
};
