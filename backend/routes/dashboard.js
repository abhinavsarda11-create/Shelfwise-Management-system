const router = require('express').Router();
const { Order, Product, Customer, Supplier } = require('../models');
const { wrap } = require('../utils');
const requires = require('../middleware/can');

const DAY = 86400000;
const region = { $ifNull: ['$state', { $ifNull: ['$country', 'Unknown'] }] };

router.use(requires('dashboard:view'));

router.get('/', wrap(async (req, res) => {
  const owner = req.owner;
  const latest = await Order.findOne({ owner }).sort({ createdAt: -1 }).select('createdAt');
  const end = latest ? new Date(Math.min(latest.createdAt.getTime(), Date.now())) : new Date();
  const from30 = new Date(end);
  from30.setUTCHours(0, 0, 0, 0);
  from30.setTime(from30.getTime() - 29 * DAY);
  const from60 = new Date(from30.getTime() - 30 * DAY);
  const live = { owner, status: { $ne: 'Cancelled' } };
  const recent = { ...live, createdAt: { $gte: from30 } };
  const itemRevenue = { $sum: { $multiply: ['$items.price', '$items.quantity'] } };

  const [products, customers, suppliers, pending, periods, totals, stock, daily, topProducts, byCategory, byState, recentOrders, lowStock] = await Promise.all([
    Product.countDocuments({ owner }),
    Customer.countDocuments({ owner }),
    Supplier.countDocuments({ owner }),
    Order.countDocuments({ owner, status: 'Placed' }),
    Order.aggregate([
      { $match: { ...live, createdAt: { $gte: from60 } } },
      { $group: { _id: { $cond: [{ $gte: ['$createdAt', from30] }, 'current', 'previous'] }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
    ]),
    Order.aggregate([{ $match: live }, { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } }]),
    Product.aggregate([{ $match: { owner } }, { $group: { _id: null, value: { $sum: { $multiply: ['$price', '$stock'] } }, units: { $sum: '$stock' } } }]),
    Order.aggregate([
      { $match: recent },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, total: { $sum: '$total' }, count: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: recent },
      { $unwind: '$items' },
      { $group: { _id: '$items.name', units: { $sum: '$items.quantity' }, revenue: itemRevenue } },
      { $sort: { revenue: -1 } },
      { $limit: 6 },
    ]),
    Order.aggregate([
      { $match: recent },
      { $unwind: '$items' },
      { $group: { _id: '$items.category', revenue: itemRevenue } },
      { $sort: { revenue: -1 } },
    ]),
    Order.aggregate([
      { $match: recent },
      { $group: { _id: region, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
      { $sort: { revenue: -1 } },
      { $limit: 6 },
    ]),
    Order.find({ owner }).sort({ createdAt: -1 }).limit(7).populate('customer', 'name city'),
    Product.find({ owner, $expr: { $lte: ['$stock', '$reorderLevel'] } }).sort({ stock: 1 }).limit(8).populate('supplier', 'name'),
  ]);

  const pick = (key) => periods.find((p) => p._id === key) || { revenue: 0, orders: 0 };
  const byDay = new Map(daily.map((d) => [d._id, d]));
  const sales = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(from30.getTime() + i * DAY).toISOString().slice(0, 10);
    const found = byDay.get(date);
    return { date, total: found ? found.total : 0, count: found ? found.count : 0 };
  });

  res.json({
    asOf: end,
    stale: end.getTime() < Date.now() - 3 * DAY,
    counts: { products, customers, suppliers, pending },
    current: pick('current'),
    previous: pick('previous'),
    lifetime: totals[0] || { revenue: 0, orders: 0 },
    stock: stock[0] || { value: 0, units: 0 },
    sales,
    topProducts,
    byCategory,
    byState,
    recentOrders,
    lowStock,
  });
}));

module.exports = router;
