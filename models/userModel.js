const mongoose = require('mongoose');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true, 
        trim: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true, 
        lowercase: true 
    },
    password: { 
        type: String, 
        required: true 
    },
    role: { 
        type: String, 
        enum: ['caretaker', 'client'],  // Updated naming
        required: true 
    },
    
    // Group system for family isolation
    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
        default: null,
        index: true  // Important for query performance
    },
    
    // Invite code for caretakers (only caretakers have this)
    inviteCode: {
        type: String,
        unique: true,
        sparse: true,  // Allows null values while keeping unique constraint
        uppercase: true,
        minlength: 6,
        maxlength: 6
    },
    
    // Track who invited this user (for clients)
    invitedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    
    // Active status
    isActive: {
        type: Boolean,
        default: true
    },
    
    // Last login tracking
    lastLoginAt: {
        type: Date,
        default: null
    },

    // Permission-based live location sharing
    locationSharing: {
        isSharing: { type: Boolean, default: false },
        latitude: { type: Number, default: null },
        longitude: { type: Number, default: null },
        accuracy: { type: Number, default: null },
        updatedAt: { type: Date, default: null }
    }
    
}, { timestamps: true });

// Generate a unique 6-character invite code
userSchema.statics.generateInviteCode = async function() {
    let code;
    let isUnique = false;
    
    while (!isUnique) {
        // Generate 6 random alphanumeric characters
        code = crypto.randomBytes(3).toString('hex').toUpperCase();
        
        // Check if code already exists
        const existing = await this.findOne({ inviteCode: code });
        if (!existing) {
            isUnique = true;
        }
    }
    
    return code;
};

// Instance method: Update last login
userSchema.methods.updateLastLogin = function() {
    this.lastLoginAt = new Date();
    return this.save();
};

module.exports = mongoose.model('User', userSchema);