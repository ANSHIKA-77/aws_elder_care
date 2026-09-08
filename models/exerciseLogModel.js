// models/exerciseLogModel.js
const mongoose = require('mongoose');

const exerciseLogSchema = new mongoose.Schema({
    // Link to the user
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    
    // Link to family group for cross-user visibility
    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
        default: null,
        index: true
    },
    
    // Date of exercise (one log per day per user)
    date: {
        type: Date,
        required: true,
        index: true
    },
    
    // Exercise categories and completed steps
    // Structure: { "Morning Stretching": ["step1", "step2"], "Walking": ["step1"] }
    completed: {
        type: Map,
        of: [String],  // Array of completed step names
        default: {}
    },
    
    // Track individual exercise sessions
    sessions: [{
        category: {
            type: String,
            required: true,
            trim: true
        },
        steps: [{
            name: String,
            completedAt: {
                type: Date,
                default: Date.now
            }
        }],
        duration: {
            type: Number,  // Duration in minutes
            default: 0
        },
        notes: String,
        comment: {
            type: String,
            trim: true,
            default: ''
        },
        feedback: {
            type: String,
            trim: true,
            default: ''
        },
        status: {
            type: String,
            enum: ['in-progress', 'completed'],
            default: 'completed'
        },
        completedAt: {
            type: Date,
            default: Date.now
        },
        startedAt: {
            type: Date,
            default: Date.now
        }
    }],
    
    // Summary stats for the day
    totalMinutes: {
        type: Number,
        default: 0
    },
    
    totalStepsCompleted: {
        type: Number,
        default: 0
    },
    
    categoriesCompleted: {
        type: Number,
        default: 0
    },
    
    // Notes for the day
    dailyNotes: {
        type: String,
        trim: true,
        maxlength: 500
    }
    
}, { 
    timestamps: true 
});

// Compound index: One log per user per day
exerciseLogSchema.index({ userId: 1, date: 1 }, { unique: true });

// Static method: Get or create today's log
exerciseLogSchema.statics.getTodayLog = async function(userId, groupId = null) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);  // Start of day
    
    let log = await this.findOne({
        userId,
        date: today
    });
    
    if (!log) {
        log = await this.create({
            userId,
            groupId,
            date: today,
            completed: new Map()
        });
    }
    
    return log;
};

// Instance method: Add completed exercise
exerciseLogSchema.methods.addExercise = function(category, steps, duration = 0, comment = '', feedback = '') {
    const now = new Date();
    // Add to sessions
    this.sessions.push({
        category,
        steps: (steps || []).map(stepName => ({ name: stepName, completedAt: now })),
        duration,
        comment: comment || '',
        feedback: feedback || '',
        status: 'completed',
        completedAt: now,
        startedAt: now
    });
    
    // Update completed map
    const currentSteps = this.completed.get(category) || [];
    const allSteps = [...new Set([...currentSteps, ...steps])];  // Merge and dedupe
    this.completed.set(category, allSteps);
    
    // Update summary stats
    this.totalStepsCompleted = this.totalStepsCompleted + steps.length;
    this.totalMinutes = this.totalMinutes + duration;
    this.categoriesCompleted = this.completed.size;
    
    return this.save();
};

// Instance method: Get progress summary
exerciseLogSchema.methods.getSummary = function() {
    return {
        date: this.date,
        totalMinutes: this.totalMinutes,
        totalSteps: this.totalStepsCompleted,
        categoriesCompleted: this.categoriesCompleted,
        sessionsCount: this.sessions.length,
        completedCategories: Array.from(this.completed.keys())
    };
};

module.exports = mongoose.model('ExerciseLog', exerciseLogSchema);
