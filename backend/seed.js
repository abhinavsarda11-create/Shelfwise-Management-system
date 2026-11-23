const mongoose = require('mongoose');
const { Supplier, Customer, Product, Order, StockLog, Counter } = require('./models');
const { cities, findCity } = require('./data/cities');
const { rows, prefixes, supplierDefs, firstNames, lastNames, areas } = require('./data/catalogue');

const DAY = 86400000;
const oid = () => new mongoose.Types.ObjectId();
const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (list) => list[Math.floor(Math.random() * list.length)];

const chooser = (items, weights) => {
  const total = weights.reduce((a, b) => a + b, 0);
  return () => {
    let r = Math.random() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  };
};

async function seedWorkspace(owner, homeCity, orderCount = 520) {
  const home = findCity(homeCity) || cities[0];
  const pickCity = chooser(cities, cities.map((c) => c.weight * (c.city === home.city ? 8 : c.state === home.state ? 3 : 1)));
  const now = Date.now();
  const stamp = (t) => ({ createdAt: new Date(t), updatedAt: new Date(t) });

  const suppliers = supplierDefs.map(([name, , cityName]) => {
    const place = findCity(cityName);
    return {
      _id: oid(),
      owner,
      name,
      phone: `${pick([7, 8, 9])}${rnd(100000000, 999999999)}`,
      email: `sales@${name.toLowerCase().replace(/[^a-z]+/g, '')}.in`,
      address: `${rnd(10, 300)}, ${pick(areas)}, ${place.city}`,
      city: place.city,
      state: place.state,
      ...stamp(now - 160 * DAY),
    };
  });
  const bySupplierCategory = {};
  supplierDefs.forEach(([, category], i) => (bySupplierCategory[category] = bySupplierCategory[category] || []).push(suppliers[i]._id));

  const products = rows.map((row, i) => ({
    _id: oid(),
    owner,
    name: row.name,
    brand: row.brand,
    sku: `${prefixes[row.category]}-${String(i + 1).padStart(3, '0')}`,
    category: row.category,
    price: row.price,
    stock: 0,
    reorderLevel: row.price < 60 ? 40 : row.price < 200 ? 20 : 8,
    supplier: pick(bySupplierCategory[row.category]),
    ...stamp(now - 150 * DAY),
  }));

  const domains = ['gmail.com', 'outlook.com', 'yahoo.in', 'rediffmail.com'];
  const customers = Array.from({ length: 160 }, () => {
    const place = pickCity();
    const first = pick(firstNames);
    const last = pick(lastNames);
    return {
      _id: oid(),
      owner,
      name: `${first} ${last}`,
      phone: `${pick([6, 7, 8, 9])}${rnd(100000000, 999999999)}`,
      email: `${first}.${last}${rnd(1, 99)}@${pick(domains)}`.toLowerCase(),
      address: `${rnd(1, 320)}, ${pick(areas)}`,
      city: place.city,
      state: place.state,
      pincode: `${place.pin}${String(rnd(0, 999)).padStart(3, '0')}`,
      lat: place.lat + (Math.random() - 0.5) * 0.12,
      lng: place.lng + (Math.random() - 0.5) * 0.12,
      ...stamp(now - rnd(10, 150) * DAY),
    };
  });

  const pickProduct = chooser(products, products.map((_, i) => 1 / Math.pow(i + 3, 0.5)));
  const pickCustomer = chooser(customers, customers.map((_, i) => 1 / Math.pow(i + 1, 0.55)));
  const pickPayment = chooser(['UPI', 'Cash', 'Card', 'Credit'], [52, 20, 18, 10]);
  const pickLines = chooser([1, 2, 3, 4, 5], [30, 32, 20, 12, 6]);

  const stamps = [];
  while (stamps.length < orderCount) {
    const daysAgo = Math.floor(Math.pow(Math.random(), 1.25) * 120);
    const day = new Date(now - daysAgo * DAY);
    const weekday = day.getDay();
    if (Math.random() > (weekday === 0 || weekday === 6 ? 1 : 0.72)) continue;
    day.setHours(rnd(9, 20), rnd(0, 59), rnd(0, 59), 0);
    stamps.push(Math.min(day.getTime(), now - rnd(10, 300) * 60000));
  }
  stamps.sort((a, b) => a - b);

  const events = [];
  const orders = stamps.map((t, index) => {
    const buyer = pickCustomer();
    const count = pickLines();
    const chosen = new Map();
    for (let tries = 0; chosen.size < count && tries < 30; tries++) {
      const product = pickProduct();
      if (!chosen.has(product._id)) chosen.set(product._id, product);
    }
    const items = [...chosen.values()].map((product) => ({
      product: product._id,
      name: product.name,
      sku: product.sku,
      category: product.category,
      price: product.price,
      quantity: rnd(1, product.price < 100 ? 6 : product.price < 400 ? 3 : 2),
    }));
    const age = (now - t) / DAY;
    const status = age <= 2
      ? chooser(['Placed', 'Delivered', 'Cancelled'], [70, 25, 5])()
      : chooser(['Delivered', 'Cancelled'], [93, 7])();
    const discountPercent = Math.random() < 0.18 ? pick([2, 5, 5, 10]) : 0;
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const discount = Math.round((subtotal * discountPercent) / 100);
    const orderNo = `ORD-${1001 + index}`;
    items.forEach((item) => {
      events.push({ t, product: item.product, change: -item.quantity, reason: `Order ${orderNo}` });
      if (status === 'Cancelled') {
        events.push({ t: Math.min(t + rnd(1, 6) * 3600000, now), product: item.product, change: item.quantity, reason: `Cancelled ${orderNo}` });
      }
    });
    return {
      _id: oid(),
      owner,
      orderNo,
      customer: buyer._id,
      items,
      subtotal,
      discountPercent,
      discount,
      total: subtotal - discount,
      paymentMethod: pickPayment(),
      status,
      city: buyer.city,
      state: buyer.state,
      lat: buyer.lat,
      lng: buyer.lng,
      ...stamp(t),
    };
  });

  events.sort((a, b) => a.t - b.t);
  const byProduct = new Map();
  events.forEach((e) => {
    const key = String(e.product);
    if (!byProduct.has(key)) byProduct.set(key, []);
    byProduct.get(key).push(e);
  });

  const lowIndexes = new Set();
  while (lowIndexes.size < 12) lowIndexes.add(rnd(0, products.length - 1));
  const zeroIndexes = new Set([...lowIndexes].slice(0, 3));

  const logs = [];
  products.forEach((product, index) => {
    const list = byProduct.get(String(product._id)) || [];
    let run = 0;
    let low = 0;
    list.forEach((e) => {
      run += e.change;
      low = Math.min(low, run);
    });
    const target = zeroIndexes.has(index) ? 0 : lowIndexes.has(index) ? rnd(1, product.reorderLevel) : product.price >= 500 ? rnd(6, 40) : rnd(30, 180);
    const opening = Math.max(target - run, -low);
    let balance = opening;
    logs.push({ _id: oid(), owner, product: product._id, change: opening, balance, reason: 'Opening stock', ...stamp(now - 150 * DAY) });
    list.forEach((e) => {
      balance += e.change;
      logs.push({ _id: oid(), owner, product: product._id, change: e.change, balance, reason: e.reason, ...stamp(e.t) });
    });
    product.stock = balance;
  });

  await Supplier.collection.insertMany(suppliers);
  await Product.collection.insertMany(products);
  await Customer.collection.insertMany(customers);
  await Order.collection.insertMany(orders);
  await StockLog.collection.insertMany(logs);
  await Counter.collection.updateOne({ _id: `order:${owner}` }, { $set: { seq: orders.length } }, { upsert: true });

  return { suppliers: suppliers.length, products: products.length, customers: customers.length, orders: orders.length, stockMovements: logs.length };
}

async function clearWorkspace(owner) {
  await Promise.all([Supplier, Customer, Product, Order, StockLog].map((Model) => Model.deleteMany({ owner })));
  await Counter.deleteOne({ _id: `order:${owner}` });
}

module.exports = { seedWorkspace, clearWorkspace };
