
import mongoose from 'mongoose';
import productSchema from '../BulkOrder/product.js';
const { Schema } = mongoose;

const lineItemSchema = new Schema({
  id: String,
  title: String,
  quantity: Number,
  price: String,      // Unit price of the line item
  cost: String,       // Unit cost of the line item (if available)
  variantId: String,  // ID of the variant sold
  productId: String,  // ID of the product
  product: productSchema,
  __parentId: String,
});

export default lineItemSchema;
