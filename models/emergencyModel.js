// models/emergencyModel.js
const mongoose = require('mongoose');

const emergencySchema = new mongoose.Schema({
    // Link to the user who triggered the alert
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    
    // Alert type
    alertType: {
        type: String,
        enum: ['fall', 'inactive', 'manual', 'other'],
        required: true,
        default: 'manual'
    },
    
    // Location data
    latitude: {
        type: Number,
        default: null
    },
    
    longitude: {
        type: Number,
        default: null
    },
    
    // Location accuracy (in meters)
    accuracy: {
        type: Number,
        default: null
    },
    
    // Alert status
    status: {
        type: String,
        enum: ['triggered', 'cancelled', 'resolved', 'false-alarm'],
        default: 'triggered',
        index: true
    },
    
    // Resolution tracking
    resolvedAt: {
        type: Date,
        default: null
    },
    
    resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    
    resolutionNotes: {
        type: String,
        trim: true,
        maxlength: 500
    },
    
    // SMS notification tracking
    smsContactsNotified: [{
        phoneNumber: String,
        sentAt: Date,
        deliveryStatus: {
            type: String,
            enum: ['sent', 'delivered', 'failed', 'undelivered'],
            default: 'sent'
        },
        twilioSid: String  // Twilio message ID for tracking
    }],
    
    // Device information (helpful for debugging)
    deviceInfo: {
        userAgent: String,
        platform: String,
        timestamp: Date
    },
    
    // Additional context
    notes: {
        type: String,
        trim: true,
        maxlength: 1000
    }
    
}, { 
    timestamps: true  // createdAt = alert time
});

// Virtual field: Get Google Maps link
emergencySchema.virtual('mapLink').get(function() {
    if (!this.latitude || !this.longitude) return null;
    return `https://www.google.com/maps?q=${this.latitude},${this.longitude}`;
});

// Instance method: Mark as resolved
emergencySchema.methods.resolve = function(resolvedByUserId, notes = '') {
    this.status = 'resolved';
    this.resolvedAt = new Date();
    this.resolvedBy = resolvedByUserId;
    this.resolutionNotes = notes;
    return this.save();
};

// Instance method: Mark as false alarm
emergencySchema.methods.markFalseAlarm = function(notes = '') {
    this.status = 'false-alarm';
    this.resolvedAt = new Date();
    this.resolutionNotes = notes;
    return this.save();
};

// Static method: Get recent alerts for a user
emergencySchema.statics.getRecentAlerts = function(userId, limit = 10) {
    return this.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('userId', 'name email role')
        .populate('resolvedBy', 'name role');
};

// Ensure virtuals are included in JSON
emergencySchema.set('toJSON', { virtuals: true });
emergencySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model("Emergency", emergencySchema);