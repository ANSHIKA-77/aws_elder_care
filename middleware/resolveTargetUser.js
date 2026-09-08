// middleware/resolveTargetUser.js
//
// Centralised helper used by every feature controller.
//
// Rules:
//   Client                          → always their own userId (cannot act on others)
//   Caretaker + ?clientId=<id>      → acts on that client (verified to be in same group)
//   Caretaker, no clientId          → acts on themselves (caretaker's own record)
//
// Usage in a controller:
//   const { resolveTargetUser } = require('../middleware/resolveTargetUser');
//   const targetUserId = await resolveTargetUser(req);

const Group = require('../models/groupModel');

/**
 * Resolve the userId whose data should be read/written.
 * @param {import('express').Request} req  - Express request (must have req.user set by verifyToken)
 * @returns {Promise<string>}              - The resolved userId string
 */
async function resolveTargetUser(req) {
    const { id: requesterId, role, groupId } = req.user;
    // Support clientId from query string or request body
    const clientId = (req.query && req.query.clientId) || (req.body && req.body.clientId);

    // Clients always operate on their own data
    if (role === 'client') {
        return requesterId;
    }

    // Caretaker wants to act on a specific client — verify group membership
    if (clientId) {
        if (!groupId) {
            const err = new Error('No group assigned to this caretaker');
            err.statusCode = 403;
            throw err;
        }

        const group = await Group.findById(groupId).select('clients');
        if (!group) {
            const err = new Error('Group not found');
            err.statusCode = 404;
            throw err;
        }

        const isMember = group.clients.some(id => id.toString() === clientId.toString());
        if (!isMember) {
            const err = new Error('Client does not belong to your group');
            err.statusCode = 403;
            throw err;
        }

        return clientId;
    }

    // Caretaker — no clientId supplied.
    // If the group has clients, default to the primary client!
    if (groupId) {
        const group = await Group.findById(groupId).select('clients');
        if (group && group.clients && group.clients.length > 0) {
            return group.clients[0].toString();
        }
    }

    return requesterId;
}

/**
 * Resolve ALL userIds visible to the requester.
 *
 * Used by list and action endpoints so that Caretakers and Clients in
 * the same family group share visibility and management of care items.
 *
 * Client or Caretaker with groupId → [caretakerId, ...clientIds]
 * Explicit ?clientId=xxx           → [clientId]
 * No group                         → [requesterId]
 *
 * @param {import('express').Request} req
 * @returns {Promise<string[]>}
 */
async function resolveGroupUserIds(req) {
    let { id: requesterId, role, groupId } = req.user;
    const clientId = (req.query && req.query.clientId) || (req.body && req.body.clientId);

    // Fallback: If groupId is not in token, look it up from User doc
    if (!groupId) {
        const User = require('../models/userModel');
        const u = await User.findById(requesterId).select('groupId');
        if (u && u.groupId) {
            groupId = u.groupId;
            req.user.groupId = groupId;
        }
    }

    // If a specific client is explicitly requested, validate and return that client
    if (clientId) {
        await resolveTargetUser(req);
        return [clientId];
    }

    // If user belongs to a group, resolve all members (caretaker + all clients)
    if (groupId) {
        const group = await Group.findById(groupId).select('caretaker clients');
        if (group) {
            const allIds = [
                group.caretaker ? group.caretaker.toString() : null,
                ...(group.clients || []).map(id => id ? id.toString() : null)
            ].filter(Boolean);
            return [...new Set(allIds)];
        }
    }

    return [requesterId];
}

module.exports = { resolveTargetUser, resolveGroupUserIds };
