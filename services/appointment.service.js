// services/appointment.service.js
const Appointment = require('../models/appointmentModel');

/**
 * Get all appointments for a user with optional filters
 */
exports.getUserAppointments = async (userId, filters = {}) => {
    // Auto-update any upcoming appointments whose date/time has already passed to 'missed'
    await Appointment.updateMissedAppointments().catch(err => console.error('Error auto-updating missed appointments:', err));

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
    // Auto-update any upcoming appointments whose date/time has passed
    await Appointment.updateMissedAppointments().catch(err => console.error('Error auto-updating missed appointments:', err));

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

    // Validate date is not in the past.
    // apptData.date is a YYYY-MM-DD string from <input type="date">.
    // We get today's date in IST (Asia/Kolkata) as a YYYY-MM-DD string and
    // compare lexicographically — no Date() parsing, no timezone shift.
    const todayIST = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata'
    }).format(new Date());  // en-CA formats as YYYY-MM-DD

    if (apptData.date < todayIST) {
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
    // If date is being updated, validate it's not in the past.
    // Same IST string comparison used in createAppointment.
    if (updates.date) {
        const todayIST = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Kolkata'
        }).format(new Date());

        if (updates.date < todayIST && updates.status !== 'completed') {
            const error = new Error('Cannot update to a past date unless marking as completed');
            error.statusCode = 400;
            throw error;
        }
    }

    const appointment = await Appointment.findOneAndUpdate(
        { _id: apptId, userId },
        { $set: updates },
        { returnDocument: 'after', runValidators: true }
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
 * Mark appointment as attended with optional post notes
 */
exports.markAsAttended = async (apptId, userId, notesAfter = '') => {
    const appointment = await Appointment.findOne({ _id: apptId, userId });

    if (!appointment) {
        return null;
    }

    await appointment.markAttended(notesAfter);
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
 * Get appointment statistics for a single userId.
 * Uses countDocuments throughout — avoids the ObjectId casting bug
 * that caused aggregate() to silently return 0 results in some Mongoose versions.
 */
exports.getAppointmentStats = async (userId) => {
    const mongoose = require('mongoose');
    const now = new Date();

    // Always work with an ObjectId so both aggregate and countDocuments agree
    const oid = typeof userId === 'string'
        ? new mongoose.Types.ObjectId(userId)
        : userId;

    // Parallel count queries — one per status + today
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart); todayEnd.setDate(todayEnd.getDate() + 1);

    const [upcoming, completed, missed, cancelled, today] = await Promise.all([
        Appointment.countDocuments({ userId: oid, status: 'upcoming' }),
        Appointment.countDocuments({ userId: oid, status: 'completed' }),
        Appointment.countDocuments({ userId: oid, status: 'missed' }),
        Appointment.countDocuments({ userId: oid, status: 'cancelled' }),
        Appointment.countDocuments({
            userId: oid,
            date: { $gte: todayStart, $lt: todayEnd },
            status: { $ne: 'cancelled' }
        })
    ]);

    return {
        total: upcoming + completed + missed + cancelled,
        upcoming,
        completed,
        missed,
        cancelled,
        today
    };
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
