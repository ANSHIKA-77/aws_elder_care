// controllers/emergency.controller.js
const emergencyService = require('../services/emergency.service');
const { resolveTargetUser, resolveGroupUserIds } = require('../middleware/resolveTargetUser');

/**
 * @route   POST /api/v1/emergency/trigger
 * @desc    Trigger emergency alert.
 *          Client triggers for themselves. Caretaker can trigger on behalf of client via ?clientId=xxx.
 * @access  Private
 */
exports.trigger = async (req, res, next) => {
    try {
        const targetUserId = await resolveTargetUser(req);
        const { latitude, longitude, alertType, accuracy, deviceInfo, notes } = req.body;

        let groupId = req.user.groupId;
        let senderName = req.user.name;

        const User = require('../models/userModel');
        if (!groupId || !senderName) {
            const u = await User.findById(req.user.id).select('groupId name role');
            if (u) {
                if (u.groupId) groupId = u.groupId;
                if (u.name) senderName = u.name;
            }
        }

        const alertData = {
            userId: req.body.clientId ? targetUserId : req.user.id,
            groupId: groupId || null,
            alertType: alertType || 'manual',
            latitude: latitude || null,
            longitude: longitude || null,
            accuracy: accuracy || null,
            deviceInfo: deviceInfo || null,
            notes: notes || '',
            triggeredByRole: req.user.role || 'client',
            triggeredByName: senderName || (req.user.role === 'caretaker' ? 'Caretaker' : 'Client')
        };

        const alert = await emergencyService.triggerAlert(alertData);

        res.status(201).json({
            success: true,
            message: 'Emergency alert sent to all contacts',
            data: {
                id: alert._id,
                _id: alert._id,
                userId: alert.userId,
                alertType: alert.alertType,
                status: alert.status,
                latitude: alert.latitude,
                longitude: alert.longitude,
                mapLink: alert.mapLink,
                triggeredByRole: alert.triggeredByRole,
                triggeredByName: alert.triggeredByName,
                createdAt: alert.createdAt
            }
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   GET /api/v1/emergency/alerts
 * @desc    Alert history.
 *          Returns all alerts in group or user's alerts.
 * @access  Private
 */
exports.getAlertHistory = async (req, res, next) => {
    try {
        const userIds = await resolveGroupUserIds(req);
        const limit = parseInt(req.query.limit) || 20;
        const { status } = req.query;

        const filters = { limit };
        if (status) filters.status = status;

        let groupId = req.user.groupId;
        if (!groupId) {
            const User = require('../models/userModel');
            const u = await User.findById(req.user.id).select('groupId');
            if (u && u.groupId) groupId = u.groupId;
        }

        const query = groupId
            ? { $or: [{ groupId }, { userId: { $in: userIds } }] }
            : { userId: { $in: userIds } };

        const alerts = await emergencyService.getAlertHistory(query, filters);

        res.json({ success: true, count: alerts.length, data: alerts });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   GET /api/v1/emergency/alerts/:id
 * @desc    Get single alert. Caretaker can view any alert in their group.
 * @access  Private
 */
exports.getAlertById = async (req, res, next) => {
    try {
        const alertId = req.params.id;
        const Emergency = require('../models/emergencyModel');
        const alert = await Emergency.findById(alertId)
            .populate('userId', 'name email role')
            .populate('resolvedBy', 'name role');

        if (!alert) {
            return res.status(404).json({ success: false, message: 'Alert not found' });
        }

        res.json({ success: true, data: alert });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   PATCH /api/v1/emergency/alerts/:id/resolve
 * @desc    Mark alert as resolved. Any group member or caretaker can resolve.
 * @access  Private
 */
exports.resolveAlert = async (req, res, next) => {
    try {
        const alertId = req.params.id;
        const notes = req.body.notes || 'Resolved by user';

        const alert = await emergencyService.resolveAlert(alertId, req.user.id, notes);
        if (!alert) {
            return res.status(404).json({ success: false, message: 'Alert not found' });
        }

        res.json({ success: true, message: 'Alert marked as resolved', data: alert });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   PATCH /api/v1/emergency/alerts/:id/false-alarm
 * @desc    Mark alert as false alarm. Caretaker can update client's alert.
 * @access  Private
 */
exports.markFalseAlarm = async (req, res, next) => {
    try {
        const alertId = req.params.id;
        const notes = req.body.notes || '';

        const alert = await emergencyService.markFalseAlarm(alertId, req.user.id, notes);
        if (!alert) {
            return res.status(404).json({ success: false, message: 'Alert not found' });
        }

        res.json({ success: true, message: 'Alert marked as false alarm', data: alert });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   GET /api/v1/emergency/stats
 * @desc    Emergency statistics.
 *          Caretaker sees merged stats for the whole group.
 *          Pass ?clientId=xxx to filter to one client.
 * @access  Private
 */
exports.getStats = async (req, res, next) => {
    try {
        const userIds = await resolveGroupUserIds(req);

        const allStats = await Promise.all(
            userIds.map(uid => emergencyService.getEmergencyStats(uid))
        );

        // Merge stats across all group members
        const merged = allStats.reduce((acc, s) => {
            acc.total += s.total;
            // byType
            for (const type of Object.keys(s.byType)) {
                acc.byType[type] = (acc.byType[type] || 0) + s.byType[type];
            }
            // byStatus
            for (const status of Object.keys(s.byStatus)) {
                acc.byStatus[status] = (acc.byStatus[status] || 0) + s.byStatus[status];
            }
            // Keep the most recent alert overall
            if (s.mostRecent) {
                if (!acc.mostRecent || new Date(s.mostRecent.createdAt) > new Date(acc.mostRecent.createdAt)) {
                    acc.mostRecent = s.mostRecent;
                }
            }
            return acc;
        }, {
            total: 0,
            byType: { fall: 0, inactive: 0, manual: 0, other: 0 },
            byStatus: { triggered: 0, resolved: 0, cancelled: 0, 'false-alarm': 0 },
            mostRecent: null
        });

        res.json({ success: true, data: merged });
    } catch (err) {
        next(err);
    }
};
