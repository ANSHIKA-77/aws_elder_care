// routes/index.js
const router = require('express').Router();

// Authentication routes (public)
router.use('/auth', require('./auth'));

// Protected feature routes (require JWT)
router.use('/medications', require('./medication'));
router.use('/appointments', require('./appointment'));
router.use('/exercises', require('./exercise'));
router.use('/emergency', require('./emergency'));
router.use('/gallery', require('./gallery'));

module.exports = router;