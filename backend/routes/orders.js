const router = require('express').Router();
const { Order, Product, Customer, StockLog, Counter } = require('../models');
const { wrap, fail } = require('../utils');

const withCustomer = (query) => query.populate('customer', 'name phone email address city state pincode');

const nextOrderNo = async (owner) => {
  const counter = await Counter.findOneAndUpdate({ _id: `order:${owner}` }, { $inc: { seq: 1 } }, { upsert: true, new: true });
  return `ORD-${1000 + counter.seq}`;
};

router.get('/', wrap(async (req, res) => {
  res.json(await withCustomer(Order.find({ owner: req.owner }).sort({ createdAt: -1 })));
}));

router.post('/', wrap(async (req, res) => {
  const { customer, items } = req.body;
  const paymentMethod = ['UPI', 'Cash', 'Card', 'Credit'].includes(req.body.paymentMethod) ? req.body.paymentMethod : 'UPI';
  const discountPercent = Math.min(Math.max(Number(req.body.discountPercent) || 0, 0), 50);
  if (!customer) throw fail(400, 'Select a customer');
  const buyer = await Customer.findOne({ _id: customer, owner: req.owner });
  if (!buyer) throw fail(400, 'Customer not found');
  if (!Array.isArray(items) || items.length === 0) throw fail(400, 'Add at least one item');

  const wanted = new Map();
  for (const item of items) {
    const quantity = Number(item.quantity);
    if (!item.product) throw fail(400, 'Select a product for every line');
    if (!Number.isInteger(quantity) || quantity < 1) throw fail(400, 'Quantity must be a whole number of at least 1');
    wanted.set(item.product, (wanted.get(item.product) || 0) + quantity);
  }

  const reserved = [];
  const lines = [];
  let order = null;

  try {
    for (const [productId, quantity] of wanted) {
      const product = await Product.findOneAndUpdate(
        { _id: productId, owner: req.owner, stock: { $gte: quantity } },
        { $inc: { stock: -quantity } },
        { new: true }
      );
      if (!product) {
        const found = await Product.findOne({ _id: productId, owner: req.owner });
        throw fail(400, found ? `Only ${found.stock} units of ${found.name} in stock` : 'Product not found');
      }
      reserved.push([product._id, quantity]);
      lines.push({ product: product._id, name: product.name, sku: product.sku, category: product.category, price: product.price, quantity, balance: product.stock });
    }

    const orderNo = await nextOrderNo(req.owner);
    const subtotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
    const discount = Math.round((subtotal * discountPercent) / 100);
    order = await Order.create({
      owner: req.owner,
      orderNo,
      customer: buyer._id,
      items: lines.map(({ balance, ...line }) => line),
      subtotal,
      discountPercent,
      discount,
      total: subtotal - discount,
      paymentMethod,
      city: buyer.city,
      state: buyer.state,
      lat: buyer.lat,
      lng: buyer.lng,
    });
    await StockLog.insertMany(lines.map((line) => ({
      owner: req.owner,
      product: line.product,
      change: -line.quantity,
      balance: line.balance,
      reason: `Order ${orderNo}`,
    })));
    res.status(201).json(await withCustomer(Order.findById(order._id)));
  } catch (error) {
    await Promise.all(reserved.map(([id, quantity]) => Product.updateOne({ _id: id, owner: req.owner }, { $inc: { stock: quantity } })));
    if (order) await order.deleteOne();
    throw error;
  }
}));

router.put('/:id/status', wrap(async (req, res) => {
  const { status } = req.body;
  if (!['Delivered', 'Cancelled'].includes(status)) throw fail(400, 'Invalid status');

  const order = await Order.findOneAndUpdate({ _id: req.params.id, owner: req.owner, status: 'Placed' }, { status }, { new: true });
  if (!order) {
    const existing = await Order.findOne({ _id: req.params.id, owner: req.owner });
    throw existing ? fail(400, `Order is already ${existing.status}`) : fail(404, 'Order not found');
  }

  if (status === 'Cancelled') {
    for (const item of order.items) {
      const product = await Product.findOneAndUpdate({ _id: item.product, owner: req.owner }, { $inc: { stock: item.quantity } }, { new: true });
      if (product) {
        await StockLog.create({ owner: req.owner, product: product._id, change: item.quantity, balance: product.stock, reason: `Cancelled ${order.orderNo}` });
      }
    }
  }
  res.json(await withCustomer(Order.findById(order._id)));
}));

module.exports = router;
