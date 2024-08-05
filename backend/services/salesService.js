import Order from "./../models/BulkTables/BulkOrder/order.js";
import Customer from "./../models/BulkTables/BulkCustomer/customer.js";

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

export default {
  getSalesTrends,
  getAOV
};
