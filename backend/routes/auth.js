const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const { User } = require('../models');
const { findCity } = require('../data/cities');
const { seedWorkspace } = require('../seed');
const { wrap, fail } = require('../utils');

const attempts = new Map();
const recent = (key, windowMs) => {
  const now = Date.now();
  const list = (attempts.get(key) || []).filter((t) => now - t < windowMs);
  attempts.set(key, list);
  return list;
};

const sign = (user) => jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, storeName: u.storeName, city: u.city, createdAt: u.createdAt });
const strongEnough = (p) => typeof p === 'string' && p.length >= 8 && p.length <= 72 && /[A-Za-z]/.test(p) && /\d/.test(p);

router.post('/register', wrap(async (req, res) => {
  if (process.env.ALLOW_SIGNUP === 'false') throw fail(403, 'Registration is currently closed');
  const ipKey = `signup|${req.ip}`;
  if (recent(ipKey, 3600000).length >= 6) throw fail(429, 'Too many accounts created from this network. Try again later');

  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').toLowerCase().trim();
  const place = findCity(req.body.city);
  const storeName = String(req.body.storeName || '').trim() || `${name}'s Store`;
  if (name.length < 2) throw fail(400, 'Enter your full name');
  if (!/^\S+@\S+\.\S+$/.test(email)) throw fail(400, 'Enter a valid email address');
  if (!strongEnough(req.body.password)) throw fail(400, 'Password needs 8 or more characters including a letter and a number');
  if (await User.exists({ email })) throw fail(400, 'An account with this email already exists');

  const city = place ? place.city : 'Delhi';
  const user = await User.create({ name, email, storeName, city, password: await bcrypt.hash(req.body.password, 10) });
  recent(ipKey, 3600000).push(Date.now());
  if (req.body.sample !== false) await seedWorkspace(user._id, city);
  res.status(201).json({ token: sign(user), user: publicUser(user) });
}));

router.post('/login', wrap(async (req, res) => {
  const email = String(req.body.email || '').toLowerCase().trim();
  const key = `login|${req.ip}|${email}`;
  if (recent(key, 900000).length >= 8) throw fail(429, 'Too many attempts. Please wait a few minutes and try again');
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(String(req.body.password || ''), user.password))) {
    recent(key, 900000).push(Date.now());
    throw fail(401, 'Incorrect email or password');
  }
  attempts.delete(key);
  res.json({ token: sign(user), user: publicUser(user) });
}));

router.get('/me', auth, wrap(async (req, res) => {
  const user = await User.findById(req.owner);
  if (!user) throw fail(401, 'Account not found');
  res.json(publicUser(user));
}));

router.put('/me', auth, wrap(async (req, res) => {
  const user = await User.findById(req.owner);
  if (!user) throw fail(401, 'Account not found');
  const name = String(req.body.name || '').trim();
  if (name.length < 2) throw fail(400, 'Enter your full name');
  const place = findCity(req.body.city);
  user.name = name;
  user.storeName = String(req.body.storeName || '').trim() || user.storeName;
  if (place) user.city = place.city;
  await user.save();
  res.json(publicUser(user));
}));

router.put('/password', auth, wrap(async (req, res) => {
  const user = await User.findById(req.owner);
  if (!user) throw fail(401, 'Account not found');
  if (!(await bcrypt.compare(String(req.body.current || ''), user.password))) throw fail(400, 'Current password is incorrect');
  if (!strongEnough(req.body.next)) throw fail(400, 'New password needs 8 or more characters including a letter and a number');
  user.password = await bcrypt.hash(req.body.next, 10);
  await user.save();
  res.json({ message: 'Password updated' });
}));

module.exports = router;
