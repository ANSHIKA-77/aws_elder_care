// controllers/auth.controller.js
const authService = require('../services/auth.service');

exports.register = async (req, res, next) => {
    try {
        const user = await authService.register(req.body);
        res.status(201).json({ success: true, data: user });
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

// add these at the bottom of auth.controller.js
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