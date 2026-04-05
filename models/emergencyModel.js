const mongoose = require('mongoose');

const emergencySchema = new mongoose.Schema({
    latitude: Number,
    longitude: Number,
    time: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Emergency", emergencySchema);