import mongoose from 'mongoose';
const { Schema } = mongoose;

// Schema for Overhead Costs
const OverheadCostSchema = new Schema({
  shopId: { type: String, required: true }, 
  year: { type: Number, required: true }, 
  month: { type: Number, required: true }, 
  overheadCost: { type: Number, required: true }, 
  currency: { type: String, default: 'USD' }, 
  createdAt: { type: Date, default: Date.now }, 
  updatedAt: { type: Date, default: Date.now } 
});

OverheadCostSchema.index({ shopId: 1, year: 1, month: 1 }, { unique: true });

const OverheadCost = mongoose.model('OverheadCost', OverheadCostSchema);
export default OverheadCost;
