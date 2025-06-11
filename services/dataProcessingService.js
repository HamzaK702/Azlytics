import Customer from "../models/BulkTables/BulkCustomer/customer.js";
import Order from "../models/BulkTables/BulkOrder/order.js";
import ShippingRate from "../models/BulkTables/BulkOrder/shippingRate.js";
import Product from "../models/BulkTables/BulkProduct/product.js";
import UserShop from "../models/userShopModel.js";
import { ShopifyService } from "./ShopifyService.js";

export const saveCustomerData = async (bulkData, operation) => {
    try {
       
        for (const item of bulkData) {
            if (item.id.startsWith("gid://shopify/Customer")) {
                // Find the customer by ID
                customer = new Customer({
                    ...item,
                    userShopId: userShop?._id,
                });

                // Save the customer
                await customer.save();
            } else if (item.id.startsWith("gid://shopify/Order")) {
                // Find the parent customer
                const customer = await Customer.findOne({
                    id: item.__parentId,
                });

                if (customer) {
                    // Add the order to the customer's orders array
                    const order = customer.orders.id(item.id);
                    if (!order) {
                        customer.orders.push(item);
                        await customer.save();
                    }
                }
            } else if (item.id.startsWith("gid://shopify/LineItem")) {
                // Find the parent order
                const customer = await Customer.findOne({
                    "orders.id": item.__parentId,
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

        console.log("Data saved successfully");
    } catch (error) {
        console.error("Error saving data:", error.message);
    }
};

export const saveOrderData = async (bulkData, userShopId) => {
    try {
        const userShop = await UserShop.findById(userShopId);
        if (!userShop) {
            throw new Error("UserShop not found");
        }
        const token = userShop.token;

        console.log("bulkData", bulkData.length);
        for (const item of bulkData) {
            if (!item || !item.id) {
                continue; // Skip invalid items
            }

            if (item.id.startsWith("gid://shopify/Order")) {
                order = new Order({
                    ...item,
                    userShopId,
                });
                // Save the order
                order.save();
            } else if (item.id.startsWith("gid://shopify/LineItem")) {
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
                const resp = await ShopifyService.getShippingRates(
                    shopName,
                    token,
                    order.id
                );
                console.log("order.id: ", order.id);
                console.log(resp);
                if (resp) {
                    await ShippingRate.findOneAndUpdate(
                        { orderId: order.id },
                        {
                            orderId: order.id,
                            title: resp.title,
                            price: resp.price,
                            shippingRateHandle: resp.shippingRateHandle,
                            discountAllocations: resp.discountAllocations,
                        },
                        { upsert: true, new: true }
                    );
                }

                //Example respone:
                //order.id:  gid://shopify/Order/6052399480893
                // {
                //     title: 'International Shipping',
                //     price: '60.00',
                //     shippingRateHandle: 'shopify-International%20Shipping-60.00',
                //     discountAllocations: []
                //   }

                //Create a new table lets call it shippingRates with the fields
                // orderId: --> order.id
                // title: --> resp.title
                // price -->  resp.price
                // shippingRateHandle: --> resp.shippingRateHandle
                // discountAllocations: --> resp.discountAllocations

                //create the update or create function meaning if orderId already exists then update it, if it doesn't exist then create new entry
                //Only save the data if resp is not null.
            }
        }

        console.log("Data saved successfully");
    } catch (error) {
        console.error("Error saving data:", error.message);
    }
};

export const saveProductData = async (bulkData, userShopId) => {
    try {
        const userShop = await UserShop.findById(userShopId);
        if (!userShop) {
            throw new Error("UserShop not found");
        }

        for (const item of bulkData) {
            console.log(item);

            if (
                item &&
                item.id &&
                item.id.startsWith("gid://shopify/Product")
            ) {
                product = new Product({
                    ...item,
                    userShopId: userShop?._id,
                });
                // Save the product
                await product.save();
            } else if (
                item &&
                item.id &&
                item.id.startsWith("gid://shopify/ProductVariant")
            ) {
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

        console.log("Product data saved successfully");
    } catch (error) {
        console.error("Error saving product data:", error.message);
    }
};
