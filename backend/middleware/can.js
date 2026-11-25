const { can } = require('../permissions');

module.exports = (permission) => (req, res, next) => {
  if (can(req.role, permission)) return next();
  res.status(403).json({ error: `Your role (${req.role}) does not have access to this` });
};
