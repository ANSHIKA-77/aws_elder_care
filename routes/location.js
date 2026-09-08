// routes/location.js
const router = require('express').Router();
const User = require('../models/userModel');
const { verifyToken } = require('../middleware/auth.middleware');

router.use(verifyToken);

/**
 * @route   POST /api/v1/location/share
 * @desc    Parent updates or toggles permission-based location sharing
 * @access  Private
 */
router.post('/share', async (req, res, next) => {
    try {
        const { isSharing, latitude, longitude, accuracy } = req.body;
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        user.locationSharing = {
            isSharing: Boolean(isSharing),
            latitude: isSharing ? (latitude || null) : null,
            longitude: isSharing ? (longitude || null) : null,
            accuracy: isSharing ? (accuracy || null) : null,
            updatedAt: isSharing ? new Date() : null
        };

        await user.save();

        res.json({
            success: true,
            message: isSharing ? 'Location sharing enabled' : 'Location sharing stopped',
            data: user.locationSharing
        });
    } catch (err) {
        next(err);
    }
});

/**
 * @route   GET /api/v1/location
 * @desc    Get parent's shared location (for Child / Client) or current user status
 * @access  Private
 */
router.get('/', async (req, res, next) => {
    try {
        const currentUser = await User.findById(req.user.id);
        if (!currentUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // If requester is the parent (caretaker), return their own status
        if (currentUser.role === 'caretaker') {
            return res.json({
                success: true,
                role: 'caretaker',
                data: currentUser.locationSharing || { isSharing: false }
            });
        }

        // Requester is Child (client) -> find Parent (caretaker) in same group
        if (!currentUser.groupId) {
            return res.status(400).json({ success: false, message: 'No family group linked' });
        }

        const parent = await User.findOne({
            groupId: currentUser.groupId,
            role: 'caretaker'
        }).select('name locationSharing');

        if (!parent) {
            return res.status(404).json({ success: false, message: 'Parent profile not found in group' });
        }

        const sharing = parent.locationSharing || { isSharing: false };

        res.json({
            success: true,
            role: 'client',
            parentName: parent.name,
            data: sharing
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
