const router = require('express').Router();
const { Product, Supplier, Customer, Order, StockLog } = require('../models');
const { wrap, fail } = require('../utils');
const { findCity } = require('../data/cities');

const blocked = ['_id', 'owner', 'createdAt', 'updatedAt', '__v'];
const has = (v) => v !== undefined && v !== null && v !== '' && Number.isFinite(Number(v));

const clean = (body, dropEmpty) =>
  Object.fromEntries(
    Object.entries(body)
      .filter(([key, value]) => !blocked.includes(key) && !(dropEmpty && value === ''))
      .map(([key, value]) => [key, value === '' ? null : value])
  );

const withGeo = (body, doc) => {
  const place = findCity(body.city);
  if (!place) return body;
  const next = { ...body, state: place.state };
  if (has(body.lat) && has(body.lng)) {
    next.lat = Number(body.lat);
    next.lng = Number(body.lng);
  } else if (doc && doc.city === body.city && has(doc.lat)) {
    delete next.lat;
    delete next.lng;
  } else {
    next.lat = place.lat;
    next.lng = place.lng;
  }
  return next;
};

function crud(path, Model, config = {}) {
  const { populate, lockOnUpdate = [], usedBy, afterCreate, afterDelete, prepare = (body) => body } = config;
  const finish = (doc) => (populate ? doc.populate(populate) : doc);

  router.get(path, wrap(async (req, res) => {
    const query = Model.find({ owner: req.owner }).sort({ createdAt: -1 });
    res.json(await (populate ? query.populate(populate) : query));
  }));

  router.post(path, wrap(async (req, res) => {
    const doc = await Model.create({ ...prepare(clean(req.body, true)), owner: req.owner });
    if (afterCreate) await afterCreate(doc);
    res.status(201).json(await finish(doc));
  }));

  router.put(`${path}/:id`, wrap(async (req, res) => {
    const doc = await Model.findOne({ _id: req.params.id, owner: req.owner });
    if (!doc) throw fail(404, 'Record not found');
    const body = prepare(clean(req.body, false), doc);
    lockOnUpdate.forEach((key) => delete body[key]);
    doc.set(body);
    await doc.save();
    res.json(await finish(doc));
  }));

  router.delete(`${path}/:id`, wrap(async (req, res) => {
    const doc = await Model.findOne({ _id: req.params.id, owner: req.owner });
    if (!doc) throw fail(404, 'Record not found');
    if (usedBy && (await usedBy(doc))) throw fail(400, 'Cannot delete this record because other records depend on it');
    await doc.deleteOne();
    if (afterDelete) await afterDelete(doc);
    res.json({ message: 'Deleted' });
  }));
}

crud('/products', Product, {
  populate: 'supplier',
  lockOnUpdate: ['stock'],
  usedBy: (doc) => Order.exists({ owner: doc.owner, 'items.product': doc._id }),
  afterCreate: (doc) =>
    doc.stock > 0 && StockLog.create({ owner: doc.owner, product: doc._id, change: doc.stock, balance: doc.stock, reason: 'Opening stock' }),
  afterDelete: (doc) => StockLog.deleteMany({ owner: doc.owner, product: doc._id }),
});

crud('/suppliers', Supplier, {
  prepare: withGeo,
  usedBy: (doc) => Product.exists({ owner: doc.owner, supplier: doc._id }),
});

crud('/customers', Customer, {
  prepare: withGeo,
  usedBy: (doc) => Order.exists({ owner: doc.owner, customer: doc._id }),
});

router.post('/products/:id/stock', wrap(async (req, res) => {
  const change = Number(req.body.change);
  if (!Number.isInteger(change) || change === 0) throw fail(400, 'Enter a whole number other than zero');
  const filter = { _id: req.params.id, owner: req.owner };
  if (change < 0) filter.stock = { $gte: -change };
  const product = await Product.findOneAndUpdate(filter, { $inc: { stock: change } }, { new: true });
  if (!product) {
    const exists = await Product.exists({ _id: req.params.id, owner: req.owner });
    throw exists ? fail(400, 'Not enough stock to remove that quantity') : fail(404, 'Product not found');
  }
  await StockLog.create({
    owner: req.owner,
    product: product._id,
    change,
    balance: product.stock,
    reason: String(req.body.reason || '').trim() || (change > 0 ? 'Restock' : 'Correction'),
  });
  res.json(product);
}));

router.get('/stock-logs', wrap(async (req, res) => {
  res.json(await StockLog.find({ owner: req.owner }).sort({ createdAt: -1 }).limit(600).populate('product', 'name sku'));
}));

module.exports = router;
