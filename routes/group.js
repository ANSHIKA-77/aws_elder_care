// routes/group.js
const router     = require('express').Router();
const controller = require('../controllers/group.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(verifyToken);

/**
 * @route   GET /api/v1/group/info
 * @desc    Full group info (caretaker + all clients). Works for both roles.
 */
router.get('/info', controller.getGroupInfo);

/**
 * @route   GET /api/v1/group/clients
 * @desc    List clients in the group.
 *          Caretaker → all clients. Client → just themselves.
 *          Frontend uses this to populate a "viewing as" switcher.
 */
router.get('/clients', controller.getClients);

/**
 * @route   DELETE /api/v1/group/clients/:clientId
 * @desc    Remove a client from the group (caretaker only).
 */
router.delete('/clients/:clientId', controller.removeClient);

module.exports = router;
