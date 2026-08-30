// routes/emergency.js
const router = require('express').Router();
const emergencyController = require('../controllers/emergency.controller');

router.post('/trigger', emergencyController.trigger);

module.exports = router;