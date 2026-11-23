const router = require('express').Router();
const { Order, Customer } = require('../models');
const { wrap } = require('../utils');
const { findCity } = require('../data/cities');

const DAY = 86400000;

router.get('/', wrap(async (req, res) => {
  const days = [30, 90, 180, 365].includes(Number(req.query.days)) ? Number(req.query.days) : 180;
  const match = { owner: req.owner, status: { $ne: 'Cancelled' }, createdAt: { $gte: new Date(Date.now() - days * DAY) } };
  const base = [{ $match: match }];
  const sumRevenue = { $sum: '$total' };

  const [monthly, cities, states, payments, weekdays, buyers, totals, categories] = await Promise.all([
    Order.aggregate([...base, { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, revenue: sumRevenue, orders: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    Order.aggregate([...base, { $group: { _id: '$city', state: { $first: '$state' }, revenue: sumRevenue, orders: { $sum: 1 } } }, { $sort: { revenue: -1 } }]),
    Order.aggregate([...base, { $group: { _id: '$state', revenue: sumRevenue, orders: { $sum: 1 } } }, { $sort: { revenue: -1 } }]),
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
    totals: totals[0] || { revenue: 0, orders: 0, discount: 0 },
    monthly,
    states,
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
      return { id: b._id, name: p ? p.name : 'Deleted customer', city: p ? p.city : '', state: p ? p.state : '', revenue: b.revenue, orders: b.orders };
    }),
  });
}));

module.exports = router;
