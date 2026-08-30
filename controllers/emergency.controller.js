// controllers/emergency.controller.js
const emergencyService = require('../services/emergency.service');

exports.trigger = async (req, res, next) => {
    try {
        const { latitude, longitude } = req.body;

        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: 'latitude and longitude are required'
            });
        }

        const record = await emergencyService.triggerAlert(latitude, longitude);

        res.status(201).json({
            success: true,
            message: 'Emergency alert sent',
            data: { id: record._id, createdAt: record.createdAt }
        });
    } catch (err) {
        next(err);
    }
};