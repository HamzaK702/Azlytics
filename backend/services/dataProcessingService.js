
import Customer from '../models/BulkTables/BulkCustomer/customer.js';
import Order from '../models/BulkTables/BulkOrder/order.js';
import Product from '../models/BulkTables/BulkProduct/product.js';

export const saveCustomerData = async (bulkData , userShopId , shopName ) => {
  try {
    for (const item of bulkData) {
      if (item.id.startsWith('gid://shopify/Customer')) {
        // Find the customer by ID
        let customer = await Customer.findOne({ id: item.id });

        // If customer doesn't exist, create a new one
        if (!customer) {
          customer = new Customer({...item , userShopId , shopName});
        } else {
          // If customer exists, update it
          Object.assign(customer, item);
          customer.userShopId = userShopId;
          customer.shopName = shopName;
        }

        // Save the customer
        await customer.save();
      } else if (item.id.startsWith('gid://shopify/Order')) {
        // Find the parent customer
        const customer = await Customer.findOne({ id: item.__parentId });

        if (customer) {
          // Add the order to the customer's orders array
          const order = customer.orders.id(item.id);
          if (!order) {
            customer.orders.push(item);
            await customer.save();
          }
        }
      } else if (item.id.startsWith('gid://shopify/LineItem')) {
        // Find the parent order
        const customer = await Customer.findOne({
          'orders.id': item.__parentId,
        });

        if (customer) {
          const order = customer.orders.id(item.__parentId);
          if (order) {
            // Add the line item to the order's lineItems array
            const lineItem = order.lineItems.id(item.id);
            if (!lineItem) {
              order.lineItems.push(item);
              await customer.save();
            }
          }
        }
      }
    }
    console.log('Data saved successfully');
  } catch (error) {
    console.error('Error saving data:', error.message);
  }
}
 
export const saveOrderData = async (bulkData , userShopId , shopName ) => {
    try {
      for (const item of bulkData) {
        if (!item || !item.id) {
          continue; // Skip invalid items
        }
  
        if (item.id.startsWith('gid://shopify/Order')) {
          // Find the order by ID
          let order = await Order.findOne({ id: item.id });
  
          // If order doesn't exist, create a new one
          if (!order) {
            order = new Order({...item , userShopId , shopName});
          } else {
            // If order exists, update it
            Object.assign(order, item);
            order.userShopId = userShopId;
          order.shopName = shopName;
          }
  
          // Save the order
          await order.save();
        } else if (item.id.startsWith('gid://shopify/LineItem')) {
          // Find the parent order
          if (!item.__parentId) {
            continue; // Skip if no parent ID is provided
          }
  
          const order = await Order.findOne({ id: item.__parentId });
  
          if (order) {
            // Check if line item already exists
            const existingLineItem = order.lineItems.id(item.id);
            if (!existingLineItem) {
              // Add the line item to the order's lineItems array
              order.lineItems.push(item);
              await order.save();
            }
          }
        }
      }
      console.log('Data saved successfully');
    } catch (error) {
      console.error('Error saving data:', error.message);
    }
  };
  
  export const saveProductData = async (bulkData , userShopId , shopName ) => {
    try {
      for (const item of bulkData) {
        if (item && item.id && item.id.startsWith('gid://shopify/Product')) {
          // Find the product by ID
          let product = await Product.findOne({ id: item.id });
  
          // If product doesn't exist, create a new one
          if (!product) {
            product = new Product({...item , userShopId , shopName});
          } else {
            // If product exists, update it
            Object.assign(product, item);
            product.userShopId = userShopId;
          product.shopName = shopName;
          }
  
          // Save the product
          await product.save();
        } else if (item && item.id && item.id.startsWith('gid://shopify/ProductVariant')) {
          // Find the parent product
          const product = await Product.findOne({ id: item.__parentId });
  
          if (product) {
            // Add the variant to the product's variants array
            const variant = product.variants.id(item.id);
            if (!variant) {
              product.variants.push(item);
              await product.save();
            }
          }
        }
      }
      console.log('Product data saved successfully');
    } catch (error) {
      console.error('Error saving product data:', error.message);
    }
  }