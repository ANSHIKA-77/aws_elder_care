// models/appointmentModel.js
const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    // Link to the user
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    
    // Appointment details
    title: {
        type: String,
        required: [true, 'Appointment title is required'],
        trim: true,
        maxlength: 200
    },
    
    location: {
        type: String,
        trim: true,
        maxlength: 300,
        default: 'Not specified'
    },
    
    date: {
        type: Date,
        required: [true, 'Appointment date is required'],
        index: true  // Index for efficient date-based queries
    },
    
    time: {
        type: String,  // Format: "HH:MM" (e.g., "14:30")
        required: [true, 'Appointment time is required'],
        match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format. Use HH:MM']
    },
    
    // Status management
    status: {
        type: String,
        enum: ['upcoming', 'completed', 'missed', 'cancelled'],
        default: 'upcoming',
        index: true
    },
    
    notes: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    
    // Optional: caregiver who created/manages this appointment
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    
    // Track completion
    completedAt: {
        type: Date,
        default: null
    },
    
    // Reminder settings (for future notifications feature)
    reminderMinutesBefore: {
        type: Number,
        default: 60  // 1 hour before
    },
    
    reminderSent: {
        type: Boolean,
        default: false
    }
    
}, { 
    timestamps: true 
});

// Virtual field: Check if appointment is today
appointmentSchema.virtual('isToday').get(function() {
    const today = new Date();
    const apptDate = new Date(this.date);
    return (
        apptDate.getDate() === today.getDate() &&
        apptDate.getMonth() === today.getMonth() &&
        apptDate.getFullYear() === today.getFullYear()
    );
});

// Virtual field: Check if appointment is in the past
appointmentSchema.virtual('isPast').get(function() {
    const now = new Date();
    const apptDateTime = new Date(this.date);
    const [hours, minutes] = this.time.split(':');
    apptDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return apptDateTime < now;
});

// Static method: Auto-update missed appointments
appointmentSchema.statics.updateMissedAppointments = async function() {
    const now = new Date();
    
    // Find all upcoming appointments
    const appointments = await this.find({ status: 'upcoming' });
    
    const updates = [];
    for (const appt of appointments) {
        // Combine date and time to get full datetime
        const apptDateTime = new Date(appt.date);
        const [hours, minutes] = appt.time.split(':');
        apptDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        // Only mark as missed if BOTH date and time have passed
        if (apptDateTime < now) {
            updates.push(appt._id);
        }
    }
    
    // Bulk update all missed appointments
    const result = await this.updateMany(
        { _id: { $in: updates } },
        { $set: { status: 'missed' } }
    );
    
    return result;
};

// Instance method: Mark appointment as completed
appointmentSchema.methods.markCompleted = function() {
    this.status = 'completed';
    this.completedAt = new Date();
    return this.save();
};

// Ensure virtuals are included in JSON output
appointmentSchema.set('toJSON', { virtuals: true });
appointmentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Appointment', appointmentSchema);
