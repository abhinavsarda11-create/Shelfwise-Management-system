const router = require('express').Router();
const { Order, Customer } = require('../models');
const { wrap } = require('../utils');
const { findCity } = require('../data/cities');
const requires = require('../middleware/can');

const DAY = 86400000;
const region = { $ifNull: ['$state', { $ifNull: ['$country', 'Unknown'] }] };

router.use(requires('analytics:view'));

router.get('/', wrap(async (req, res) => {
  const days = [30, 90, 180, 365].includes(Number(req.query.days)) ? Number(req.query.days) : 180;
  const latest = await Order.findOne({ owner: req.owner }).sort({ createdAt: -1 }).select('createdAt');
  const end = latest ? new Date(Math.min(latest.createdAt.getTime(), Date.now())) : new Date();
  const match = { owner: req.owner, status: { $ne: 'Cancelled' }, createdAt: { $gte: new Date(end.getTime() - days * DAY) } };
  const base = [{ $match: match }];
  const sumRevenue = { $sum: '$total' };

  const [monthly, cities, states, countries, payments, weekdays, buyers, totals, categories] = await Promise.all([
    Order.aggregate([...base, { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, revenue: sumRevenue, orders: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    Order.aggregate([...base, { $group: { _id: '$city', state: { $first: '$state' }, revenue: sumRevenue, orders: { $sum: 1 } } }, { $sort: { revenue: -1 } }]),
    Order.aggregate([...base, { $group: { _id: region, revenue: sumRevenue, orders: { $sum: 1 } } }, { $sort: { revenue: -1 } }]),
    Order.aggregate([...base, { $group: { _id: { $ifNull: ['$country', 'India'] }, revenue: sumRevenue, orders: { $sum: 1 } } }, { $sort: { revenue: -1 } }]),
    Order.aggregate([...base, { $group: { _id: '$paymentMethod', revenue: sumRevenue, orders: { $sum: 1 } } }, { $sort: { revenue: -1 } }]),
    Order.aggregate([...base, { $group: { _id: { $dayOfWeek: '$createdAt' }, revenue: sumRevenue, orders: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    Order.aggregate([...base, { $group: { _id: '$customer', revenue: sumRevenue, orders: { $sum: 1 } } }, { $sort: { revenue: -1 } }, { $limit: 8 }]),
    Order.aggregate([...base, { $group: { _id: null, revenue: sumRevenue, orders: { $sum: 1 }, discount: { $sum: '$discount' } } }]),
    Order.aggregate([
      ...base,
      { $unwind: '$items' },
      { $group: { _id: '$items.category', revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }, units: { $sum: '$items.quantity' } } },
      { $sort: { revenue: -1 } },
    ]),
  ]);

  const people = await Customer.find({ _id: { $in: buyers.map((b) => b._id) } }, 'name city state');
  const byId = new Map(people.map((p) => [String(p._id), p]));

  res.json({
    days,
    asOf: end,
    stale: end.getTime() < Date.now() - 3 * DAY,
    totals: totals[0] || { revenue: 0, orders: 0, discount: 0 },
    monthly,
    states,
    countries,
    payments,
    weekdays,
    categories,
    points: cities
      .map((c) => {
        const place = findCity(c._id);
        return place ? { city: c._id, state: c.state, lat: place.lat, lng: place.lng, revenue: c.revenue, orders: c.orders } : null;
      })
      .filter(Boolean),
    topCustomers: buyers.map((b) => {
      const p = byId.get(String(b._id));
      return { id: b._id, name: p ? p.name : 'Deleted customer', city: p ? p.city || '' : '', state: p ? p.state || '' : '', revenue: b.revenue, orders: b.orders };
    }),
  });
}));

module.exports = router;
