import mongoose from 'mongoose';
const { Schema } = mongoose;

const lineItemSchema = new Schema({
  id: String,
  title: String,
  quantity: Number,
  __parentId: String,
});

const LineItem = mongoose.model('LineItem', lineItemSchema);
export default LineItem;
