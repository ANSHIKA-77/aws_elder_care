// routes/medication.js
const router = require('express').Router();
const medicationController = require('../controllers/medication.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(verifyToken);

/**
 * @route   GET /api/v1/medications
 * @desc    Get all medications for logged-in user
 * @query   ?activeOnly=true (optional)
 * @access  Private
 */
router.get('/', medicationController.getAllMedications);

/**
 * @route   GET /api/v1/medications/stats/today
 * @desc    Get today's medication statistics
 * @access  Private
 */
router.get('/stats/today', medicationController.getTodayStats);

/**
 * @route   GET /api/v1/medications/:id
 * @desc    Get single medication by ID
 * @access  Private
 */
router.get('/:id', medicationController.getMedicationById);

/**
 * @route   POST /api/v1/medications
 * @desc    Create new medication
 * @access  Private
 */
router.post('/', medicationController.createMedication);

/**
 * @route   PATCH /api/v1/medications/:id/mark-taken
 * @desc    Mark medication as taken for today
 * @access  Private
 */
router.patch('/:id/mark-taken', medicationController.markAsTaken);

/**
 * @route   PATCH /api/v1/medications/:id/unmark
 * @desc    Unmark medication (undo taken status)
 * @access  Private
 */
router.patch('/:id/unmark', medicationController.unmarkAsTaken);

/**
 * @route   PUT /api/v1/medications/:id
 * @desc    Update medication details
 * @access  Private
 */
router.put('/:id', medicationController.updateMedication);

/**
 * @route   DELETE /api/v1/medications/:id
 * @desc    Soft delete medication (set isActive to false)
 * @access  Private
 */
router.delete('/:id', medicationController.deleteMedication);

/**
 * @route   POST /api/v1/medications/reset-daily
 * @desc    Reset all takenToday flags (admin/cron only)
 * @access  Admin
 */
router.post('/reset-daily', medicationController.resetDailyStatus);

module.exports = router;
