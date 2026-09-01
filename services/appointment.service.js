// services/appointment.service.js
const Appointment = require('../models/appointmentModel');

/**
 * Get all appointments for a user with optional filters
 */
exports.getUserAppointments = async (userId, filters = {}) => {
    const query = { userId };
    
    // Filter by status
    if (filters.status) {
        query.status = filters.status;
    }
    
    // Filter by date range
    if (filters.dateRange) {
        query.date = {};
        if (filters.dateRange.from) {
            query.date.$gte = filters.dateRange.from;
        }
        if (filters.dateRange.to) {
            query.date.$lte = filters.dateRange.to;
        }
    }
    
    const appointments = await Appointment.find(query)
        .sort({ date: 1, time: 1 })  // Sort chronologically
        .populate('createdBy', 'name role');  // Include creator info
    
    return appointments;
};

/**
 * Get single appointment by ID
 */
exports.getAppointmentById = async (apptId, userId) => {
    const appointment = await Appointment.findOne({
        _id: apptId,
        userId: userId
    }).populate('createdBy', 'name role');
    
    return appointment;
};

/**
 * Get today's appointments
 */
exports.getTodayAppointments = async (userId) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const appointments = await Appointment.find({
        userId,
        date: {
            $gte: today,
            $lt: tomorrow
        },
        status: { $ne: 'cancelled' }  // Exclude cancelled
    }).sort({ time: 1 });
    
    return appointments;
};

/**
 * Create new appointment
 */
exports.createAppointment = async (apptData) => {
    // Validate required fields
    if (!apptData.title || !apptData.date || !apptData.time) {
        const error = new Error('Title, date, and time are required');
        error.statusCode = 400;
        throw error;
    }
    
    // Validate date is not in the past
    const apptDate = new Date(apptData.date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    if (apptDate < now) {
        const error = new Error('Appointment date cannot be in the past');
        error.statusCode = 400;
        throw error;
    }
    
    const appointment = await Appointment.create(apptData);
    return appointment;
};

/**
 * Update appointment details
 */
exports.updateAppointment = async (apptId, userId, updates) => {
    // If date is being updated, validate it's not in the past
    if (updates.date) {
        const newDate = new Date(updates.date);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        
        if (newDate < now && updates.status !== 'completed') {
            const error = new Error('Cannot update to a past date unless marking as completed');
            error.statusCode = 400;
            throw error;
        }
    }
    
    const appointment = await Appointment.findOneAndUpdate(
        { _id: apptId, userId },
        { $set: updates },
        { new: true, runValidators: true }
    );
    
    return appointment;
};

/**
 * Mark appointment as completed
 */
exports.markAsCompleted = async (apptId, userId) => {
    const appointment = await Appointment.findOne({ _id: apptId, userId });
    
    if (!appointment) {
        return null;
    }
    
    // Use model's instance method
    await appointment.markCompleted();
    
    return appointment;
};

/**
 * Cancel appointment
 */
exports.cancelAppointment = async (apptId, userId, reason = '') => {
    const appointment = await Appointment.findOne({ _id: apptId, userId });
    
    if (!appointment) {
        return null;
    }
    
    appointment.status = 'cancelled';
    if (reason) {
        appointment.notes = (appointment.notes || '') + `\n[Cancelled: ${reason}]`;
    }
    
    await appointment.save();
    return appointment;
};

/**
 * Delete appointment permanently
 */
exports.deleteAppointment = async (apptId, userId) => {
    const result = await Appointment.deleteOne({ _id: apptId, userId });
    return result.deletedCount > 0 ? result : null;
};

/**
 * Get appointment statistics
 */
exports.getAppointmentStats = async (userId) => {
    const mongoose = require('mongoose');
    const now = new Date();
    
    // Convert userId string to ObjectId for MongoDB aggregate query
    // Note: In newer mongoose versions, this conversion may be automatic
    let userIdToMatch = userId;
    try {
        // Try to convert to ObjectId if it's a string
        if (typeof userId === 'string') {
            userIdToMatch = new mongoose.Types.ObjectId(userId);
        }
    } catch (e) {
        console.log('UserId is already ObjectId or conversion failed, using as-is');
    }
    
    console.log('Querying appointments with userId:', userIdToMatch, 'Type:', typeof userIdToMatch);
    
    // Count by status - try both with ObjectId and without
    const statusCounts = await Appointment.aggregate([
        { $match: { userId: userIdToMatch } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    console.log('Status counts from aggregate:', statusCounts);
    
    // If aggregate returned nothing, try direct query
    if (statusCounts.length === 0) {
        console.log('Aggregate returned 0 results, trying direct count...');
        const totalCount = await Appointment.countDocuments({ userId: userId });
        console.log('Direct count result:', totalCount);
    }
    
    const stats = {
        total: 0,
        upcoming: 0,
        completed: 0,
        missed: 0,
        cancelled: 0,
        today: 0
    };
    
    statusCounts.forEach(item => {
        stats[item._id] = item.count;
        stats.total += item.count;
    });
    
    // Count today's appointments
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    
    stats.today = await Appointment.countDocuments({
        userId: userId,
        date: { $gte: todayStart, $lt: todayEnd },
        status: { $ne: 'cancelled' }
    });
    
    console.log('Final appointment stats:', stats);
    
    return stats;
};

/**
 * Auto-update appointments that are past due to "missed" status
 */
exports.updateMissedAppointments = async () => {
    const result = await Appointment.updateMissedAppointments();
    return result;
};

/**
 * Get upcoming appointments (next 7 days)
 */
exports.getUpcomingAppointments = async (userId, days = 7) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const future = new Date(today);
    future.setDate(future.getDate() + days);
    
    const appointments = await Appointment.find({
        userId,
        date: { $gte: today, $lt: future },
        status: 'upcoming'
    }).sort({ date: 1, time: 1 });
    
    return appointments;
};

/**
 * Check for appointment conflicts (same date/time)
 */
exports.checkConflicts = async (userId, date, time, excludeId = null) => {
    const query = {
        userId,
        date,
        time,
        status: { $in: ['upcoming', 'completed'] }  // Don't check cancelled/missed
    };
    
    if (excludeId) {
        query._id = { $ne: excludeId };  // Exclude current appointment when updating
    }
    
    const conflicts = await Appointment.find(query);
    return conflicts;
};
