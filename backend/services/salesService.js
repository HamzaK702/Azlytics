import Order from "./../models/BulkTables/BulkOrder/order.js";
import Customer from "./../models/BulkTables/BulkCustomer/customer.js";
import LineItem from "./../models/BulkTables/BulkCustomer/lineItem.js";
import MetaAdInsights from "./../models/metaAdInsightModel.js";
import moment from "moment";



export const getDateRange = (filter, customStartDate, customEndDate) => {
  const now = new Date();
  let startDate;
  let endDate;

  // Set start and end dates based on filter
  if (filter === 'yesterday') {
    startDate = new Date(now);
    startDate.setDate(now.getDate() - 1);
    endDate = startDate;
  } else if (filter === 'one_week') {
    endDate = new Date(now);
    endDate.setDate(now.getDate() - 1);
    startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 7);
  } else if (filter === 'one_month') {
    endDate = new Date(now)
    endDate.setDate(now.getDate() - 1)
    startDate = new Date(endDate);
    startDate.setMonth(endDate.getMonth() - 1);
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


export const getSalesTrendsComparison = async (filter, customStartDate, customEndDate) => {
  try {
    const currentPeriodData = await getSalesTrends(filter, customStartDate, customEndDate);
    const { startDate, endDate } = getDateRange(filter, customStartDate, customEndDate);
    const dayDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

    const previousStartDate = new Date(startDate);
    const previousEndDate = new Date(endDate);

    previousStartDate.setDate(previousStartDate.getDate() - dayDiff);
    previousEndDate.setDate(previousEndDate.getDate() - dayDiff);

    const previousPeriodData = await getSalesTrends(
      'custom_date_range',
      previousStartDate,
      previousEndDate
    );

    const aggregateSales = (salesData) => {
      return salesData.reduce(
        (acc, item) => {
          acc.totalSales += item.totalSales;
          acc.newCustomerSales += item.newCustomerSales;
          acc.returningCustomerSales += item.returningCustomerSales;
          return acc;
        },
        { totalSales: 0, newCustomerSales: 0, returningCustomerSales: 0 }
      );
    };

    const currentSalesAggregate = aggregateSales(currentPeriodData);
    const previousSalesAggregate = aggregateSales(previousPeriodData);

    // Compare current and previous periods
    const comparison = {
      currentPeriodData: currentPeriodData,
      previousPeriodData: previousPeriodData,
      percentageComparison: {
        totalSales: calculatePercentageChange(currentSalesAggregate.totalSales, previousSalesAggregate.totalSales),
        newCustomerSales: calculatePercentageChange(currentSalesAggregate.newCustomerSales, previousSalesAggregate.newCustomerSales),
        returningCustomerSales: calculatePercentageChange(currentSalesAggregate.returningCustomerSales, previousSalesAggregate.returningCustomerSales),
      },
    };

    return comparison;
  } catch (error) {
    throw new Error(error.message);
  }
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

export const getAOVComparison = async (filter, customStartDate, customEndDate) => {
  try {
    const currentPeriodAOV = await getAOV(filter, customStartDate, customEndDate);
    const { startDate, endDate } = getDateRange(filter, customStartDate, customEndDate);
    const dayDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

    const previousStartDate = new Date(startDate);
    const previousEndDate = new Date(endDate);

    previousStartDate.setDate(previousStartDate.getDate() - dayDiff);
    previousEndDate.setDate(previousEndDate.getDate() - dayDiff);
    const previousPeriodAOV = await getAOV(
      'custom_date_range',
      previousStartDate,
      previousEndDate
    );
    const aggregateAOV = (aovData) => {
      return aovData.reduce(
        (acc, item) => {
          acc.combinedAOV += item.combinedAOV;
          acc.newCustomerAOV += item.newCustomerAOV;
          acc.returningCustomerAOV += item.returningCustomerAOV;
          return acc;
        },
        { combinedAOV: 0, newCustomerAOV: 0, returningCustomerAOV: 0 }
      );
    };
    const currentAOVAggregate = aggregateAOV(currentPeriodAOV);
    const previousAOVAggregate = aggregateAOV(previousPeriodAOV);
    const comparison = {
      currentPeriodAOV: currentPeriodAOV,
      previousPeriodAOV: previousPeriodAOV,
      percentageComparison: {
        combinedAOV: calculatePercentageChange(currentAOVAggregate.combinedAOV, previousAOVAggregate.combinedAOV),
        newCustomerAOV: calculatePercentageChange(currentAOVAggregate.newCustomerAOV, previousAOVAggregate.newCustomerAOV),
        returningCustomerAOV: calculatePercentageChange(currentAOVAggregate.returningCustomerAOV, previousAOVAggregate.returningCustomerAOV),
      },
    };

    return comparison;
  } catch (error) {
    throw new Error(error.message);
  }
};









const breakCityDataIntoWeeks = (data) => {
  const weeklyData = [];
  
  // Convert object to array of entries (date, cities)
  const entries = Object.entries(data);
  
  entries.forEach(([date, cities]) => {
    const weekStart = moment(date).startOf('isoWeek').format('YYYY-MM-DD');
    const existingWeek = weeklyData.find(week => week.date === weekStart);
    
    let totalCount = 0;
    if (cities) {
      totalCount = Object.values(cities).reduce((sum, count) => sum + count, 0);
    }
    
    if (existingWeek) {
      existingWeek.totalCount += totalCount;
    } else {
      weeklyData.push({
        date: weekStart,
        totalCount: totalCount
      });
    }

    console.log(weeklyData , "weeklyData");
  });

  return weeklyData;
};

const breakCityDataIntoMonths = (data) => {
  const monthlyData = [];
  
  // Convert object to array of entries (date, cities)
  const entries = Object.entries(data);
  
  entries.forEach(([date, cities]) => {
    const monthStart = moment(date).startOf('month').format('YYYY-MM-DD');
    const existingMonth = monthlyData.find(month => month.date === monthStart);
    
    const dailyCount = Object.values(cities).reduce((sum, count) => sum + count, 0);
    
    if (existingMonth) {
      existingMonth.totalCount += dailyCount;
    } else {
      monthlyData.push({
        date: monthStart,
        totalCount: dailyCount
      });
    }
  });

  return monthlyData;
};

const breakCityDataIntoQuarters = (data) => {
  const quarterlyData = [];
  
  // Convert object to array of entries (date, cities)
  const entries = Object.entries(data);
  
  entries.forEach(([date, cities]) => {
    const momentDate = moment(date);
    const quarter = Math.ceil(momentDate.month() / 3) + 1;
    const year = momentDate.year();
    const quarterStart = `${year}-Q${quarter}`;
    
    const existingQuarter = quarterlyData.find(quarter => quarter.date === quarterStart);
    
    const dailyCount = Object.values(cities).reduce((sum, count) => sum + count, 0);
    
    if (existingQuarter) {
      existingQuarter.totalCount += dailyCount;
    } else {
      quarterlyData.push({
        date: quarterStart,
        totalCount: dailyCount
      });
    }
  });

  return quarterlyData;
};




const getTopCities = async (filter, customStartDate, customEndDate, granularity) => {
  try {
    const { startDate, endDate } = getDateRange(filter, customStartDate, customEndDate);
    const startDateISO = startDate.toISOString();
    const endDateISO = endDate.toISOString();

    // Fetch new customers within the date range
    const customers = await Customer.find(
      {
        createdAt: { $gte: startDateISO, $lte: endDateISO },
        numberOfOrders: '1',
      },
      'createdAt defaultAddress.city'
    );

    // Initialize an object to hold city data
    const cityData = {};

    // Helper functions
    const getWeekNumber = (date) => {
      const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
      const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
      return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    };

    const formatPeriod = (date) => {
      switch (granularity) {
        case 'week':
          const weekNumber = getWeekNumber(date);
          return `${date.getFullYear()}-W${('0' + weekNumber).slice(-2)}`; // YYYY-WNN
        case 'month':
          return `${date.getFullYear()}-${('0' + (date.getMonth() + 1)).slice(-2)}`; // YYYY-MM
        case 'quarter':
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          return `${date.getFullYear()}-Q${quarter}`; // YYYY-QN
        case 'day':
        default:
          return date.toISOString().split('T')[0]; // YYYY-MM-DD
      }
    };

    const generateAllPeriods = (startDate, endDate) => {
      const periods = new Set();
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        periods.add(formatPeriod(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }
      return Array.from(periods).sort();
    };

    const allPeriods = generateAllPeriods(startDate, endDate);

    // Process each customer
    customers.forEach((customer) => {
      const city = customer.defaultAddress?.city;

      // Skip if city is null or empty
      if (!city) return;

      const date = new Date(customer.createdAt);
      const periodKey = formatPeriod(date);

      if (!cityData[city]) {
        cityData[city] = {
          totalCustomers: 0,
          periods: {},
        };
        // Initialize periods with zero counts
        allPeriods.forEach((period) => {
          cityData[city].periods[period] = 0;
        });
      }

      cityData[city].totalCustomers++;
      cityData[city].periods[periodKey]++;
    });

    // Convert cityData to an array and sort based on total customers
    const cityArray = Object.keys(cityData).map((city) => ({
      city,
      totalCustomers: cityData[city].totalCustomers,
      periods: cityData[city].periods,
    }));

    // Sort the cities based on totalCustomers
    cityArray.sort((a, b) => b.totalCustomers - a.totalCustomers);

    // Get the top 3 cities
    const topCities = cityArray.slice(0, 3);

    // Return the data in the required format
    return {
      data: topCities,
    };
  } catch (error) {
    throw new Error(error.message);
  }
};






export const getTopCitiesComparison = async (filter, customStartDate, customEndDate , granularity) => {
  try {
    // Calculate current period data
    const currentPeriodData = await getTopCities(filter, customStartDate, customEndDate , granularity);

    // Calculate the previous period date range
    const { startDate, endDate } = getDateRange(filter, customStartDate, customEndDate , granularity);
    const previousStartDate = new Date(startDate);
    const previousEndDate = new Date(endDate);

    const dayDiff = (endDate - startDate) / (1000 * 60 * 60 * 24);

    previousStartDate.setDate(previousStartDate.getDate() - dayDiff);
    previousEndDate.setDate(previousEndDate.getDate() - dayDiff);

    console.log('Previous Start Date:', previousStartDate);
    console.log('Previous End Date:', previousEndDate);

    const previousPeriodData = await getTopCities(filter="custom_date_range", previousStartDate, previousEndDate , granularity);

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


export const getTotalAdSpendComparison = async (filter, customStartDate, customEndDate) => {
  try {
    
    const currentPeriodData = await calculateTotalAdSpendByDate(filter, customStartDate, customEndDate);
    const { startDate, endDate } = getDateRange(filter, customStartDate, customEndDate);
    const previousStartDate = new Date(startDate);
    const previousEndDate = new Date(endDate);

    const dayDiff = (endDate - startDate) / (1000 * 60 * 60 * 24);

    previousStartDate.setDate(previousStartDate.getDate() - dayDiff);
    previousEndDate.setDate(previousEndDate.getDate() - dayDiff);
    const previousPeriodData = await calculateTotalAdSpendByDate(filter='custom_date_range', previousStartDate.toISOString(), previousEndDate.toISOString());


    const sumAdSpend = (adSpendData) =>
      adSpendData.reduce((acc, item) => acc + item.spend, 0);

    const totalCurrentAdSpend = sumAdSpend(currentPeriodData.adSpendByDate);
    const totalPreviousAdSpend = sumAdSpend(previousPeriodData.adSpendByDate);


    // Compare current and previous periods
    const comparison = {
      currentPeriodData: currentPeriodData,
      previousPeriodData: previousPeriodData,
      percentageComparison: calculatePercentageChange(totalCurrentAdSpend, totalPreviousAdSpend),
    };

    return comparison;
  } catch (error) {
    throw new Error(error.message);
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

    // Determine whether to group by day or month
    let groupBy = 'day';
    if (filter === 'three_months' || filter === 'six_months') {
      groupBy = 'month';
    }

    // Generate the array of dates or months
    const dateArray = groupBy === 'month' ? generateMonthArray(startDate, endDate) : generateDateArray(startDate, endDate);

    // Set the group format based on groupBy
    const groupFormat = groupBy === 'month' ? "%Y-%m" : "%Y-%m-%d";

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
          _id: { $dateToString: { format: groupFormat, date: { $toDate: "$date" } } },
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
          _id: { $dateToString: { format: groupFormat, date: "$createdAt" } },
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

    // Format the data by date or month and calculate Blended CAC
    const formattedData = dateArray.map(date => {
      const dateString = groupBy === 'month'
        ? date.toISOString().slice(0,7) // Get 'YYYY-MM'
        : date.toISOString().split('T')[0]; // Get 'YYYY-MM-DD'

      const adSpend = adSpendMap[dateString] || 0;
      const uniqueCustomers = uniqueCustomerMap[dateString] || 0;
      const blendedCAC = uniqueCustomers > 0 ? adSpend / uniqueCustomers : 0;

      return {
        date: dateString,
        adSpend,
        uniqueCustomers,
        blendedCAC: blendedCAC,
      };
    });

    // Calculate total ad spend and unique customers
    const totalAdSpend = formattedData.reduce((sum, { adSpend }) => sum + adSpend, 0);
    const totalUniqueCustomers = formattedData.reduce((sum, { uniqueCustomers }) => sum + uniqueCustomers, 0);
    const blendedCAC = totalUniqueCustomers > 0 ? totalAdSpend / totalUniqueCustomers : 0;

    const dataKey = groupBy === 'month' ? 'dataByMonth' : 'dataByDate';

    return {
      totalAdSpend: totalAdSpend,
      totalUniqueCustomers,
      blendedCAC: blendedCAC,
      [dataKey]: formattedData,
    };
  } catch (error) {
    console.error('Error in calculateBlendedCAC:', error.message);
    throw error;
  }
};


export const getBlendedCACComparison = async (filter, customStartDate, customEndDate) => {
  try {
    const currentPeriodData = await calculateBlendedCAC(filter, customStartDate, customEndDate);
    const { startDate, endDate } = getDateRange(filter, customStartDate, customEndDate);
    const dayDiff = (endDate - startDate) / (1000 * 60 * 60 * 24);
    const previousStartDate = new Date(startDate);
    const previousEndDate = new Date(endDate);
    previousStartDate.setDate(previousStartDate.getDate() - dayDiff);
    previousEndDate.setDate(previousEndDate.getDate() - dayDiff);
    const previousPeriodData = await calculateBlendedCAC('custom_date_range', previousStartDate.toISOString(), previousEndDate.toISOString());
    const comparison = {
      currentPeriodBlendedCAC:currentPeriodData,
      previousPeriodBlendedCAC:previousPeriodData,
      percentageComparison: calculatePercentageChange(currentPeriodData.blendedCAC, previousPeriodData.blendedCAC),
    };

    return comparison;
  } catch (error) {
    console.error('Error in getBlendedCACComparison:', error.message);
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
        totalSales: totalSales,
        totalAdSpend: totalAdSpend,
        roas: roas,
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

export const getBlendedROASComparison = async (filter, customStartDate, customEndDate) => {
  try {
    const currentPeriodData = await calculateBlendedROAS(filter, customStartDate, customEndDate);
    const { startDate, endDate } = getDateRange(filter, customStartDate, customEndDate);
    const dayDiff = (endDate - startDate) / (1000 * 60 * 60 * 24);
    const previousStartDate = new Date(startDate);
    const previousEndDate = new Date(endDate);
    previousStartDate.setDate(previousStartDate.getDate() - dayDiff);
    previousEndDate.setDate(previousEndDate.getDate() - dayDiff);
    const previousPeriodData = await calculateBlendedROAS(filter='custom_date_range', previousStartDate.toISOString(), previousEndDate.toISOString());

    const sumROAS = (roasData) => {
      const totalSales = roasData.data.reduce((acc, item) => acc + parseFloat(item.totalSales), 0);
      const totalAdSpend = roasData.data.reduce((acc, item) => acc + parseFloat(item.totalAdSpend), 0);
      return totalAdSpend > 0 ? totalSales / totalAdSpend : 0;
    };

    const totalCurrentROAS = sumROAS(currentPeriodData);
    const totalPreviousROAS = sumROAS(previousPeriodData);
    
    // Compare current and previous periods
    const comparison = {
      currentPeriodROAS: currentPeriodData,
      previousPeriodROAS: previousPeriodData,
      percentageComparison: calculatePercentageChange(totalCurrentROAS, totalPreviousROAS),
    };
    
    return comparison;
  } catch (error) {
    throw new Error(error.message);
  }
};


// const breakDataIntoWeeks = (dailyData) => {
//   const weeklyData = [];
  
//   dailyData.forEach(day => {
//     const weekStart = moment(day.date).startOf('isoWeek').format('YYYY-MM-DD');
//     const existingWeek = weeklyData.find(week => week.weekStart === weekStart);
    
//     if (existingWeek) {
//       existingWeek.totalSpend += day.spend;
//     } else {
//       weeklyData.push({
//         weekStart: weekStart,
//         totalSpend: day.spend
//       });
//     }
//   });

//   return weeklyData;
// };

// const breakDataIntoMonths = (dailyData) => {
//   const monthlyData = [];

//   dailyData.forEach(day => {
//     const monthStart = moment(day.date).startOf('month').format('YYYY-MM-DD');
//     const existingMonth = monthlyData.find(month => month.monthStart === monthStart);
    
//     if (existingMonth) {
//       existingMonth.totalSpend += day.spend;
//     } else {
//       monthlyData.push({
//         monthStart: monthStart,
//         totalSpend: day.spend
//       });
//     }
//   });

//   return monthlyData;
// };

// const breakDataIntoQuarters = (dailyData) => {
//   const quarterlyData = [];

//   dailyData.forEach(day => {
//     const quarterStart = moment(day.date).startOf('quarter').format('YYYY-MM-DD');
//     const existingQuarter = quarterlyData.find(quarter => quarter.quarterStart === quarterStart);
    
//     if (existingQuarter) {
//       existingQuarter.totalSpend += day.spend;
//     } else {
//       quarterlyData.push({
//         quarterStart: quarterStart,
//         totalSpend: day.spend
//       });
//     }
//   });

//   return quarterlyData;
// };


// const getDailyAdSpendForPastThreeMonths = async () => {
//   try {
//     const now = new Date();
//     const startDate = new Date(now);
//     startDate.setMonth(now.getMonth() - 3);
//     const endDate = new Date(now);
//     endDate.setDate(now.getDate() - 1); // Exclude today's date

//     // Convert dates to string format "YYYY-MM-DD"
//     const startDateString = startDate.toISOString().split('T')[0];
//     const endDateString = endDate.toISOString().split('T')[0];

//     console.log('Start Date:', startDateString);
//     console.log('End Date:', endDateString);

//     // Fetch ad spend based on the date range
//     const adSpendByDate = await MetaAdInsights.aggregate([
//       { $unwind: "$insights" }, // Unwind the insights array
//       {
//         $match: {
//           date: { $gte: startDateString, $lte: endDateString },
//         },
//       },
//       {
//         $project: {
//           date: {
//             $dateToString: { format: "%Y-%m-%d", date: { $dateFromString: { dateString: "$date" } } }
//           },
//           spend: { $toDouble: "$insights.spend" } // Access spend from insights array
//         }
//       },
//       {
//         $group: {
//           _id: "$date",
//           totalSpendByDate: { $sum: "$spend" }
//         }
//       },
//       {
//         $sort: { _id: 1 } // Sort by date ascending
//       }
//     ]);

//     // Generate a list of all days within the range
//     const generateAllDays = () => {
//       const days = [];
//       let currentDate = moment(startDate);
//       const endDateMoment = moment(endDate);

//       while (currentDate <= endDateMoment) {
//         days.push({ date: currentDate.format("YYYY-MM-DD"), spend: 0 });
//         currentDate.add(1, 'day');
//       }

//       return days;
//     };

//     // Map ad spend data to the days
//     const allDays = generateAllDays();
//     adSpendByDate.forEach(item => {
//       const day = allDays.find(p => p.date === item._id);
//       if (day) {
//         day.spend = item.totalSpendByDate;
//       }
//     });
//     const quarterwise = await breakDataIntoQuarters(allDays)
//     return {
//       adSpendByDay: quarterwise,
//       //adSpendByDay: weekwise,
//     };
//   } catch (error) {
//     console.error('Error in getDailyAdSpendForPastThreeMonths:', error.message);
//     throw error;
//   }
// };


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
  getTopCitiesComparison,
  getTotalAdSpendComparison,
  getSalesTrendsComparison,
  getAOVComparison,
  getBlendedROASComparison,
  getBlendedCACComparison,
  getDateRange
  // getDailyAdSpendForPastThreeMonths
};
