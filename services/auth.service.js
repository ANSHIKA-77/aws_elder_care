// services/auth.service.js
const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const User   = require('../models/userModel');
const Group  = require('../models/groupModel');

/**
 * Register a new caretaker
 * - Creates user account
 * - Generates unique invite code
 * - Creates new group with this caretaker
 */
exports.registerCaretaker = async ({ name, email, password }) => {
    const exists = await User.findOne({ email });
    if (exists) {
        const err = new Error('Email already registered');
        err.statusCode = 409;
        throw err;
    }

    const hash = await bcrypt.hash(password, 12);
    
    // Generate unique invite code
    const inviteCode = await User.generateInviteCode();
    
    // Create user
    const user = await User.create({ 
        name, 
        email, 
        password: hash, 
        role: 'caretaker',
        inviteCode 
    });
    
    // Create group for this caretaker
    const group = await Group.create({
        caretaker: user._id,
        clients: [],
        name: `${name}'s Family`
    });
    
    // Update user with groupId
    user.groupId = group._id;
    await user.save();

    const { password: _, ...safe } = user.toObject();
    return {
        ...safe,
        inviteCode: user.inviteCode,
        groupId: group._id
    };
};

/**
 * Register a new client using invite code
 * - Validates invite code
 * - Creates client account
 * - Links to caretaker's group
 */
exports.registerClient = async ({ name, email, password, inviteCode }) => {
    if (!inviteCode || inviteCode.length !== 6) {
        const err = new Error('Valid 6-character invite code required');
        err.statusCode = 400;
        throw err;
    }
    
    const exists = await User.findOne({ email });
    if (exists) {
        const err = new Error('Email already registered');
        err.statusCode = 409;
        throw err;
    }
    
    // Find caretaker with this invite code
    const caretaker = await User.findOne({ 
        inviteCode: inviteCode.toUpperCase(),
        role: 'caretaker'
    });
    
    if (!caretaker) {
        const err = new Error('Invalid invite code');
        err.statusCode = 404;
        throw err;
    }
    
    if (!caretaker.groupId) {
        const err = new Error('Caretaker group not found');
        err.statusCode = 500;
        throw err;
    }

    const hash = await bcrypt.hash(password, 12);
    
    // Create client user
    const user = await User.create({ 
        name, 
        email, 
        password: hash, 
        role: 'client',
        groupId: caretaker.groupId,
        invitedBy: caretaker._id
    });
    
    // Add client to group
    const group = await Group.findById(caretaker.groupId);
    await group.addClient(user._id);

    const { password: _, ...safe } = user.toObject();
    return {
        ...safe,
        groupId: group._id,
        caretakerName: caretaker.name
    };
};

exports.login = async ({ email, password }) => {
    const user = await User.findOne({ email });
    const valid = user && await bcrypt.compare(password, user.password);

    if (!valid) {
        const err = new Error('Invalid email or password');
        err.statusCode = 401;
        throw err;
    }
    
    // Update last login
    await user.updateLastLogin();

    const token = jwt.sign(
        { id: user._id, role: user.role, groupId: user.groupId },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }  // Extended for better UX
    );

    return {
        token,
        user: { 
            id: user._id, 
            name: user.name, 
            role: user.role,
            groupId: user.groupId,
            inviteCode: user.inviteCode || null
        }
    };
};

/**
 * Get user's invite code (for caretakers to share)
 */
exports.getInviteCode = async (userId) => {
    const user = await User.findById(userId);
    
    if (!user) {
        const err = new Error('User not found');
        err.statusCode = 404;
        throw err;
    }
    
    if (user.role !== 'caretaker') {
        const err = new Error('Only caretakers have invite codes');
        err.statusCode = 403;
        throw err;
    }
    
    return {
        inviteCode: user.inviteCode,
        groupId: user.groupId
    };
};

/**
 * Get group members
 */
exports.getGroupMembers = async (groupId) => {
    if (!groupId) {
        const err = new Error('No group assigned');
        err.statusCode = 404;
        throw err;
    }
    
    const members = await Group.getMembers(groupId);
    return members;
};

// ----- OTP simulation (kept for backward compatibility) -----
const OTP_STORE = {};

exports.sendOtp = async (email) => {
    const user = await User.findOne({ email });
    if (!user) {
        const err = new Error('User not found');
        err.statusCode = 404;
        throw err;
    }
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
    delete OTP_STORE[email];

    const user = await User.findOne({ email });
    const token = jwt.sign(
        { id: user._id, role: user.role, groupId: user.groupId },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

    return {
        token,
        user: { 
            id: user._id, 
            name: user.name, 
            role: user.role,
            groupId: user.groupId
        }
    };
};