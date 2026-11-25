const router = require('express').Router();
const { Product, User } = require('../models');
const { seedWorkspace, clearWorkspace } = require('../seed');
const { wrap, fail } = require('../utils');
const requires = require('../middleware/can');

router.use(requires('workspace:manage'));

router.post('/sample', wrap(async (req, res) => {
  if (await Product.exists({ owner: req.owner })) throw fail(400, 'Your workspace already has data. Reset it first');
  const user = await User.findById(req.owner);
  res.json(await seedWorkspace(req.owner, user && user.city));
}));

router.delete('/', wrap(async (req, res) => {
  await clearWorkspace(req.owner);
  res.json({ message: 'Workspace cleared' });
}));

module.exports = router;
