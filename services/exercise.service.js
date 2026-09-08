// services/exercise.service.js
const ExerciseLog = require('../models/exerciseLogModel');

/**
 * Get or create today's exercise log
 */
exports.getTodayLog = async (userId, groupId = null) => {
    const log = await ExerciseLog.getTodayLog(userId, groupId);
    return log;
};

/**
 * Get exercise log for a specific date
 */
exports.getLogByDate = async (userId, dateString) => {
    const targetDate = new Date(dateString);
    targetDate.setHours(0, 0, 0, 0);
    
    const log = await ExerciseLog.findOne({
        userId,
        date: targetDate
    });
    
    return log;
};

/**
 * Log completed exercises for today
 */
exports.logExercise = async (userId, exerciseData, groupId = null) => {
    const { category, steps, duration, notes } = exerciseData;
    
    // Validation
    if (!category || !steps || steps.length === 0) {
        const error = new Error('Category and steps are required');
        error.statusCode = 400;
        throw error;
    }
    
    // Get or create today's log
    const log = await ExerciseLog.getTodayLog(userId, groupId);
    
    // Use model's instance method to add exercise
    await log.addExercise(
        category,
        steps,
        duration || 0,
        exerciseData.comment || exerciseData.notes || '',
        exerciseData.feedback || ''
    );
    
    return log;
};

/**
 * Update daily notes for today's log
 */
exports.updateDailyNotes = async (userId, notes) => {
    const log = await ExerciseLog.getTodayLog(userId);
    
    log.dailyNotes = notes;
    await log.save();
    
    return log;
};

/**
 * Get exercise history (last N days)
 */
exports.getHistory = async (userId, days = 7) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);
    
    const logs = await ExerciseLog.find({
        userId,
        date: { $gte: startDate }
    }).sort({ date: -1 });  // Most recent first
    
    return logs;
};

/**
 * Get weekly exercise statistics
 */
exports.getWeeklyStats = async (userId) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get last 7 days
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const logs = await ExerciseLog.find({
        userId,
        date: { $gte: weekAgo, $lte: today }
    }).sort({ date: 1 });
    
    // Calculate totals
    let totalMinutes = 0;
    let totalSteps = 0;
    let daysActive = 0;
    const categoriesSet = new Set();
    
    logs.forEach(log => {
        totalMinutes += log.totalMinutes || 0;
        totalSteps += log.totalStepsCompleted || 0;
        if (log.totalStepsCompleted > 0) {
            daysActive++;
        }
        // Add all categories from this log
        if (log.completed) {
            log.completed.forEach((steps, category) => {
                categoriesSet.add(category);
            });
        }
    });
    
    const avgMinutesPerDay = logs.length > 0 ? Math.round(totalMinutes / 7) : 0;
    const consistencyRate = Math.round((daysActive / 7) * 100);
    
    return {
        period: 'Last 7 days',
        totalMinutes,
        totalSteps,
        daysActive,
        totalDays: 7,
        avgMinutesPerDay,
        consistencyRate,
        uniqueCategories: categoriesSet.size,
        dailyBreakdown: logs.map(log => ({
            date: log.date,
            minutes: log.totalMinutes,
            steps: log.totalStepsCompleted,
            categories: log.categoriesCompleted
        }))
    };
};

/**
 * Get monthly exercise statistics
 */
exports.getMonthlyStats = async (userId, month, year) => {
    // Create date range for the month
    const startDate = new Date(year, month - 1, 1);  // month is 1-indexed
    const endDate = new Date(year, month, 0);  // Last day of month
    endDate.setHours(23, 59, 59, 999);
    
    const logs = await ExerciseLog.find({
        userId,
        date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });
    
    // Calculate totals
    let totalMinutes = 0;
    let totalSteps = 0;
    let daysActive = 0;
    const categoriesSet = new Set();
    const categoryFrequency = {};
    
    logs.forEach(log => {
        totalMinutes += log.totalMinutes || 0;
        totalSteps += log.totalStepsCompleted || 0;
        if (log.totalStepsCompleted > 0) {
            daysActive++;
        }
        
        if (log.completed) {
            log.completed.forEach((steps, category) => {
                categoriesSet.add(category);
                categoryFrequency[category] = (categoryFrequency[category] || 0) + 1;
            });
        }
    });
    
    const daysInMonth = new Date(year, month, 0).getDate();
    const avgMinutesPerDay = logs.length > 0 ? Math.round(totalMinutes / daysInMonth) : 0;
    const consistencyRate = Math.round((daysActive / daysInMonth) * 100);
    
    // Find most common category
    let mostFrequentCategory = null;
    let maxFrequency = 0;
    for (const [category, freq] of Object.entries(categoryFrequency)) {
        if (freq > maxFrequency) {
            maxFrequency = freq;
            mostFrequentCategory = category;
        }
    }
    
    return {
        period: `${year}-${String(month).padStart(2, '0')}`,
        totalMinutes,
        totalSteps,
        daysActive,
        daysInMonth,
        avgMinutesPerDay,
        consistencyRate,
        uniqueCategories: categoriesSet.size,
        mostFrequentCategory,
        categoryFrequency,
        dailyBreakdown: logs.map(log => ({
            date: log.date,
            minutes: log.totalMinutes,
            steps: log.totalStepsCompleted,
            categories: log.categoriesCompleted
        }))
    };
};

/**
 * Delete exercise log for a specific date
 */
exports.deleteLog = async (userId, dateString) => {
    const targetDate = new Date(dateString);
    targetDate.setHours(0, 0, 0, 0);
    
    const result = await ExerciseLog.deleteOne({
        userId,
        date: targetDate
    });
    
    return result.deletedCount > 0 ? result : null;
};

/**
 * Get today's summary (quick stats for dashboard)
 */
exports.getTodaySummary = async (userId) => {
    const log = await ExerciseLog.getTodayLog(userId);
    
    // Use model's instance method
    const summary = log.getSummary();
    
    console.log('Exercise Summary for user', userId, ':', summary);
    
    return summary;
};

/**
 * Get exercise streak (consecutive days with activity)
 */
exports.getExerciseStreak = async (userId) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let currentDate = new Date(today);
    let streak = 0;
    
    // Check backwards from today
    for (let i = 0; i < 365; i++) {  // Max 1 year lookback
        const log = await ExerciseLog.findOne({
            userId,
            date: currentDate
        });
        
        if (log && log.totalStepsCompleted > 0) {
            streak++;
        } else {
            break;  // Streak broken
        }
        
        // Go to previous day
        currentDate.setDate(currentDate.getDate() - 1);
    }
    
    return {
        currentStreak: streak,
        streakDays: streak,
        lastActiveDate: streak > 0 ? today : null
    };
};
