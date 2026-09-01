// routes/auth.js
const router     = require('express').Router();
const controller = require('../controllers/auth.controller');
const { registerRules, loginRules } = require('../validators/auth.validator');
const { validate } = require('../middleware/validate.middleware');
const { verifyToken } = require('../middleware/auth.middleware');

// Public routes
router.post('/register/caretaker', controller.registerCaretaker);
router.post('/register/client', controller.registerClient);
router.post('/register', registerRules, validate, controller.register);  // Legacy
router.post('/login', loginRules, validate, controller.login);
router.post('/send-otp', controller.sendOtp);
router.post('/verify-otp', controller.verifyOtp);

// Protected routes
router.get('/invite-code', verifyToken, controller.getInviteCode);
router.get('/group-members', verifyToken, controller.getGroupMembers);

module.exports = router;