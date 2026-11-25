const router = require('express').Router();
const express = require('express');
const mongoose = require('mongoose');
const { Product, Supplier, Customer, Order, StockLog } = require('../models');
const { findCity } = require('../data/cities');
const { wrap, fail } = require('../utils');
const requires = require('../middleware/can');

router.use(requires('import:run'));
router.use(express.json({ limit: '3mb' }));

const MAX_ROWS = 6000;
const PAYMENTS = ['UPI', 'Cash', 'Card', 'Credit'];
const oid = () => new mongoose.Types.ObjectId();
const text = (v) => (v === undefined || v === null ? '' : String(v).trim());
const ref = (v) => text(v).replace(/\.0+$/, '');
const num = (v) => {
  if (v === '' || v === null || v === undefined) return NaN;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};
const stamp = (d) => ({ createdAt: d, updatedAt: d });
const compact = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== ''));
const emailOf = (v) => {
  const e = text(v).toLowerCase();
  return /^\S+@\S+\.\S+$/.test(e) ? e : '';
};
const phoneOf = (v) => {
  const d = text(v).replace(/\D/g, '');
  return d.length >= 10 ? d.slice(-10) : '';
};
const pinOf = (v) => {
  const d = text(v).replace(/\D/g, '');
  return d.length === 6 ? d : '';
};
const hash = (s) => {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h.toString(36).toUpperCase();
};
const rowsOf = (list) => {
  if (!Array.isArray(list) || list.length === 0) throw fail(400, 'There are no rows to import');
  if (list.length > MAX_ROWS) throw fail(400, `Send at most ${MAX_ROWS} rows per request`);
  return list;
};
const note = (errors, row, message) => {
  if (errors.length < 25) errors.push({ row, message });
};
const insert = async (Model, docs) => {
  if (docs.length) await Model.collection.insertMany(docs, { ordered: false });
};
const geoFor = (city) => {
  const place = findCity(city);
  return place ? { state: place.state, lat: place.lat, lng: place.lng, country: 'India' } : {};
};

async function ensureSuppliers(owner, names) {
  const map = new Map();
  if (!names.length) return map;
  (await Supplier.find({ owner }, 'name')).forEach((s) => map.set(s.name.toLowerCase(), s._id));
  const now = new Date();
  const fresh = [];
  names.forEach((name) => {
    const key = name.toLowerCase();
    if (!map.has(key)) {
      const _id = oid();
      map.set(key, _id);
      fresh.push({ _id, owner, name, ...stamp(now) });
    }
  });
  await insert(Supplier, fresh);
  return map;
}

router.post('/products', wrap(async (req, res) => {
  const rows = rowsOf(req.body.rows);
  const owner = req.owner;
  const update = req.body.mode === 'update';
  const out = { inserted: 0, updated: 0, skipped: 0, errors: [] };
  const suppliers = await ensureSuppliers(owner, [...new Set(rows.map((r) => text(r.supplier)).filter(Boolean))]);

  const seen = new Set();
  const items = [];
  rows.forEach((r, i) => {
    const name = text(r.name);
    const price = num(r.price);
    if (!name) { out.skipped++; return note(out.errors, i + 1, 'Missing product name'); }
    if (!(price >= 0)) { out.skipped++; return note(out.errors, i + 1, 'Missing or invalid price'); }
    const sku = (text(r.sku) || `IMP-${hash(name)}`).toUpperCase();
    if (seen.has(sku)) { out.skipped++; return note(out.errors, i + 1, `Duplicate SKU ${sku} in this file`); }
    seen.add(sku);
    items.push({
      sku,
      name,
      price,
      brand: text(r.brand),
      category: text(r.category) || 'General',
      stock: Math.max(0, Math.round(num(r.stock) || 0)),
      reorderLevel: num(r.reorderLevel) >= 0 ? Math.round(num(r.reorderLevel)) : 10,
      supplier: text(r.supplier) ? suppliers.get(text(r.supplier).toLowerCase()) : undefined,
    });
  });

  const existing = new Set((await Product.find({ owner, sku: { $in: items.map((i) => i.sku) } }, 'sku')).map((p) => p.sku));
  const now = new Date();
  const created = [];
  const ops = [];
  items.forEach((it) => {
    if (existing.has(it.sku)) {
      if (!update) { out.skipped++; return; }
      const set = { name: it.name, price: it.price, category: it.category, updatedAt: now };
      if (it.brand) set.brand = it.brand;
      if (it.supplier) set.supplier = it.supplier;
      ops.push({ updateOne: { filter: { owner, sku: it.sku }, update: { $set: set } } });
      return;
    }
    created.push(compact({ _id: oid(), owner, name: it.name, brand: it.brand, sku: it.sku, category: it.category, price: it.price, stock: it.stock, reorderLevel: it.reorderLevel, supplier: it.supplier, ...stamp(now) }));
  });

  await insert(Product, created);
  await insert(StockLog, created.filter((p) => p.stock > 0).map((p) => ({ _id: oid(), owner, product: p._id, change: p.stock, balance: p.stock, reason: 'Imported opening stock', ...stamp(now) })));
  if (ops.length) await Product.bulkWrite(ops);
  out.inserted = created.length;
  out.updated = ops.length;
  res.json(out);
}));

router.post('/suppliers', wrap(async (req, res) => {
  const rows = rowsOf(req.body.rows);
  const owner = req.owner;
  const out = { inserted: 0, skipped: 0, errors: [] };
  const known = new Set((await Supplier.find({ owner }, 'name')).map((s) => s.name.toLowerCase()));
  const now = new Date();
  const docs = [];
  rows.forEach((r, i) => {
    const name = text(r.name);
    if (!name) { out.skipped++; return note(out.errors, i + 1, 'Missing supplier name'); }
    if (known.has(name.toLowerCase())) { out.skipped++; return; }
    known.add(name.toLowerCase());
    docs.push(compact({ _id: oid(), owner, name, phone: phoneOf(r.phone) || text(r.phone), email: emailOf(r.email), address: text(r.address), city: text(r.city), ...geoFor(text(r.city)), ...stamp(now) }));
  });
  await insert(Supplier, docs);
  out.inserted = docs.length;
  res.json(out);
}));

router.post('/customers', wrap(async (req, res) => {
  const rows = rowsOf(req.body.rows);
  const owner = req.owner;
  const out = { inserted: 0, skipped: 0, errors: [] };
  const cleaned = [];
  rows.forEach((r, i) => {
    const name = text(r.name);
    if (!name) { out.skipped++; return note(out.errors, i + 1, 'Missing customer name'); }
    cleaned.push({
      name,
      phone: phoneOf(r.phone),
      email: emailOf(r.email),
      externalRef: ref(r.externalRef),
      city: text(r.city),
      state: text(r.state),
      pincode: pinOf(r.pincode),
      address: text(r.address),
      country: text(r.country),
    });
  });

  const refs = cleaned.map((c) => c.externalRef).filter(Boolean);
  const phones = cleaned.map((c) => c.phone).filter(Boolean);
  const emails = cleaned.map((c) => c.email).filter(Boolean);
  const clauses = [];
  if (refs.length) clauses.push({ externalRef: { $in: refs } });
  if (phones.length) clauses.push({ phone: { $in: phones } });
  if (emails.length) clauses.push({ email: { $in: emails } });
  const existing = clauses.length ? await Customer.find({ owner, $or: clauses }, 'externalRef phone email') : [];
  const taken = new Set();
  existing.forEach((c) => {
    if (c.externalRef) taken.add(`r:${c.externalRef}`);
    if (c.phone) taken.add(`p:${c.phone}`);
    if (c.email) taken.add(`e:${c.email}`);
  });

  const now = new Date();
  const docs = [];
  cleaned.forEach((c) => {
    const keys = [c.externalRef && `r:${c.externalRef}`, c.phone && `p:${c.phone}`, c.email && `e:${c.email}`].filter(Boolean);
    if (keys.some((k) => taken.has(k))) { out.skipped++; return; }
    keys.forEach((k) => taken.add(k));
    const doc = compact({ _id: oid(), owner, name: c.name, phone: c.phone, email: c.email, externalRef: c.externalRef, address: c.address, city: c.city, pincode: c.pincode, country: c.country, state: c.state, ...stamp(now) });
    Object.assign(doc, geoFor(c.city));
    docs.push(doc);
  });
  await insert(Customer, docs);
  out.inserted = docs.length;
  res.json(out);
}));

router.post('/orders', wrap(async (req, res) => {
  const lines = rowsOf(req.body.lines);
  const opt = req.body.options || {};
  const owner = req.owner;
  const startStock = Math.max(0, Math.round(num(opt.startingStock) || 0));
  const payment = PAYMENTS.includes(opt.payment) ? opt.payment : 'UPI';
  const finalStatus = opt.status === 'Placed' ? 'Placed' : 'Delivered';
  const detect = opt.detectCancellations !== false;
  const out = { orders: 0, existingOrders: 0, skippedLines: 0, productsCreated: 0, customersCreated: 0, errors: [] };

  const invoices = new Map();
  lines.forEach((l, i) => {
    const orderNo = text(l.orderNo);
    const sku = text(l.sku).toUpperCase();
    const qty = num(l.quantity);
    const price = num(l.price);
    const date = l.date ? new Date(l.date) : null;
    const cancelled = detect && (/^c\d/i.test(orderNo) || qty < 0);
    const problem = !orderNo ? 'Missing order number'
      : !sku ? 'Missing product code'
      : !(Math.abs(qty) > 0) ? 'Missing or zero quantity'
      : !(price > 0) ? 'Price must be above zero'
      : !date || Number.isNaN(date.getTime()) ? 'Invalid date'
      : qty < 0 && !detect ? 'Negative quantity'
      : '';
    if (problem) { out.skippedLines++; return note(out.errors, i + 1, problem); }
    if (!invoices.has(orderNo)) {
      invoices.set(orderNo, {
        orderNo,
        date,
        ref: ref(l.customerRef),
        customerName: text(l.customerName),
        country: text(l.country),
        city: text(l.city),
        payment: PAYMENTS.includes(text(l.payment)) ? text(l.payment) : payment,
        cancelled: false,
        lines: [],
      });
    }
    const inv = invoices.get(orderNo);
    if (cancelled) inv.cancelled = true;
    inv.lines.push({ sku, name: text(l.name) || sku, category: text(l.category) || 'Imported', quantity: Math.max(1, Math.abs(Math.round(qty))), price: Math.round(price * 100) / 100 });
  });

  const numbers = [...invoices.keys()];
  const taken = new Set((await Order.find({ owner, orderNo: { $in: numbers } }, 'orderNo')).map((o) => o.orderNo));
  const fresh = numbers.filter((n) => {
    if (taken.has(n)) { out.existingOrders++; return false; }
    return true;
  }).map((n) => invoices.get(n));
  if (!fresh.length) return res.json(out);

  const now = new Date();
  const wanted = new Map();
  fresh.forEach((inv) => inv.lines.forEach((l) => { if (!wanted.has(l.sku)) wanted.set(l.sku, l); }));
  const have = new Map((await Product.find({ owner, sku: { $in: [...wanted.keys()] } }, 'sku name category')).map((p) => [p.sku, p]));
  const newProducts = [];
  wanted.forEach((l, sku) => {
    if (have.has(sku)) return;
    const doc = { _id: oid(), owner, name: l.name, sku, category: l.category, price: l.price, stock: startStock, reorderLevel: 10, ...stamp(now) };
    newProducts.push(doc);
    have.set(sku, doc);
  });
  await insert(Product, newProducts);
  await insert(StockLog, newProducts.filter((p) => p.stock > 0).map((p) => ({ _id: oid(), owner, product: p._id, change: p.stock, balance: p.stock, reason: 'Imported opening stock', ...stamp(now) })));
  out.productsCreated = newProducts.length;

  const refs = [...new Set(fresh.map((i) => i.ref).filter(Boolean))];
  const known = new Map();
  const lookups = [{ externalRef: 'walk-in' }];
  if (refs.length) lookups.push({ externalRef: { $in: refs } });
  (await Customer.find({ owner, $or: lookups }, 'externalRef name city state country lat lng')).forEach((c) => known.set(c.externalRef, c));
  const newCustomers = [];
  const customerFor = (inv) => {
    const key = inv.ref || 'walk-in';
    if (known.has(key)) return known.get(key);
    const doc = compact({
      _id: oid(),
      owner,
      name: key === 'walk-in' ? 'Walk-in customer' : inv.customerName || `Customer ${key}`,
      externalRef: key,
      city: inv.city,
      country: inv.country,
      ...stamp(now),
    });
    Object.assign(doc, geoFor(inv.city));
    newCustomers.push(doc);
    known.set(key, doc);
    return doc;
  };

  const docs = fresh.map((inv) => {
    const buyer = customerFor(inv);
    const items = inv.lines.map((l) => {
      const p = have.get(l.sku);
      return { product: p._id, name: p.name, sku: l.sku, category: p.category || l.category, price: l.price, quantity: l.quantity };
    });
    const subtotal = Math.round(items.reduce((s, i) => s + i.price * i.quantity, 0) * 100) / 100;
    return compact({
      _id: oid(),
      owner,
      orderNo: inv.orderNo,
      customer: buyer._id,
      items,
      subtotal,
      discountPercent: 0,
      discount: 0,
      total: subtotal,
      paymentMethod: inv.payment,
      status: inv.cancelled ? 'Cancelled' : finalStatus,
      city: buyer.city,
      state: buyer.state,
      country: buyer.country,
      lat: buyer.lat,
      lng: buyer.lng,
      ...stamp(inv.date),
    });
  });

  await insert(Customer, newCustomers);
  await insert(Order, docs);
  out.customersCreated = newCustomers.length;
  out.orders = docs.length;
  res.json(out);
}));

module.exports = router;
