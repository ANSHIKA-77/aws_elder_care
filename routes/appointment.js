// routes/appointment.js
const router = require('express').Router();
const appointmentController = require('../controllers/appointment.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(verifyToken);

/**
 * @route   GET /api/v1/appointments
 * @desc    Get all appointments for logged-in user
 * @query   ?status=upcoming&from=2024-01-01&to=2024-12-31 (optional)
 * @access  Private
 */
router.get('/', appointmentController.getAllAppointments);

/**
 * @route   GET /api/v1/appointments/stats/summary
 * @desc    Get appointment statistics
 * @access  Private
 */
router.get('/stats/summary', appointmentController.getStats);

/**
 * @route   GET /api/v1/appointments/upcoming/today
 * @desc    Get today's appointments
 * @access  Private
 */
router.get('/upcoming/today', appointmentController.getTodayAppointments);

/**
 * @route   POST /api/v1/appointments/update-missed
 * @desc    Auto-update past appointments to "missed" status
 * @access  Private
 */
router.post('/update-missed', appointmentController.updateMissedAppointments);

/**
 * @route   GET /api/v1/appointments/:id
 * @desc    Get single appointment by ID
 * @access  Private
 */
router.get('/:id', appointmentController.getAppointmentById);

/**
 * @route   POST /api/v1/appointments
 * @desc    Create new appointment
 * @access  Private
 */
router.post('/', appointmentController.createAppointment);

/**
 * @route   PUT /api/v1/appointments/:id
 * @desc    Update appointment details
 * @access  Private
 */
router.put('/:id', appointmentController.updateAppointment);

/**
 * @route   PATCH /api/v1/appointments/:id/complete
 * @desc    Mark appointment as completed
 * @access  Private
 */
router.patch('/:id/complete', appointmentController.markAsCompleted);

/**
 * @route   PATCH /api/v1/appointments/:id/cancel
 * @desc    Cancel appointment
 * @access  Private
 */
router.patch('/:id/cancel', appointmentController.cancelAppointment);

/**
 * @route   DELETE /api/v1/appointments/:id
 * @desc    Delete appointment permanently
 * @access  Private
 */
router.delete('/:id', appointmentController.deleteAppointment);

module.exports = router;
