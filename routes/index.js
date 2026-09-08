// routes/index.js
const router = require('express').Router();

// Authentication routes (public)
router.use('/auth', require('./auth'));

// Group management (list clients, group info, remove client)
router.use('/group', require('./group'));

// Protected feature routes (require JWT)
router.use('/medications', require('./medication'));
router.use('/appointments', require('./appointment'));
router.use('/exercises', require('./exercise'));
router.use('/emergency', require('./emergency'));
router.use('/gallery', require('./gallery'));
router.use('/location', require('./location'));
router.use('/video', require('./video'));

module.exports = router;