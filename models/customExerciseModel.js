// models/customExerciseModel.js
const mongoose = require('mongoose');

const customExerciseSchema = new mongoose.Schema({
    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
        required: true,
        index: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: [true, 'Exercise title is required'],
        trim: true
    },
    doctorName: {
        type: String,
        trim: true,
        default: ''
    },
    instructions: {
        type: String,
        trim: true,
        default: ''
    },
    targetDuration: {
        type: Number,
        default: 15
    },
    steps: {
        type: [String],
        default: []
    }
}, { timestamps: true });

module.exports = mongoose.model('CustomExercise', customExerciseSchema);
