// services/medication.service.js
const Medication = require('../models/medicationModel');

/**
 * Helper to build user query condition (single ID or array of group IDs)
 */
function buildUserQuery(userIdOrIds) {
    if (Array.isArray(userIdOrIds)) {
        return { $in: userIdOrIds };
    }
    return userIdOrIds;
}

/**
 * Get all medications for a specific user or group of users
 */
exports.getUserMedications = async (userIdOrIds, options = {}) => {
    const userQuery = buildUserQuery(userIdOrIds);

    // Auto-reset: Any medication marked taken on a previous calendar day resets to takenToday: false
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    await Medication.updateMany({
        userId: userQuery,
        takenToday: true,
        $or: [
            { lastTakenAt: null },
            { lastTakenAt: { $lt: startOfToday } }
        ]
    }, {
        $set: { takenToday: false }
    });

    const query = { userId: userQuery };
    
    // Filter by active status if requested
    if (options.activeOnly) {
        query.isActive = true;
    }
    
    const medications = await Medication.find(query)
        .populate('userId', 'name role')
        .sort({ timeOfDay: 1, createdAt: 1 });  // Sort by time of day
    
    return medications;
};

/**
 * Get single medication by ID (with user/group ownership check)
 */
exports.getMedicationById = async (medId, userIdOrIds) => {
    const medication = await Medication.findOne({
        _id: medId,
        userId: buildUserQuery(userIdOrIds)
    }).populate('userId', 'name role');
    
    return medication;
};

/**
 * Create new medication
 */
exports.createMedication = async (medData) => {
    // Validate required fields
    if (!medData.name) {
        const error = new Error('Medication name is required');
        error.statusCode = 400;
        throw error;
    }
    
    const medication = await Medication.create(medData);
    return medication;
};

/**
 * Mark medication as taken for today
 */
exports.markMedicationAsTaken = async (medId, userIdOrIds) => {
    const medication = await Medication.findOne({
        _id: medId,
        userId: buildUserQuery(userIdOrIds)
    });
    
    if (!medication) {
        return null;
    }
    
    // Use the model's instance method
    await medication.markAsTaken();
    
    return medication;
};

/**
 * Unmark medication (undo taken status)
 */
exports.unmarkMedication = async (medId, userIdOrIds) => {
    const medication = await Medication.findOne({
        _id: medId,
        userId: buildUserQuery(userIdOrIds)
    });
    
    if (!medication) {
        return null;
    }
    
    medication.takenToday = false;
    medication.lastTakenAt = null;
    await medication.save();
    
    return medication;
};

/**
 * Update medication details
 */
exports.updateMedication = async (medId, userIdOrIds, updates) => {
    const medication = await Medication.findOneAndUpdate(
        { _id: medId, userId: buildUserQuery(userIdOrIds) },
        { $set: updates },
        { returnDocument: 'after', runValidators: true }  // Return updated doc, run validation
    );
    
    return medication;
};

/**
 * Soft delete medication (set isActive to false)
 */
exports.deleteMedication = async (medId, userIdOrIds) => {
    const medication = await Medication.findOneAndUpdate(
        { _id: medId, userId: buildUserQuery(userIdOrIds) },
        { $set: { isActive: false } },
        { returnDocument: 'after' }
    );
    
    return medication;
};

/**
 * Get today's medication statistics (for single user or combined group)
 */
exports.getTodayStats = async (userIdOrIds) => {
    const userQuery = buildUserQuery(userIdOrIds);

    // Auto-reset: Any medication marked taken on a previous calendar day resets to takenToday: false
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    await Medication.updateMany({
        userId: userQuery,
        takenToday: true,
        $or: [
            { lastTakenAt: null },
            { lastTakenAt: { $lt: startOfToday } }
        ]
    }, {
        $set: { takenToday: false }
    });

    const medications = await Medication.find({
        userId: userQuery,
        isActive: true
    });
    
    const total = medications.length;
    const taken = medications.filter(m => m.takenToday).length;
    const remaining = total - taken;
    const completionRate = total > 0 ? Math.round((taken / total) * 100) : 0;
    
    // Group by time of day
    const byTimeOfDay = {
        morning: { total: 0, taken: 0 },
        afternoon: { total: 0, taken: 0 },
        evening: { total: 0, taken: 0 },
        night: { total: 0, taken: 0 },
        anytime: { total: 0, taken: 0 }
    };
    
    medications.forEach(med => {
        const time = med.timeOfDay || 'anytime';
        byTimeOfDay[time].total++;
        if (med.takenToday) {
            byTimeOfDay[time].taken++;
        }
    });
    
    return {
        total,
        taken,
        remaining,
        completionRate,
        byTimeOfDay,
        medications: medications.map(m => ({
            id: m._id,
            name: m.name,
            dosage: m.dosage,
            timeOfDay: m.timeOfDay,
            takenToday: m.takenToday,
            lastTakenAt: m.lastTakenAt
        }))
    };
};

/**
 * Reset all medications' takenToday flag (called at midnight by cron)
 */
exports.resetAllDailyStatus = async () => {
    const result = await Medication.resetDailyStatus();
    return result;
};

/**
 * Get medication adherence history (last N days)
 * Useful for tracking compliance over time
 */
exports.getAdherenceHistory = async (userId, days = 7) => {
    // Note: This would require a separate collection to track daily adherence
    // For now, we can only show current day status
    // Future enhancement: Create MedicationHistory collection
    
    const stats = await this.getTodayStats(userId);
    
    return {
        period: `Last ${days} days`,
        note: 'Historical tracking coming soon',
        today: stats
    };
};
