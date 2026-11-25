const mongoose = require('mongoose');

const { Schema, model } = mongoose;
const ref = (name, extra = {}) => ({ type: Schema.Types.ObjectId, ref: name, ...extra });
const owner = ref('User', { required: true, index: true });
const options = { timestamps: true };
const emailField = { type: String, trim: true, lowercase: true, match: [/^\S+@\S+\.\S+$/, 'Enter a valid email address'] };

const User = model('User', new Schema({
  name: { type: String, required: true, trim: true },
  email: { ...emailField, required: true, unique: true },
  password: { type: String, required: true },
  storeName: { type: String, trim: true, default: 'My Store' },
  city: { type: String, trim: true, default: 'Delhi' },
  role: { type: String, enum: ['owner', 'manager', 'staff', 'viewer'], default: 'owner' },
  workspace: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  active: { type: Boolean, default: true },
  lastLoginAt: Date,
}, options));

const Supplier = model('Supplier', new Schema({
  owner,
  name: { type: String, required: [true, 'Supplier name is required'], trim: true },
  phone: { type: String, trim: true },
  email: emailField,
  address: { type: String, trim: true },
  city: { type: String, trim: true },
  state: { type: String, trim: true },
}, options));

const customerSchema = new Schema({
  owner,
  name: { type: String, required: [true, 'Customer name is required'], trim: true },
  phone: { type: String, trim: true, match: [/^\d{10}$/, 'Phone must be 10 digits'] },
  email: emailField,
  address: { type: String, trim: true },
  city: { type: String, trim: true },
  state: { type: String, trim: true },
  country: { type: String, trim: true },
  pincode: { type: String, trim: true, match: [/^\d{6}$/, 'Pincode must be 6 digits'] },
  externalRef: { type: String, trim: true },
  lat: Number,
  lng: Number,
}, options);
customerSchema.index({ owner: 1, externalRef: 1 });
const Customer = model('Customer', customerSchema);

const productSchema = new Schema({
  owner,
  name: { type: String, required: [true, 'Product name is required'], trim: true },
  brand: { type: String, trim: true },
  sku: { type: String, required: [true, 'SKU is required'], uppercase: true, trim: true },
  category: { type: String, default: 'General', trim: true },
  price: { type: Number, required: [true, 'Price is required'], min: [0, 'Price cannot be negative'] },
  stock: { type: Number, default: 0, min: [0, 'Stock cannot be negative'] },
  reorderLevel: { type: Number, required: [true, 'Reorder level is required'], default: 10, min: [0, 'Reorder level cannot be negative'] },
  supplier: ref('Supplier'),
}, options);
productSchema.index({ owner: 1, sku: 1 }, { unique: true });
const Product = model('Product', productSchema);

const OrderItem = new Schema({
  product: ref('Product'),
  name: String,
  sku: String,
  category: String,
  price: Number,
  quantity: Number,
}, { _id: false });

const orderSchema = new Schema({
  owner,
  orderNo: { type: String, required: true },
  customer: ref('Customer', { required: true }),
  items: [OrderItem],
  subtotal: Number,
  discountPercent: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: Number,
  paymentMethod: { type: String, enum: ['UPI', 'Cash', 'Card', 'Credit'], default: 'UPI' },
  status: { type: String, enum: ['Placed', 'Delivered', 'Cancelled'], default: 'Placed' },
  city: String,
  state: String,
  country: String,
  servedBy: String,
  lat: Number,
  lng: Number,
}, options);
orderSchema.index({ owner: 1, orderNo: 1 }, { unique: true });
orderSchema.index({ owner: 1, createdAt: -1 });
const Order = model('Order', orderSchema);

const stockLogSchema = new Schema({
  owner,
  product: ref('Product'),
  change: Number,
  balance: Number,
  reason: String,
  by: String,
}, options);
stockLogSchema.index({ owner: 1, createdAt: -1 });
const StockLog = model('StockLog', stockLogSchema);

const Counter = model('Counter', new Schema({
  _id: String,
  seq: { type: Number, default: 0 },
}));

module.exports = { User, Supplier, Customer, Product, Order, StockLog, Counter };
