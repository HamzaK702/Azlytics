import Order from "../models/BulkTables/BulkOrder/order.js";
import Customer from "../models/BulkTables/BulkCustomer/customer.js";
import Product from "../models/BulkTables/BulkProduct/product.js";

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



