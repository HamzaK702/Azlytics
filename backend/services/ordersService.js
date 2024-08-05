import Order from "../models/BulkTables/BulkOrder/order.js";
import Customer from "../models/BulkTables/BulkCustomer/customer.js"

const getOrdersTrend = async () => {
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

export default getOrdersTrend;
