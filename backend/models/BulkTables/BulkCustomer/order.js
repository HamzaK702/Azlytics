import mongoose from 'mongoose';
const { Schema } = mongoose;

const orderSchema = new Schema({
  id: String,
  name: String,
  totalPrice: String,
  currencyCode: String,
  processedAt: Date,
  __parentId: String,
});

const Order = mongoose.model('Order', orderSchema);
export default Order;
