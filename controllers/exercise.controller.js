// controllers/exercise.controller.js
const exerciseService = require('../services/exercise.service');
const { resolveTargetUser, resolveGroupUserIds } = require('../middleware/resolveTargetUser');

/**
 * @route   GET /api/v1/exercises/log/today
 * @desc    Today's exercise log.
 *          Client → own. Caretaker + ?clientId → that client. Caretaker alone → own.
 * @access  Private
 */
exports.getTodayLog = async (req, res, next) => {
    try {
        const targetUserId = await resolveTargetUser(req);
        const log = await exerciseService.getTodayLog(targetUserId, req.user.groupId);
        res.json({ success: true, data: log });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   GET /api/v1/exercises/log/:date
 * @desc    Exercise log for a specific date. Caretaker can pass ?clientId=xxx.
 * @access  Private
 */
exports.getLogByDate = async (req, res, next) => {
    try {
        const targetUserId = await resolveTargetUser(req);
        const log = await exerciseService.getLogByDate(targetUserId, req.params.date);

        if (!log) {
            return res.status(404).json({ success: false, message: 'No exercise log found for this date' });
        }

        res.json({ success: true, data: log });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   POST /api/v1/exercises/log
 * @desc    Log completed exercises.
 *          Caretaker can log exercises FOR a client via ?clientId=xxx.
 * @access  Private
 */
exports.logExercise = async (req, res, next) => {
    try {
        const targetUserId = await resolveTargetUser(req);
        const { category, steps, duration, notes, comment, feedback } = req.body;

        if (!category || !steps || !Array.isArray(steps) || steps.length === 0) {
            return res.status(400).json({ success: false, message: 'Category and steps array are required' });
        }

        const log = await exerciseService.logExercise(targetUserId, {
            category,
            steps,
            duration: duration || 0,
            notes: notes || comment || '',
            comment: comment || notes || '',
            feedback: feedback || ''
        }, req.user.groupId);

        res.status(201).json({ success: true, message: 'Exercise logged successfully', data: log });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   PATCH /api/v1/exercises/log/today/notes
 * @desc    Update daily notes. Caretaker can update client's notes via ?clientId=xxx.
 * @access  Private
 */
exports.updateDailyNotes = async (req, res, next) => {
    try {
        const targetUserId = await resolveTargetUser(req);
        const log = await exerciseService.updateDailyNotes(targetUserId, req.body.notes);
        res.json({ success: true, message: 'Daily notes updated', data: log });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   GET /api/v1/exercises/history
 * @desc    Exercise history (last N days).
 *          Caretaker sees combined group history unless ?clientId is specified.
 * @query   ?days=7  ?clientId=xxx
 * @access  Private
 */
exports.getHistory = async (req, res, next) => {
    try {
        const userIds = await resolveGroupUserIds(req);
        const days = parseInt(req.query.days) || 7;

        const results = await Promise.all(
            userIds.map(uid => exerciseService.getHistory(uid, days))
        );
        // Merge and sort all logs by date descending
        const history = results.flat().sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json({ success: true, count: history.length, data: history });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   GET /api/v1/exercises/stats/weekly
 * @desc    Weekly stats. Caretaker sees merged group stats unless ?clientId specified.
 * @access  Private
 */
exports.getWeeklyStats = async (req, res, next) => {
    try {
        const userIds = await resolveGroupUserIds(req);

        const allStats = await Promise.all(
            userIds.map(uid => exerciseService.getWeeklyStats(uid))
        );

        // Merge numeric fields across all users
        const merged = allStats.reduce((acc, s) => ({
            period: s.period,
            totalMinutes: acc.totalMinutes + s.totalMinutes,
            totalSteps: acc.totalSteps + s.totalSteps,
            daysActive: Math.max(acc.daysActive, s.daysActive), // best day count
            totalDays: 7,
            avgMinutesPerDay: 0, // recalculated below
            consistencyRate: 0, // recalculated below
            uniqueCategories: acc.uniqueCategories + s.uniqueCategories,
            dailyBreakdown: [...acc.dailyBreakdown, ...s.dailyBreakdown]
        }), { totalMinutes: 0, totalSteps: 0, daysActive: 0, uniqueCategories: 0, dailyBreakdown: [] });

        merged.avgMinutesPerDay = Math.round(merged.totalMinutes / 7);
        merged.consistencyRate = Math.round((merged.daysActive / 7) * 100);

        res.json({ success: true, data: merged });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   GET /api/v1/exercises/stats/monthly
 * @desc    Monthly stats. Caretaker sees merged group stats unless ?clientId specified.
 * @query   ?month=1&year=2024  ?clientId=xxx
 * @access  Private
 */
exports.getMonthlyStats = async (req, res, next) => {
    try {
        const userIds = await resolveGroupUserIds(req);
        const now = new Date();
        const targetMonth = req.query.month ? parseInt(req.query.month) : now.getMonth() + 1;
        const targetYear = req.query.year ? parseInt(req.query.year) : now.getFullYear();

        const allStats = await Promise.all(
            userIds.map(uid => exerciseService.getMonthlyStats(uid, targetMonth, targetYear))
        );

        const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();

        const merged = allStats.reduce((acc, s) => ({
            period: s.period,
            totalMinutes: acc.totalMinutes + s.totalMinutes,
            totalSteps: acc.totalSteps + s.totalSteps,
            daysActive: Math.max(acc.daysActive, s.daysActive),
            daysInMonth,
            avgMinutesPerDay: 0,
            consistencyRate: 0,
            uniqueCategories: acc.uniqueCategories + s.uniqueCategories,
            mostFrequentCategory: s.mostFrequentCategory || acc.mostFrequentCategory,
            dailyBreakdown: [...acc.dailyBreakdown, ...s.dailyBreakdown]
        }), { totalMinutes: 0, totalSteps: 0, daysActive: 0, uniqueCategories: 0, dailyBreakdown: [], mostFrequentCategory: null });

        merged.avgMinutesPerDay = Math.round(merged.totalMinutes / daysInMonth);
        merged.consistencyRate = Math.round((merged.daysActive / daysInMonth) * 100);

        res.json({ success: true, data: merged });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   GET /api/v1/exercises/summary
 * @desc    Today's summary (quick dashboard stats).
 *          Caretaker can pass ?clientId=xxx.
 * @access  Private
 */
exports.getTodaySummary = async (req, res, next) => {
    try {
        const targetUserId = await resolveTargetUser(req);
        const summary = await exerciseService.getTodaySummary(targetUserId);
        res.json({ success: true, data: summary });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   DELETE /api/v1/exercises/log/:date
 * @desc    Delete exercise log for a specific date.
 *          Caretaker can delete client's log via ?clientId=xxx.
 * @access  Private
 */
exports.deleteLog = async (req, res, next) => {
    try {
        const targetUserId = await resolveTargetUser(req);
        const result = await exerciseService.deleteLog(targetUserId, req.params.date);

        if (!result) {
            return res.status(404).json({ success: false, message: 'No log found for this date' });
        }

        res.json({ success: true, message: 'Exercise log deleted' });
    } catch (err) {
        next(err);
    }
};

const CustomExercise = require('../models/customExerciseModel');

/**
 * @route   GET /api/v1/exercises/custom
 * @desc    Get custom / doctor-prescribed exercises for the family group
 * @access  Private
 */
exports.getCustomExercises = async (req, res, next) => {
    try {
        const groupId = req.user.groupId;
        let query = {};
        if (groupId) {
            query = { groupId };
        } else {
            query = { createdBy: req.user.id };
        }
        const exercises = await CustomExercise.find(query).sort({ createdAt: -1 });
        res.json({ success: true, count: exercises.length, data: exercises });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   POST /api/v1/exercises/custom
 * @desc    Add a doctor-recommended or custom exercise routine
 * @access  Private
 */
exports.addCustomExercise = async (req, res, next) => {
    try {
        const { title, doctorName, instructions, targetDuration, steps } = req.body;
        if (!title) {
            return res.status(400).json({ success: false, message: 'Exercise title is required' });
        }
        const exercise = await CustomExercise.create({
            groupId: req.user.groupId || null,
            createdBy: req.user.id,
            title: title.trim(),
            doctorName: (doctorName || '').trim(),
            instructions: (instructions || '').trim(),
            targetDuration: parseInt(targetDuration) || 15,
            steps: Array.isArray(steps) && steps.length > 0 ? steps : ['Perform 10-15 repetitions as tolerated', 'Rest for 30 seconds', 'Repeat 2 sets']
        });
        res.status(201).json({ success: true, message: 'Custom exercise added successfully', data: exercise });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   DELETE /api/v1/exercises/custom/:id
 * @desc    Delete custom exercise
 * @access  Private
 */
exports.deleteCustomExercise = async (req, res, next) => {
    try {
        const exId = req.params.id;
        const result = await CustomExercise.findByIdAndDelete(exId);
        if (!result) {
            return res.status(404).json({ success: false, message: 'Custom exercise not found' });
        }
        res.json({ success: true, message: 'Custom exercise deleted' });
    } catch (err) {
        next(err);
    }
};
