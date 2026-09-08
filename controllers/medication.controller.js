const medicationService = require('../services/medication.service');
const { resolveTargetUser, resolveGroupUserIds } = require('../middleware/resolveTargetUser');

/**
 * @route   GET /api/v1/medications
 * @desc    Get all medications for user or family group.
 *          Both caretaker and client see all group medications.
 *          Pass ?clientId=xxx to filter to a specific client.
 * @access  Private
 */
exports.getAllMedications = async (req, res, next) => {
    try {
        const userIds = await resolveGroupUserIds(req);
        const { activeOnly } = req.query;

        const medications = await medicationService.getUserMedications(userIds, {
            activeOnly: activeOnly === 'true'
        });

        res.json({ success: true, count: medications.length, data: medications });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   GET /api/v1/medications/stats/today
 * @desc    Today's medication stats. Both caretaker and client see family group stats.
 *          Pass ?clientId=xxx to filter to one client.
 * @access  Private
 */
exports.getTodayStats = async (req, res, next) => {
    try {
        const userIds = await resolveGroupUserIds(req);
        const stats = await medicationService.getTodayStats(userIds);
        res.json({ success: true, data: stats });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   GET /api/v1/medications/:id
 * @desc    Get single medication by ID (group-scoped)
 * @access  Private
 */
exports.getMedicationById = async (req, res, next) => {
    try {
        const userIds = await resolveGroupUserIds(req);
        const medication = await medicationService.getMedicationById(req.params.id, userIds);

        if (!medication) {
            return res.status(404).json({ success: false, message: 'Medication not found' });
        }
        res.json({ success: true, data: medication });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   POST /api/v1/medications
 * @desc    Create new medication.
 *          Both caretaker and client can add medications.
 *          Caretakers default to group's primary client or can pass ?clientId=xxx.
 * @access  Private
 */
exports.createMedication = async (req, res, next) => {
    try {
        const targetUserId = await resolveTargetUser(req);

        const medData = {
            userId: targetUserId,
            groupId: req.user.groupId || null,
            name: req.body.name,
            dosage: req.body.dosage || '1 tablet',
            frequency: req.body.frequency || 'once-daily',
            timeOfDay: req.body.timeOfDay || 'morning',
            date: req.body.date ? new Date(req.body.date) : new Date(),
            startDate: req.body.startDate ? new Date(req.body.startDate) : (req.body.date ? new Date(req.body.date) : new Date()),
            endDate: req.body.endDate ? new Date(req.body.endDate) : null,
            time: req.body.time || '08:00',
            reminder: req.body.reminder !== undefined ? req.body.reminder : true,
            reminderTime: req.body.reminderTime || req.body.time || null,
            instructions: req.body.instructions || req.body.notes || '',
            notes: req.body.notes || req.body.instructions || '',
            createdBy: req.user.id,
            createdByRole: req.user.role || 'caretaker'
        };

        const medication = await medicationService.createMedication(medData);

        res.status(201).json({
            success: true,
            message: 'Medication added successfully',
            data: medication
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   PATCH /api/v1/medications/:id/mark-taken
 * @desc    Mark medication as taken. Both caretaker and client can mark.
 * @access  Private
 */
exports.markAsTaken = async (req, res, next) => {
    try {
        const userIds = await resolveGroupUserIds(req);
        const medication = await medicationService.markMedicationAsTaken(req.params.id, userIds);

        if (!medication) {
            return res.status(404).json({ success: false, message: 'Medication not found' });
        }
        res.json({ success: true, message: 'Medication marked as taken', data: medication });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   PATCH /api/v1/medications/:id/unmark
 * @desc    Unmark medication. Both caretaker and client can unmark.
 * @access  Private
 */
exports.unmarkAsTaken = async (req, res, next) => {
    try {
        const userIds = await resolveGroupUserIds(req);
        const medication = await medicationService.unmarkMedication(req.params.id, userIds);

        if (!medication) {
            return res.status(404).json({ success: false, message: 'Medication not found' });
        }
        res.json({ success: true, message: 'Medication unmarked', data: medication });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   PUT /api/v1/medications/:id
 * @desc    Update medication details. Both caretaker and client can update.
 * @access  Private
 */
exports.updateMedication = async (req, res, next) => {
    try {
        const userIds = await resolveGroupUserIds(req);

        const updates = {};
        const allowedFields = ['name', 'dosage', 'frequency', 'timeOfDay', 'date', 'startDate', 'endDate', 'time', 'reminder', 'reminderTime', 'instructions', 'notes', 'isActive'];
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) updates[field] = req.body[field];
        });

        const medication = await medicationService.updateMedication(req.params.id, userIds, updates);

        if (!medication) {
            return res.status(404).json({ success: false, message: 'Medication not found' });
        }
        res.json({ success: true, message: 'Medication updated successfully', data: medication });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   DELETE /api/v1/medications/:id
 * @desc    Soft delete (isActive = false). Both caretaker and client can remove.
 * @access  Private
 */
exports.deleteMedication = async (req, res, next) => {
    try {
        const userIds = await resolveGroupUserIds(req);
        const medication = await medicationService.deleteMedication(req.params.id, userIds);

        if (!medication) {
            return res.status(404).json({ success: false, message: 'Medication not found' });
        }
        res.json({ success: true, message: 'Medication removed' });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   POST /api/v1/medications/reset-daily
 * @desc    Reset all takenToday flags (cron job at midnight)
 * @access  Admin only
 */
exports.resetDailyStatus = async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }
        const result = await medicationService.resetAllDailyStatus();
        res.json({ success: true, message: 'Daily status reset completed', data: { modifiedCount: result.modifiedCount } });
    } catch (err) {
        next(err);
    }
};
