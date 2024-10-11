import mongoose from 'mongoose';
const { Schema } = mongoose;

const ProductImageSchema = new Schema({
  id: { type: String },
  src: { type: String },
  altText: { type: String },
}, { _id: false });


// Schema for Product Variants
const ProductVariantSchema = new Schema({
  id: { type: String },
  compareAtPrice: { type: String, default: null },
  displayName: { type: String },
  image: {
    id: { type: String, default: null },
    src: { type: String, default: null },
    altText: { type: String, default: null },
    originalSrc: { type: String, default: null },
    transformedSrc: { type: String, default: null }
  },
  inventoryItem: {
    id: { type: String },
    unitCost: {
      amount: { type: String, default: null },
      currencyCode: { type: String, default: null }
    }
  },
  legacyResourceId: { type: String },
  price: { type: String },
  costPrice: { type: String, default: '0.00' },
  userPrice: { type: String, default: '0.00' }, 
  product: { id: { type: String } },
  requiresShipping: { type: Boolean },
  selectedOptions: [{ type: Schema.Types.Mixed }],
  sku: { type: String, default: '' },
  taxCode: { type: String, default: '' },
  taxable: { type: Boolean },
  title: { type: String },
  updatedAt: { type: Date },
  weight: { type: Number, default: 0 },
  weightUnit: { type: String, default: 'KILOGRAMS' },
  available: { type: Number, default: 0 },
  location: {
    id: { type: String },
    name: { type: String }
  }
}, { _id: false });

// Schema for Products
const ProductSchema = new Schema({
  id: { type: String },
  status: { type: String },
  createdAt: { type: Date },
  description: { type: String, default: '' },
  descriptionHtml: { type: String, default: '' },
  onlineStoreUrl: { type: String, default: null },
  options: [{ type: Schema.Types.Mixed }],
  productType: { type: String, default: '' },
  publishedAt: { type: Date, default: null },
  seo: {
    description: { type: String, default: null },
    title: { type: String, default: null }
  },
  tags: [{ type: String }],
  title: { type: String },
  totalInventory: { type: Number },
  updatedAt: { type: Date },
  variants: [ProductVariantSchema],
  images: [ProductImageSchema],
  userShopId: { type: Schema.Types.ObjectId, ref: 'UserShop' },  
  shopName: String,
}, { strict: false });

const Product = mongoose.model('Product', ProductSchema);
export default Product;
