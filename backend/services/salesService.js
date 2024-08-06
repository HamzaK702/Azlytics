import Order from "./../models/BulkTables/BulkOrder/order.js";
import Customer from "./../models/BulkTables/BulkCustomer/customer.js";
import LineItem from "./../models/BulkTables/BulkCustomer/lineItem.js";

// Aggregates total sales by date
const aggregateTotalSales = () => {
  return Order.aggregate([
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        totalSales: { $sum: { $toDouble: "$totalPrice" } } // Ensure totalPrice is treated as a number
      }
    },
    {
      $project: {
        _id: 0,
        orderDate: "$_id",
        totalSales: 1
      }
    }
  ]);
};


// Aggregates sales from new customers by date
const aggregateNewCustomerSales = () => {
  return Order.aggregate([
    {
      $lookup: {
        from: "customers",
        localField: "customer.id",
        foreignField: "id",
        as: "customer"
      }
    },
    { $unwind: "$customer" },
    {
      $project: {
        createdAt: 1,
        totalPrice: { $toDouble: "$totalPrice" }, // Ensure totalPrice is treated as a number
        isNewCustomer: {
          $eq: [
            { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            { $dateToString: { format: "%Y-%m-%d", date: "$customer.createdAt" } }
          ]
        }
      }
    },
    { $match: { isNewCustomer: true } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        newCustomerSales: { $sum: "$totalPrice" }
      }
    },
    {
      $project: {
        _id: 0,
        orderDate: "$_id",
        newCustomerSales: 1
      }
    }
  ]);
};

// Aggregates sales from returning customers by date
const aggregateReturningCustomerSales = () => {
  return Order.aggregate([
    {
      $lookup: {
        from: "customers",
        localField: "customer.id",
        foreignField: "id",
        as: "customer"
      }
    },
    { $unwind: "$customer" },
    {
      $project: {
        createdAt: 1,
        totalPrice: { $toDouble: "$totalPrice" }, // Ensure totalPrice is treated as a number
        isReturningCustomer: {
          $gt: [
            { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            { $dateToString: { format: "%Y-%m-%d", date: "$customer.createdAt" } }
          ]
        }
      }
    },
    { $match: { isReturningCustomer: true } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        returningCustomerSales: { $sum: "$totalPrice" }
      }
    },
    {
      $project: {
        _id: 0,
        orderDate: "$_id",
        returningCustomerSales: 1
      }
    }
  ]);
};

// Combines sales trends into a single dataset
const getSalesTrends = async () => {
  const [totalSales, newCustomerSales, returningCustomerSales] = await Promise.all([
    aggregateTotalSales(),
    aggregateNewCustomerSales(),
    aggregateReturningCustomerSales()
  ]);

  console.log('Total Sales:', totalSales);
  console.log('New Customer Sales:', newCustomerSales);
  console.log('Returning Customer Sales:', returningCustomerSales);

  return totalSales.map(totalSale => {
    const newCustomerSale = newCustomerSales.find(nc => nc.orderDate === totalSale.orderDate) || { newCustomerSales: 0 };
    const returningCustomerSale = returningCustomerSales.find(rc => rc.orderDate === totalSale.orderDate) || { returningCustomerSales: 0 };

    return {
      orderDate: totalSale.orderDate,
      totalSales: totalSale.totalSales,
      newCustomerSales: newCustomerSale.newCustomerSales,
      returningCustomerSales: returningCustomerSale.returningCustomerSales
    };
  });
};

// Computes the average order value (AOV) for each date
const getAOV = async () => {
  const [totalSales, newCustomerSales, returningCustomerSales] = await Promise.all([
    aggregateTotalSales(),
    aggregateNewCustomerSales(),
    aggregateReturningCustomerSales()
  ]);

  console.log('Total Sales:', totalSales);
  console.log('New Customer Sales:', newCustomerSales);
  console.log('Returning Customer Sales:', returningCustomerSales);

  return totalSales.map(totalSale => {
    const newCustomerSale = newCustomerSales.find(nc => nc.orderDate === totalSale.orderDate) || { newCustomerSales: 0, newCustomerOrders: 0 };
    const returningCustomerSale = returningCustomerSales.find(rc => rc.orderDate === totalSale.orderDate) || { returningCustomerSales: 0, returningCustomerOrders: 0 };

    const combinedAOV = totalSale.totalSales / (totalSale.totalOrders || 1);
    const newCustomerAOV = newCustomerSale.newCustomerSales / (newCustomerSale.newCustomerOrders || 1);
    const returningCustomerAOV = returningCustomerSale.returningCustomerSales / (returningCustomerSale.returningCustomerOrders || 1);

    return {
      orderDate: totalSale.orderDate,
      combinedAOV,
      newCustomerAOV,
      returningCustomerAOV
    };
  });
};

const getTopCities = async () => {
  try {
    const orders = await Order.find({}, 'createdAt customer.id shippingAddress.city').populate('customer.id', 'createdAt numberOfOrders');
    const customerData = await Customer.find({}, 'id createdAt numberOfOrders');
   

    const cityData = {
      newCustomers: {},
      returningCustomers: {},
    };

    orders.forEach(order => {
      if (!order.customer || !order.customer.id) return; 

      const customer = customerData.find(c => c.id === order.customer.id);
      console.log("customer check" , customer);


      if (customer) {
        const isNewCustomer = customer.numberOfOrders === '1'; // Adjust based on your numberOfOrders field type
        const city = order.shippingAddress.city;

        if (isNewCustomer) {
          if (!cityData.newCustomers[city]) cityData.newCustomers[city] = 0;
          cityData.newCustomers[city]++;
        } else {
          if (!cityData.returningCustomers[city]) cityData.returningCustomers[city] = 0;
          cityData.returningCustomers[city]++;
        }
      }
    });

    const rankedNewCustomers = Object.entries(cityData.newCustomers)
      .sort((a, b) => b[1] - a[1])
      .map(([city, count]) => ({ city, count }));

    const rankedReturningCustomers = Object.entries(cityData.returningCustomers)
      .sort((a, b) => b[1] - a[1])
      .map(([city, count]) => ({ city, count }));

    return { rankedNewCustomers, rankedReturningCustomers };
  } catch (error) {
    throw new Error(error.message);
  }
};

const getTopSKUs = async () => {
  try {
  
    const orders = await Order.find({}, 'id createdAt customer.id');

    const lineItems = await LineItem.find({}, 'id quantity product __parentId');
   
    const customers = await Customer.find({}, 'id createdAt numberOfOrders');

    const skuData = {
      newCustomers: {},
      returningCustomers: {},
    };

    orders.forEach(order => {
      const customer = customers.find(c => c.id === order.customer.id);
      if (!customer) return;

      const isNewCustomer = customer.numberOfOrders === '1';
      const orderLineItems = lineItems.filter(item => item.__parentId === order.id);

      orderLineItems.forEach(item => {
        const sku = item.product.sku;
        const quantity = item.quantity;

        if (isNewCustomer) {
          if (!skuData.newCustomers[sku]) skuData.newCustomers[sku] = 0;
          skuData.newCustomers[sku] += quantity;
        } else {
          if (!skuData.returningCustomers[sku]) skuData.returningCustomers[sku] = 0;
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


export default {
  getSalesTrends,
  getAOV,
  getTopCities,
  getTopSKUs
};
