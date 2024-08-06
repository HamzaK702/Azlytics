import mongoose from 'mongoose';
import addressSchema from '../BulkCustomer/address.js';
import lineItemSchema from '../BulkCustomer/lineItem.js';
const { Schema } = mongoose;

const orderSchema = new Schema({
  id: String,
  billingAddress: addressSchema,
  cancelReason: String,
  cancelledAt: Date,
  closed: Boolean,
  closedAt: Date,
  createdAt: Date,
  currencyCode: String,
  currentSubtotalLineItemsQuantity: Number,
  customAttributes: [Schema.Types.Mixed],
  customer: Schema.Types.Mixed,
  customerLocale: String,
  displayFinancialStatus: String,
  displayFulfillmentStatus: String,
  email: String,
  name: String,
  note: String,
  originalTotalPriceSet: Schema.Types.Mixed,
  paymentGatewayNames: [String],
  phone: String,
  processedAt: Date,
  shippingAddress: addressSchema,
  subtotalPrice: String,
  tags: [String],
  taxLines: [Schema.Types.Mixed],
  totalPrice: String,
  totalRefunded: String,
  transactions: [Schema.Types.Mixed],
  updatedAt: Date,
  lineItems: [lineItemSchema],
  userShopId: { type: Schema.Types.ObjectId, ref: 'UserShop' },  
  shopName: String 
});

const Order = mongoose.model('Order', orderSchema);
export default Order;
