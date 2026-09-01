// controllers/auth.controller.js
const authService = require('../services/auth.service');

/**
 * @route   POST /api/v1/auth/register/caretaker
 * @desc    Register a new caretaker with invite code generation
 * @access  Public
 */
exports.registerCaretaker = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and password are required'
            });
        }
        
        const user = await authService.registerCaretaker({ name, email, password });
        
        res.status(201).json({ 
            success: true, 
            message: 'Caretaker registered successfully',
            data: user 
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   POST /api/v1/auth/register/client
 * @desc    Register a new client using invite code
 * @access  Public
 */
exports.registerClient = async (req, res, next) => {
    try {
        const { name, email, password, inviteCode } = req.body;
        
        if (!name || !email || !password || !inviteCode) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, password, and invite code are required'
            });
        }
        
        const user = await authService.registerClient({ name, email, password, inviteCode });
        
        res.status(201).json({ 
            success: true, 
            message: 'Client registered successfully',
            data: user 
        });
    } catch (err) {
        next(err);
    }
};

// Legacy register endpoint (kept for backward compatibility)
exports.register = async (req, res, next) => {
    try {
        // Route to appropriate registration based on role
        if (req.body.role === 'caretaker') {
            return exports.registerCaretaker(req, res, next);
        } else if (req.body.role === 'client') {
            return exports.registerClient(req, res, next);
        } else {
            return res.status(400).json({
                success: false,
                message: 'Invalid role. Use /register/caretaker or /register/client'
            });
        }
    } catch (err) {
        next(err);
    }
};

exports.login = async (req, res, next) => {
    try {
        const result = await authService.login(req.body);
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   GET /api/v1/auth/invite-code
 * @desc    Get current user's invite code (caretaker only)
 * @access  Private
 */
exports.getInviteCode = async (req, res, next) => {
    try {
        const result = await authService.getInviteCode(req.user.id);
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   GET /api/v1/auth/group-members
 * @desc    Get all members in user's group
 * @access  Private
 */
exports.getGroupMembers = async (req, res, next) => {
    try {
        const members = await authService.getGroupMembers(req.user.groupId);
        res.json({ success: true, data: members });
    } catch (err) {
        next(err);
    }
};

// OTP endpoints (kept for backward compatibility)
exports.sendOtp = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email required' });
        const result = await authService.sendOtp(email);
        res.json({ success: true, ...result });
    } catch (err) {
        next(err);
    }
};

exports.verifyOtp = async (req, res, next) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ message: 'Email and OTP required' });
        const result = await authService.verifyOtp(email, otp);
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};