
import mongoose from 'mongoose';
import productSchema from '../BulkOrder/product.js';
const { Schema } = mongoose;

const lineItemSchema = new Schema({
  id: String,
  title: String,
  quantity: Number,
  product: productSchema,
  __parentId: String,
});

export default lineItemSchema;
