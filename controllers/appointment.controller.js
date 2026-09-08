// controllers/appointment.controller.js
const appointmentService = require('../services/appointment.service');
const { resolveTargetUser, resolveGroupUserIds } = require('../middleware/resolveTargetUser');

/**
 * @route   GET /api/v1/appointments
 * @desc    Get all appointments.
 *          Client → own. Caretaker + ?clientId → that client's. Caretaker alone → whole group.
 * @access  Private
 */
exports.getAllAppointments = async (req, res, next) => {
    try {
        const userIds = await resolveGroupUserIds(req);

        const { status, from, to } = req.query;
        const filters = {};
        if (status) filters.status = status;
        if (from || to) {
            filters.dateRange = {};
            if (from) filters.dateRange.from = new Date(from);
            if (to) filters.dateRange.to = new Date(to);
        }

        // Fetch for all resolved userIds and merge
        const results = await Promise.all(
            userIds.map(uid => appointmentService.getUserAppointments(uid, filters))
        );
        const appointments = results.flat().sort((a, b) => new Date(a.date) - new Date(b.date));

        res.json({ success: true, count: appointments.length, data: appointments });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   GET /api/v1/appointments/stats/summary
 * @desc    Appointment statistics. Caretaker sees combined group stats.
 * @access  Private
 */
exports.getStats = async (req, res, next) => {
    try {
        const userIds = await resolveGroupUserIds(req);

        // Aggregate stats across all resolved users
        const allStats = await Promise.all(
            userIds.map(uid => appointmentService.getAppointmentStats(uid))
        );

        // Merge stat objects
        const merged = allStats.reduce((acc, s) => ({
            total: acc.total + s.total,
            upcoming: acc.upcoming + s.upcoming,
            completed: acc.completed + s.completed,
            missed: acc.missed + s.missed,
            cancelled: acc.cancelled + s.cancelled,
            today: acc.today + s.today
        }), { total: 0, upcoming: 0, completed: 0, missed: 0, cancelled: 0, today: 0 });

        res.json({ success: true, data: merged });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   GET /api/v1/appointments/upcoming/today
 * @desc    Today's appointments. Caretaker sees whole group.
 * @access  Private
 */
exports.getTodayAppointments = async (req, res, next) => {
    try {
        const userIds = await resolveGroupUserIds(req);

        const results = await Promise.all(
            userIds.map(uid => appointmentService.getTodayAppointments(uid))
        );
        const appointments = results.flat().sort((a, b) => a.time.localeCompare(b.time));

        res.json({ success: true, count: appointments.length, data: appointments });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   GET /api/v1/appointments/:id
 * @desc    Get single appointment by ID (group-scoped ownership check)
 * @access  Private
 */
exports.getAppointmentById = async (req, res, next) => {
    try {
        const userIds = await resolveGroupUserIds(req);
        const apptId = req.params.id;

        // Try each userId until we find the record
        let appointment = null;
        for (const uid of userIds) {
            appointment = await appointmentService.getAppointmentById(apptId, uid);
            if (appointment) break;
        }

        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }

        res.json({ success: true, data: appointment });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   POST /api/v1/appointments
 * @desc    Create new appointment.
 *          Caretaker can pass ?clientId=xxx to create FOR a client.
 * @access  Private
 */
exports.createAppointment = async (req, res, next) => {
    try {
        const targetUserId = await resolveTargetUser(req);

        const doctor = req.body.doctor || '';
        const hospital = req.body.hospital || '';
        const address = req.body.address || req.body.location || '';
        const location = req.body.location || address || hospital || 'Not specified';
        const title = req.body.title || (doctor ? `Dr. ${doctor}` : 'Doctor Visit');

        const apptData = {
            userId: targetUserId,
            groupId: req.user.groupId || null,
            title,
            doctor,
            hospital,
            address,
            location,
            date: req.body.date,
            time: req.body.time,
            notes: req.body.notes || req.body.purpose || '',
            notesAfter: req.body.notesAfter || '',
            status: req.body.status || 'upcoming',
            reminderMinutesBefore: req.body.reminderMinutesBefore,
            createdBy: req.user.id,
            createdByRole: req.user.role || 'caretaker'
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
 * @desc    Update appointment. Caretaker can update client's appointment.
 * @access  Private
 */
exports.updateAppointment = async (req, res, next) => {
    try {
        const userIds = await resolveGroupUserIds(req);
        const apptId = req.params.id;

        const updates = {};
        const allowedFields = ['title', 'doctor', 'hospital', 'address', 'location', 'date', 'time', 'notes', 'notesAfter', 'status', 'reminderMinutesBefore'];
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) updates[field] = req.body[field];
        });

        // Find which userId owns this appointment, then update
        let appointment = null;
        for (const uid of userIds) {
            appointment = await appointmentService.updateAppointment(apptId, uid, updates);
            if (appointment) break;
        }

        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }

        res.json({ success: true, message: 'Appointment updated successfully', data: appointment });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   PATCH /api/v1/appointments/:id/attend
 * @desc    Mark appointment as attended with optional post notes
 * @access  Private
 */
exports.markAsAttended = async (req, res, next) => {
    try {
        const userIds = await resolveGroupUserIds(req);
        const apptId = req.params.id;
        const { notesAfter } = req.body;

        let appointment = null;
        for (const uid of userIds) {
            appointment = await appointmentService.markAsAttended(apptId, uid, notesAfter);
            if (appointment) break;
        }

        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }

        res.json({ success: true, message: 'Appointment marked as attended', data: appointment });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   PATCH /api/v1/appointments/:id/attend
 * @access  Private
 */
exports.markAsAttended = async (req, res, next) => {
    try {
        const userIds = await resolveGroupUserIds(req);
        const apptId = req.params.id;
        const notesAfter = req.body.notesAfter || '';

        let appointment = null;
        for (const uid of userIds) {
            appointment = await appointmentService.markAsAttended(apptId, uid, notesAfter);
            if (appointment) break;
        }

        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }

        res.json({ success: true, message: 'Appointment marked as attended', data: appointment });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   PATCH /api/v1/appointments/:id/complete
 * @access  Private
 */
exports.markAsCompleted = async (req, res, next) => {
    try {
        const userIds = await resolveGroupUserIds(req);
        const apptId = req.params.id;

        let appointment = null;
        for (const uid of userIds) {
            appointment = await appointmentService.markAsCompleted(apptId, uid);
            if (appointment) break;
        }

        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }

        res.json({ success: true, message: 'Appointment marked as completed', data: appointment });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   PATCH /api/v1/appointments/:id/cancel
 * @access  Private
 */
exports.cancelAppointment = async (req, res, next) => {
    try {
        const userIds = await resolveGroupUserIds(req);
        const apptId = req.params.id;
        const reason = req.body.reason || '';

        let appointment = null;
        for (const uid of userIds) {
            appointment = await appointmentService.cancelAppointment(apptId, uid, reason);
            if (appointment) break;
        }

        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }

        res.json({ success: true, message: 'Appointment cancelled', data: appointment });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   DELETE /api/v1/appointments/:id
 * @access  Private
 */
exports.deleteAppointment = async (req, res, next) => {
    try {
        const userIds = await resolveGroupUserIds(req);
        const apptId = req.params.id;

        let result = null;
        for (const uid of userIds) {
            result = await appointmentService.deleteAppointment(apptId, uid);
            if (result) break;
        }

        if (!result) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }

        res.json({ success: true, message: 'Appointment deleted' });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   POST /api/v1/appointments/update-missed
 * @desc    Auto-update past appointments to "missed" status (cron / manual trigger)
 * @access  Private
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
