// controllers/medication.controller.js
const medicationService = require('../services/medication.service');

/**
 * @route   GET /api/v1/medications
 * @desc    Get all medications for logged-in user
 * @access  Private (requires JWT)
 */
exports.getAllMedications = async (req, res, next) => {
    try {
        // req.user is set by auth middleware (contains { id, role })
        const userId = req.user.id;
        
        // Optional query params for filtering
        const { activeOnly } = req.query;
        
        const medications = await medicationService.getUserMedications(userId, {
            activeOnly: activeOnly === 'true'
        });
        
        res.json({
            success: true,
            count: medications.length,
            data: medications
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   GET /api/v1/medications/:id
 * @desc    Get single medication by ID
 * @access  Private
 */
exports.getMedicationById = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const medId = req.params.id;
        
        const medication = await medicationService.getMedicationById(medId, userId);
        
        if (!medication) {
            return res.status(404).json({
                success: false,
                message: 'Medication not found'
            });
        }
        
        res.json({
            success: true,
            data: medication
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   POST /api/v1/medications
 * @desc    Create new medication
 * @access  Private
 */
exports.createMedication = async (req, res, next) => {
    try {
        const userId = req.user.id;
        
        // Extract medication data from request body
        const medData = {
            userId,
            name: req.body.name,
            dosage: req.body.dosage,
            frequency: req.body.frequency,
            timeOfDay: req.body.timeOfDay,
            reminderTime: req.body.reminderTime,
            notes: req.body.notes
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
 * @desc    Mark medication as taken for today
 * @access  Private
 */
exports.markAsTaken = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const medId = req.params.id;
        
        const medication = await medicationService.markMedicationAsTaken(medId, userId);
        
        if (!medication) {
            return res.status(404).json({
                success: false,
                message: 'Medication not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Medication marked as taken',
            data: medication
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   PATCH /api/v1/medications/:id/unmark
 * @desc    Unmark medication (undo taken status)
 * @access  Private
 */
exports.unmarkAsTaken = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const medId = req.params.id;
        
        const medication = await medicationService.unmarkMedication(medId, userId);
        
        if (!medication) {
            return res.status(404).json({
                success: false,
                message: 'Medication not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Medication unmarked',
            data: medication
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   PUT /api/v1/medications/:id
 * @desc    Update medication details
 * @access  Private
 */
exports.updateMedication = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const medId = req.params.id;
        
        // Only update fields that are provided
        const updates = {};
        const allowedFields = ['name', 'dosage', 'frequency', 'timeOfDay', 'reminderTime', 'notes', 'isActive'];
        
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });
        
        const medication = await medicationService.updateMedication(medId, userId, updates);
        
        if (!medication) {
            return res.status(404).json({
                success: false,
                message: 'Medication not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Medication updated successfully',
            data: medication
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   DELETE /api/v1/medications/:id
 * @desc    Soft delete medication (set isActive to false)
 * @access  Private
 */
exports.deleteMedication = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const medId = req.params.id;
        
        // Soft delete - keeps record but marks as inactive
        const medication = await medicationService.deleteMedication(medId, userId);
        
        if (!medication) {
            return res.status(404).json({
                success: false,
                message: 'Medication not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Medication removed'
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   GET /api/v1/medications/stats/today
 * @desc    Get today's medication statistics (taken vs total)
 * @access  Private
 */
exports.getTodayStats = async (req, res, next) => {
    try {
        const userId = req.user.id;
        
        const stats = await medicationService.getTodayStats(userId);
        
        res.json({
            success: true,
            data: stats
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   POST /api/v1/medications/reset-daily
 * @desc    Reset all takenToday flags (called by cron job at midnight)
 * @access  Admin only
 */
exports.resetDailyStatus = async (req, res, next) => {
    try {
        // Only allow admin users to call this
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }
        
        const result = await medicationService.resetAllDailyStatus();
        
        res.json({
            success: true,
            message: 'Daily status reset completed',
            data: { modifiedCount: result.modifiedCount }
        });
    } catch (err) {
        next(err);
    }
};
