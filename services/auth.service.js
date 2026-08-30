// services/auth.service.js
const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const User   = require('../models/userModel');

exports.register = async ({ name, email, password, role }) => {
    const exists = await User.findOne({ email });
    if (exists) {
        const err = new Error('Email already registered');
        err.statusCode = 409;
        throw err;
    }

    const hash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, password: hash, role });

    const { password: _, ...safe } = user.toObject();
    return safe;
};

exports.login = async ({ email, password }) => {
    const user = await User.findOne({ email });
    const valid = user && await bcrypt.compare(password, user.password);

    if (!valid) {
        const err = new Error('Invalid email or password');
        err.statusCode = 401;
        throw err;
    }

    const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
    );

    return {
        token,
        user: { id: user._id, name: user.name, role: user.role }
    };
};

// ----- OTP simulation -----
// TODO: replace with Twilio Verify when you have your own account
const OTP_STORE = {}; // temporary in-memory store

exports.sendOtp = async (email) => {
    const user = await User.findOne({ email });
    if (!user) {
        const err = new Error('User not found');
        err.statusCode = 404;
        throw err;
    }
    // hardcoded OTP for simulation
    OTP_STORE[email] = '123456';
    console.log(`[OTP SIMULATION] OTP for ${email}: 123456`);
    return { message: 'OTP sent (simulated)' };
};

exports.verifyOtp = async (email, otp) => {
    if (OTP_STORE[email] !== otp) {
        const err = new Error('Invalid OTP');
        err.statusCode = 401;
        throw err;
    }
    delete OTP_STORE[email]; // clear after use

    const user = await User.findOne({ email });
    const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
    );

    return {
        token,
        user: { id: user._id, name: user.name, role: user.role }
    };
};