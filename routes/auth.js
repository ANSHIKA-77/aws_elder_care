// routes/auth.js
const router     = require('express').Router();
const controller = require('../controllers/auth.controller');
const { registerRules, loginRules } = require('../validators/auth.validator');
const { validate } = require('../middleware/validate.middleware');

router.post('/register', registerRules, validate, controller.register);
router.post('/login',    loginRules,    validate, controller.login);
router.post('/send-otp',   controller.sendOtp);    // ← new
router.post('/verify-otp', controller.verifyOtp);  // ← new

module.exports = router;