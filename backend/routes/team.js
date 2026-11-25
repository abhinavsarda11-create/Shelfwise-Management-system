const router = require('express').Router();
const bcrypt = require('bcryptjs');
const requires = require('../middleware/can');
const { User } = require('../models');
const { ASSIGNABLE, matrix } = require('../permissions');
const { wrap, fail } = require('../utils');

router.use(requires('team:manage'));

const strongEnough = (p) => typeof p === 'string' && p.length >= 8 && p.length <= 72 && /[A-Za-z]/.test(p) && /\d/.test(p);
const view = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  role: u.role || 'owner',
  active: u.active !== false,
  lastLoginAt: u.lastLoginAt || null,
  createdAt: u.createdAt,
});

router.get('/', wrap(async (req, res) => {
  const members = await User.find({ $or: [{ _id: req.owner }, { workspace: req.owner }] }).sort({ createdAt: 1 });
  res.json({ members: members.map(view), matrix });
}));

router.post('/', wrap(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').toLowerCase().trim();
  const role = req.body.role;
  if (name.length < 2) throw fail(400, 'Enter the member\'s full name');
  if (!/^\S+@\S+\.\S+$/.test(email)) throw fail(400, 'Enter a valid email address');
  if (!ASSIGNABLE.includes(role)) throw fail(400, 'Choose a role: manager, staff or viewer');
  if (!strongEnough(req.body.password)) throw fail(400, 'Password needs 8 or more characters including a letter and a number');
  if (await User.exists({ email })) throw fail(400, 'An account with this email already exists');
  const member = await User.create({ name, email, role, workspace: req.owner, password: await bcrypt.hash(req.body.password, 10) });
  res.status(201).json(view(member));
}));

router.put('/:id', wrap(async (req, res) => {
  const member = await User.findOne({ _id: req.params.id, workspace: req.owner });
  if (!member) throw fail(404, 'Team member not found');
  if (req.body.name !== undefined) {
    const name = String(req.body.name).trim();
    if (name.length < 2) throw fail(400, 'Enter the member\'s full name');
    member.name = name;
  }
  if (req.body.role !== undefined) {
    if (!ASSIGNABLE.includes(req.body.role)) throw fail(400, 'Choose a role: manager, staff or viewer');
    member.role = req.body.role;
  }
  if (req.body.active !== undefined) member.active = Boolean(req.body.active);
  if (req.body.password) {
    if (!strongEnough(req.body.password)) throw fail(400, 'Password needs 8 or more characters including a letter and a number');
    member.password = await bcrypt.hash(req.body.password, 10);
  }
  await member.save();
  res.json(view(member));
}));

router.delete('/:id', wrap(async (req, res) => {
  const result = await User.deleteOne({ _id: req.params.id, workspace: req.owner });
  if (!result.deletedCount) throw fail(404, 'Team member not found');
  res.json({ message: 'Team member removed' });
}));

module.exports = router;
