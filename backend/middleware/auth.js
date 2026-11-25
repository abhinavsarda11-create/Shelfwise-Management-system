const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { User } = require('../models');

module.exports = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Please sign in' });

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Session expired, please sign in again' });
  }

  try {
    const user = await User.findById(payload.id, 'name email role workspace active createdAt');
    if (!user) return res.status(401).json({ error: 'Account not found, please sign in again' });
    if (user.active === false) return res.status(401).json({ error: 'This account has been deactivated. Contact your store owner' });
    req.user = user;
    req.role = user.role || 'owner';
    req.owner = new mongoose.Types.ObjectId(String(user.workspace || user._id));
    next();
  } catch (error) {
    next(error);
  }
};
