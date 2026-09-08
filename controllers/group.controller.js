// controllers/group.controller.js
const Group = require('../models/groupModel');
const User  = require('../models/userModel');

/**
 * @route   GET /api/v1/group/clients
 * @desc    List all clients in the caretaker's group.
 *          Clients calling this get back only their own minimal profile.
 * @access  Private
 */
exports.getClients = async (req, res, next) => {
    try {
        const { id: requesterId, role, groupId } = req.user;

        // A client has no group clients to list — return their own profile
        if (role === 'client') {
            const user = await User.findById(requesterId).select('_id name email role');
            return res.json({ success: true, data: [user] });
        }

        if (!groupId) {
            return res.status(404).json({ success: false, message: 'No group assigned to this caretaker' });
        }

        const group = await Group.findById(groupId)
            .populate('clients', '_id name email role lastLoginAt isActive');

        if (!group) {
            return res.status(404).json({ success: false, message: 'Group not found' });
        }

        res.json({
            success: true,
            count: group.clients.length,
            data: group.clients
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   GET /api/v1/group/info
 * @desc    Get full group info — caretaker + all clients.
 * @access  Private
 */
exports.getGroupInfo = async (req, res, next) => {
    try {
        const { id: requesterId, role, groupId } = req.user;

        // For a client, find their group via their own groupId
        const targetGroupId = groupId;

        if (!targetGroupId) {
            return res.status(404).json({ success: false, message: 'No group found' });
        }

        const group = await Group.findById(targetGroupId)
            .populate('caretaker', '_id name email role lastLoginAt')
            .populate('clients',   '_id name email role lastLoginAt isActive');

        if (!group) {
            return res.status(404).json({ success: false, message: 'Group not found' });
        }

        res.json({
            success: true,
            data: {
                groupId:   group._id,
                groupName: group.name,
                caretaker: group.caretaker,
                clients:   group.clients,
                settings:  group.settings
            }
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   DELETE /api/v1/group/clients/:clientId
 * @desc    Remove a client from the caretaker's group.
 * @access  Private (caretaker only)
 */
exports.removeClient = async (req, res, next) => {
    try {
        const { role, groupId } = req.user;

        if (role !== 'caretaker') {
            return res.status(403).json({ success: false, message: 'Only caretakers can remove clients' });
        }

        if (!groupId) {
            return res.status(404).json({ success: false, message: 'No group assigned' });
        }

        const { clientId } = req.params;

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ success: false, message: 'Group not found' });
        }

        const isMember = group.clients.some(id => id.toString() === clientId);
        if (!isMember) {
            return res.status(404).json({ success: false, message: 'Client not in your group' });
        }

        await group.removeClient(clientId);

        // Detach the client user from the group
        await User.findByIdAndUpdate(clientId, { $set: { groupId: null } });

        res.json({ success: true, message: 'Client removed from group' });
    } catch (err) {
        next(err);
    }
};
