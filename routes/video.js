// routes/video.js
const router = require('express').Router();
const { verifyToken } = require('../middleware/auth.middleware');
const Group = require('../models/groupModel');
const User = require('../models/userModel');

router.use(verifyToken);

/**
 * @route   POST /api/v1/video/call
 * @desc    Start/initiate a video call for the family group
 * @access  Private
 */
router.post('/call', async (req, res, next) => {
    try {
        const groupId = req.user.groupId;
        if (!groupId) {
            return res.status(400).json({ success: false, message: 'No family group assigned' });
        }

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ success: false, message: 'Group not found' });
        }

        const user = await User.findById(req.user.id).select('name role');
        const callerName = (user && user.name) || (req.user.role === 'caretaker' ? 'Caretaker' : 'Client');
        const roomName = req.body.roomName || ('ElderCare-Family-' + groupId);

        group.activeCall = {
            callerId: req.user.id,
            callerName,
            callerRole: req.user.role,
            roomName,
            status: 'ringing',
            createdAt: new Date()
        };

        await group.save();

        res.json({
            success: true,
            message: 'Call initiated',
            data: group.activeCall
        });
    } catch (err) {
        next(err);
    }
});

/**
 * @route   GET /api/v1/video/call/status
 * @desc    Check current active call status in family group
 * @access  Private
 */
router.get('/call/status', async (req, res, next) => {
    try {
        const groupId = req.user.groupId;
        if (!groupId) {
            return res.json({ success: true, data: { activeCall: null } });
        }

        const group = await Group.findById(groupId).select('activeCall');
        if (!group || !group.activeCall || !group.activeCall.createdAt) {
            return res.json({ success: true, data: { activeCall: null } });
        }

        // Call is active if created within the last 45 seconds and status is ringing
        const elapsed = Date.now() - new Date(group.activeCall.createdAt).getTime();
        if (elapsed < 45000 && group.activeCall.status === 'ringing') {
            return res.json({ success: true, data: { activeCall: group.activeCall } });
        }

        res.json({ success: true, data: { activeCall: null } });
    } catch (err) {
        next(err);
    }
});

/**
 * @route   POST /api/v1/video/call/end
 * @desc    End or decline call
 * @access  Private
 */
router.post('/call/end', async (req, res, next) => {
    try {
        const groupId = req.user.groupId;
        if (groupId) {
            await Group.findByIdAndUpdate(groupId, {
                $set: { 'activeCall.status': 'ended' }
            });
        }
        res.json({ success: true, message: 'Call ended' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
