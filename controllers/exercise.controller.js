// controllers/exercise.controller.js
const exerciseService = require('../services/exercise.service');

/**
 * @route   GET /api/v1/exercises/log/today
 * @desc    Get today's exercise log for logged-in user
 * @access  Private
 */
exports.getTodayLog = async (req, res, next) => {
    try {
        const userId = req.user.id;
        
        const log = await exerciseService.getTodayLog(userId);
        
        res.json({
            success: true,
            data: log
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   GET /api/v1/exercises/log/:date
 * @desc    Get exercise log for a specific date
 * @access  Private
 */
exports.getLogByDate = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const date = req.params.date;  // Format: YYYY-MM-DD
        
        const log = await exerciseService.getLogByDate(userId, date);
        
        if (!log) {
            return res.status(404).json({
                success: false,
                message: 'No exercise log found for this date'
            });
        }
        
        res.json({
            success: true,
            data: log
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   POST /api/v1/exercises/log
 * @desc    Log completed exercises for today
 * @access  Private
 */
exports.logExercise = async (req, res, next) => {
    try {
        const userId = req.user.id;
        
        const { category, steps, duration, notes } = req.body;
        
        // Validation
        if (!category || !steps || !Array.isArray(steps) || steps.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Category and steps array are required'
            });
        }
        
        const log = await exerciseService.logExercise(userId, {
            category,
            steps,
            duration: duration || 0,
            notes
        });
        
        res.status(201).json({
            success: true,
            message: 'Exercise logged successfully',
            data: log
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   PATCH /api/v1/exercises/log/today/notes
 * @desc    Update daily notes for today's log
 * @access  Private
 */
exports.updateDailyNotes = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { notes } = req.body;
        
        const log = await exerciseService.updateDailyNotes(userId, notes);
        
        res.json({
            success: true,
            message: 'Daily notes updated',
            data: log
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   GET /api/v1/exercises/history
 * @desc    Get exercise history (last N days)
 * @access  Private
 */
exports.getHistory = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { days = 7 } = req.query;  // Default: last 7 days
        
        const history = await exerciseService.getHistory(userId, parseInt(days));
        
        res.json({
            success: true,
            count: history.length,
            data: history
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   GET /api/v1/exercises/stats/weekly
 * @desc    Get weekly exercise statistics
 * @access  Private
 */
exports.getWeeklyStats = async (req, res, next) => {
    try {
        const userId = req.user.id;
        
        const stats = await exerciseService.getWeeklyStats(userId);
        
        res.json({
            success: true,
            data: stats
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   GET /api/v1/exercises/stats/monthly
 * @desc    Get monthly exercise statistics
 * @access  Private
 */
exports.getMonthlyStats = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { month, year } = req.query;
        
        // Default to current month/year if not provided
        const now = new Date();
        const targetMonth = month ? parseInt(month) : now.getMonth() + 1;
        const targetYear = year ? parseInt(year) : now.getFullYear();
        
        const stats = await exerciseService.getMonthlyStats(userId, targetMonth, targetYear);
        
        res.json({
            success: true,
            data: stats
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   DELETE /api/v1/exercises/log/:date
 * @desc    Delete exercise log for a specific date
 * @access  Private
 */
exports.deleteLog = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const date = req.params.date;
        
        const result = await exerciseService.deleteLog(userId, date);
        
        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'No log found for this date'
            });
        }
        
        res.json({
            success: true,
            message: 'Exercise log deleted'
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   GET /api/v1/exercises/summary
 * @desc    Get summary for today's log (quick stats)
 * @access  Private
 */
exports.getTodaySummary = async (req, res, next) => {
    try {
        const userId = req.user.id;
        
        console.log('Getting exercise summary for userId:', userId);
        
        const summary = await exerciseService.getTodaySummary(userId);
        
        console.log('Returning exercise summary:', summary);
        
        res.json({
            success: true,
            data: summary
        });
    } catch (err) {
        console.error('Error in getTodaySummary:', err);
        next(err);
    }
};
