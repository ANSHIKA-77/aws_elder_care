// routes/exercise.js
const router = require('express').Router();
const exerciseController = require('../controllers/exercise.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(verifyToken);

/**
 * @route   GET /api/v1/exercises/log/today
 * @desc    Get today's exercise log
 * @access  Private
 */
router.get('/log/today', exerciseController.getTodayLog);

/**
 * @route   GET /api/v1/exercises/summary
 * @desc    Get summary for today's log (quick stats)
 * @access  Private
 */
router.get('/summary', exerciseController.getTodaySummary);

/**
 * @route   GET /api/v1/exercises/history
 * @desc    Get exercise history (last N days)
 * @query   ?days=7 (optional, default 7)
 * @access  Private
 */
router.get('/history', exerciseController.getHistory);

/**
 * @route   GET /api/v1/exercises/stats/weekly
 * @desc    Get weekly exercise statistics
 * @access  Private
 */
router.get('/stats/weekly', exerciseController.getWeeklyStats);

/**
 * @route   GET /api/v1/exercises/stats/monthly
 * @desc    Get monthly exercise statistics
 * @query   ?month=1&year=2024 (optional, defaults to current month)
 * @access  Private
 */
router.get('/stats/monthly', exerciseController.getMonthlyStats);

/**
 * @route   GET /api/v1/exercises/log/:date
 * @desc    Get exercise log for a specific date
 * @param   date - Format: YYYY-MM-DD
 * @access  Private
 */
router.get('/log/:date', exerciseController.getLogByDate);

/**
 * @route   POST /api/v1/exercises/log
 * @desc    Log completed exercises for today
 * @body    { category, steps[], duration, notes }
 * @access  Private
 */
router.post('/log', exerciseController.logExercise);

/**
 * @route   PATCH /api/v1/exercises/log/today/notes
 * @desc    Update daily notes for today's log
 * @body    { notes }
 * @access  Private
 */
router.patch('/log/today/notes', exerciseController.updateDailyNotes);

/**
 * @route   DELETE /api/v1/exercises/log/:date
 * @desc    Delete exercise log for a specific date
 * @param   date - Format: YYYY-MM-DD
 * @access  Private
 */
router.delete('/log/:date', exerciseController.deleteLog);

module.exports = router;
