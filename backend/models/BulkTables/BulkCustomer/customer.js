
import mongoose from 'mongoose';
import addressSchema from './address.js';
const { Schema } = mongoose;

const customerSchema = new Schema({
  id: String,
  addresses: [addressSchema],
  createdAt: Date,
  updatedAt: Date,
  displayName: String,
  email: String,
  firstName: String,
  lastName: String,
  phone: String,
  lastOrder: Schema.Types.Mixed,
  note: String,
  defaultAddress: addressSchema,
  state: String,
  tags: [String],
  numberOfOrders: String,
  verifiedEmail: Boolean,
});

const Customer = mongoose.model('Customer', customerSchema);
export default Customer;
