const router = require('express').Router();
const { cities } = require('../data/cities');

router.get('/', (req, res) => {
  res.json(cities.map(({ city, state, lat, lng }) => ({ city, state, lat, lng })).sort((a, b) => a.city.localeCompare(b.city)));
});

module.exports = router;
