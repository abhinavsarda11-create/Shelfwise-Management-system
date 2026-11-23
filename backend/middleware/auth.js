const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

module.exports = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Please sign in' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    req.owner = new mongoose.Types.ObjectId(payload.id);
    next();
  } catch {
    res.status(401).json({ error: 'Session expired, please sign in again' });
  }
};
