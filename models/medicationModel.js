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
