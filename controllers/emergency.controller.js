// controllers/emergency.controller.js
const emergencyService = require('../services/emergency.service');

/**
 * @route   POST /api/v1/emergency/trigger
 * @desc    Trigger emergency alert (manual, fall, or inactivity)
 * @access  Private
 */
exports.trigger = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { latitude, longitude, alertType, accuracy, deviceInfo, notes } = req.body;

        // Latitude and longitude are optional (GPS might fail)
        // Alert type defaults to 'manual' if not specified
        
        const alertData = {
            userId,
            alertType: alertType || 'manual',
            latitude: latitude || null,
            longitude: longitude || null,
            accuracy: accuracy || null,
            deviceInfo: deviceInfo || null,
            notes: notes || ''
        };

        const alert = await emergencyService.triggerAlert(alertData);

        res.status(201).json({
            success: true,
            message: 'Emergency alert sent to all contacts',
            data: {
                id: alert._id,
                alertType: alert.alertType,
                status: alert.status,
                mapLink: alert.mapLink,
                createdAt: alert.createdAt
            }
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   GET /api/v1/emergency/alerts
 * @desc    Get emergency alert history for logged-in user
 * @access  Private
 */
exports.getAlertHistory = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { limit = 20, status } = req.query;
        
        const filters = {};
        if (status) filters.status = status;
        
        const alerts = await emergencyService.getAlertHistory(userId, {
            limit: parseInt(limit),
            ...filters
        });
        
        res.json({
            success: true,
            count: alerts.length,
            data: alerts
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   GET /api/v1/emergency/alerts/:id
 * @desc    Get single alert details
 * @access  Private
 */
exports.getAlertById = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const alertId = req.params.id;
        
        const alert = await emergencyService.getAlertById(alertId, userId);
        
        if (!alert) {
            return res.status(404).json({
                success: false,
                message: 'Alert not found'
            });
        }
        
        res.json({
            success: true,
            data: alert
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   PATCH /api/v1/emergency/alerts/:id/resolve
 * @desc    Mark alert as resolved
 * @access  Private
 */
exports.resolveAlert = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const alertId = req.params.id;
        const { notes } = req.body;
        
        const alert = await emergencyService.resolveAlert(alertId, userId, notes || '');
        
        if (!alert) {
            return res.status(404).json({
                success: false,
                message: 'Alert not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Alert marked as resolved',
            data: alert
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   PATCH /api/v1/emergency/alerts/:id/false-alarm
 * @desc    Mark alert as false alarm
 * @access  Private
 */
exports.markFalseAlarm = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const alertId = req.params.id;
        const { notes } = req.body;
        
        const alert = await emergencyService.markFalseAlarm(alertId, userId, notes || '');
        
        if (!alert) {
            return res.status(404).json({
                success: false,
                message: 'Alert not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Alert marked as false alarm',
            data: alert
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   GET /api/v1/emergency/stats
 * @desc    Get emergency alert statistics
 * @access  Private
 */
exports.getStats = async (req, res, next) => {
    try {
        const userId = req.user.id;
        
        const stats = await emergencyService.getEmergencyStats(userId);
        
        res.json({
            success: true,
            data: stats
        });
    } catch (err) {
        next(err);
    }
};