require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const auth = require('./middleware/auth');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '100kb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

let ready = null;
const connect = () => {
  if (!ready) {
    if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
      return Promise.reject(new Error('MONGODB_URI and JWT_SECRET must be set'));
    }
    ready = mongoose
      .connect(process.env.MONGODB_URI)
      .then(() => Promise.all(Object.values(mongoose.models).map((model) => model.syncIndexes())))
      .catch((error) => {
        ready = null;
        throw error;
      });
  }
  return ready;
};

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api', (req, res, next) => connect().then(() => next(), next));
app.use('/api/locations', require('./routes/locations'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api', auth);
app.use('/api/orders', require('./routes/orders'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/workspace', require('./routes/workspace'));
app.use('/api', require('./routes/resources'));
app.use('/api', (req, res) => res.status(404).json({ error: 'Route not found' }));

const dist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((err, req, res, next) => {
  if (err.name === 'ValidationError') return res.status(400).json({ error: Object.values(err.errors)[0].message });
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {}).find((key) => key !== 'owner') || 'value';
    return res.status(400).json({ error: `That ${field} already exists` });
  }
  if (err.name === 'CastError') return res.status(400).json({ error: `Invalid value for ${err.path}` });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid request body' });
  if (!err.status) console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Something went wrong on the server' });
});

if (require.main === module) {
  const port = process.env.PORT || 5000;
  connect()
    .then(() => app.listen(port, () => console.log(`Server running on port ${port}`)))
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
}

module.exports = app;
