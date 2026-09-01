// routes/emergency.js
const router = require('express').Router();
const emergencyController = require('../controllers/emergency.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(verifyToken);

/**
 * @route   POST /api/v1/emergency/trigger
 * @desc    Trigger emergency alert
 * @body    { latitude, longitude, alertType, accuracy, deviceInfo, notes }
 * @access  Private
 */
router.post('/trigger', emergencyController.trigger);

/**
 * @route   GET /api/v1/emergency/alerts
 * @desc    Get emergency alert history
 * @query   ?limit=20&status=triggered (optional)
 * @access  Private
 */
router.get('/alerts', emergencyController.getAlertHistory);

/**
 * @route   GET /api/v1/emergency/stats
 * @desc    Get emergency alert statistics
 * @access  Private
 */
router.get('/stats', emergencyController.getStats);

/**
 * @route   GET /api/v1/emergency/alerts/:id
 * @desc    Get single alert details
 * @access  Private
 */
router.get('/alerts/:id', emergencyController.getAlertById);

/**
 * @route   PATCH /api/v1/emergency/alerts/:id/resolve
 * @desc    Mark alert as resolved
 * @body    { notes }
 * @access  Private
 */
router.patch('/alerts/:id/resolve', emergencyController.resolveAlert);

/**
 * @route   PATCH /api/v1/emergency/alerts/:id/false-alarm
 * @desc    Mark alert as false alarm
 * @body    { notes }
 * @access  Private
 */
router.patch('/alerts/:id/false-alarm', emergencyController.markFalseAlarm);

module.exports = router;