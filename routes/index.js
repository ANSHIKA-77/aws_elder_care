// routes/index.js
const router = require('express').Router();

router.use('/auth',      require('./auth'));
router.use('/emergency', require('./emergency'));

module.exports = router;