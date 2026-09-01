// controllers/appointment.controller.js
const appointmentService = require('../services/appointment.service');

/**
 * @route   GET /api/v1/appointments
 * @desc    Get all appointments for logged-in user
 * @access  Private
 */
exports.getAllAppointments = async (req, res, next) => {
    try {
        const userId = req.user.id;
        
        // Optional filters: status, date range
        const { status, from, to } = req.query;
        
        const filters = {};
        if (status) filters.status = status;
        if (from || to) {
            filters.dateRange = {};
            if (from) filters.dateRange.from = new Date(from);
            if (to) filters.dateRange.to = new Date(to);
        }
        
        const appointments = await appointmentService.getUserAppointments(userId, filters);
        
        res.json({
            success: true,
            count: appointments.length,
            data: appointments
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   GET /api/v1/appointments/:id
 * @desc    Get single appointment by ID
 * @access  Private
 */
exports.getAppointmentById = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const apptId = req.params.id;
        
        const appointment = await appointmentService.getAppointmentById(apptId, userId);
        
        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }
        
        res.json({
            success: true,
            data: appointment
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   GET /api/v1/appointments/upcoming/today
 * @desc    Get today's appointments
 * @access  Private
 */
exports.getTodayAppointments = async (req, res, next) => {
    try {
        const userId = req.user.id;
        
        const appointments = await appointmentService.getTodayAppointments(userId);
        
        res.json({
            success: true,
            count: appointments.length,
            data: appointments
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   POST /api/v1/appointments
 * @desc    Create new appointment
 * @access  Private
 */
exports.createAppointment = async (req, res, next) => {
    try {
        const userId = req.user.id;
        
        const apptData = {
            userId,
            title: req.body.title,
            location: req.body.location,
            date: req.body.date,
            time: req.body.time,
            notes: req.body.notes,
            reminderMinutesBefore: req.body.reminderMinutesBefore,
            createdBy: userId  // Track who created it
        };
        
        const appointment = await appointmentService.createAppointment(apptData);
        
        res.status(201).json({
            success: true,
            message: 'Appointment created successfully',
            data: appointment
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   PUT /api/v1/appointments/:id
 * @desc    Update appointment details
 * @access  Private
 */
exports.updateAppointment = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const apptId = req.params.id;
        
        const updates = {};
        const allowedFields = ['title', 'location', 'date', 'time', 'notes', 'status', 'reminderMinutesBefore'];
        
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });
        
        const appointment = await appointmentService.updateAppointment(apptId, userId, updates);
        
        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Appointment updated successfully',
            data: appointment
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   PATCH /api/v1/appointments/:id/complete
 * @desc    Mark appointment as completed
 * @access  Private
 */
exports.markAsCompleted = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const apptId = req.params.id;
        
        const appointment = await appointmentService.markAsCompleted(apptId, userId);
        
        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Appointment marked as completed',
            data: appointment
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   PATCH /api/v1/appointments/:id/cancel
 * @desc    Cancel appointment
 * @access  Private
 */
exports.cancelAppointment = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const apptId = req.params.id;
        const reason = req.body.reason || '';
        
        const appointment = await appointmentService.cancelAppointment(apptId, userId, reason);
        
        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Appointment cancelled',
            data: appointment
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   DELETE /api/v1/appointments/:id
 * @desc    Delete appointment permanently
 * @access  Private
 */
exports.deleteAppointment = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const apptId = req.params.id;
        
        const result = await appointmentService.deleteAppointment(apptId, userId);
        
        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Appointment deleted'
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   GET /api/v1/appointments/stats/summary
 * @desc    Get appointment statistics (upcoming, completed, missed counts)
 * @access  Private
 */
exports.getStats = async (req, res, next) => {
    try {
        const userId = req.user.id;
        
        console.log('Getting appointment stats for userId:', userId, 'Type:', typeof userId);
        
        const stats = await appointmentService.getAppointmentStats(userId);
        
        console.log('Returning stats:', stats);
        
        res.json({
            success: true,
            data: stats
        });
    } catch (err) {
        console.error('Error in getStats:', err);
        next(err);
    }
};

/**
 * @route   POST /api/v1/appointments/update-missed
 * @desc    Auto-update past appointments to "missed" status
 * @access  Private (can be called by cron job)
 */
exports.updateMissedAppointments = async (req, res, next) => {
    try {
        const result = await appointmentService.updateMissedAppointments();
        
        res.json({
            success: true,
            message: 'Missed appointments updated',
            data: { modifiedCount: result.modifiedCount }
        });
    } catch (err) {
        next(err);
    }
};
