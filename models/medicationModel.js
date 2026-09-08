// models/medicationModel.js
const mongoose = require('mongoose');

const medicationSchema = new mongoose.Schema({
    // Link to the user who owns this medication
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true  // Index for faster queries by user
    },
    
    // Link to family group for cross-user visibility
    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
        default: null,
        index: true
    },
    
    // Medication details
    name: {
        type: String,
        required: [true, 'Medication name is required'],
        trim: true
    },
    
    dosage: {
        type: String,
        trim: true,
        default: '1 tablet'
    },
    
    frequency: {
        type: String,
        enum: ['once-daily', 'twice-daily', 'thrice-daily', 'as-needed', 'custom'],
        default: 'once-daily'
    },
    
    timeOfDay: {
        type: String,
        enum: ['morning', 'afternoon', 'evening', 'night', 'anytime'],
        default: 'morning'
    },
    
    // Daily completion tracking
    takenToday: {
        type: Boolean,
        default: false
    },
    
    lastTakenAt: {
        type: Date,
        default: null
    },
    
    // Scheduled Date / Start Date
    date: {
        type: Date,
        default: Date.now
    },

    startDate: {
        type: Date,
        default: Date.now
    },

    endDate: {
        type: Date,
        default: null
    },

    // Exact scheduled time e.g. "08:30"
    time: {
        type: String,
        trim: true,
        default: '08:00'
    },

    // Whether reminder is active
    reminder: {
        type: Boolean,
        default: true
    },

    // Optional: for scheduled reminders (future feature)
    reminderTime: {
        type: String,  // Format: "HH:MM"
        default: null
    },
    
    // Track if this medication is currently active
    isActive: {
        type: Boolean,
        default: true
    },
    
    notes: {
        type: String,
        trim: true,
        maxlength: 500
    },

    instructions: {
        type: String,
        trim: true,
        maxlength: 500
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },

    createdByRole: {
        type: String,
        enum: ['caretaker', 'client'],
        default: 'caretaker'
    }
    
}, { 
    timestamps: true  // Automatically adds createdAt and updatedAt
});

// IMPORTANT: Reset takenToday flag at midnight (handled by a daily cron job or middleware)
// This method can be called to reset all medications for a new day
medicationSchema.statics.resetDailyStatus = async function() {
    return this.updateMany(
        { takenToday: true },
        { $set: { takenToday: false } }
    );
};

// Instance method to mark medication as taken
medicationSchema.methods.markAsTaken = function() {
    this.takenToday = true;
    this.lastTakenAt = new Date();
    return this.save();
};

module.exports = mongoose.model('Medication', medicationSchema);
