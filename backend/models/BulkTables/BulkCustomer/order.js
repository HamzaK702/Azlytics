
import mongoose from 'mongoose';
import lineItemSchema from './lineItem.js';
const { Schema } = mongoose;

const orderSchema = new Schema({
  id: String,
  name: String,
  totalPrice: String,
  currencyCode: String,
  processedAt: Date,
  lineItems: [lineItemSchema], 
});

export default orderSchema;
