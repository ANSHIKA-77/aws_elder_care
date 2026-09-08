// config/db.js
const mongoose = require('mongoose');

const connectDB = async (retries = 5, delay = 3000) => {
    for (let i = 0; i < retries; i++) {
        try {
            await mongoose.connect(process.env.MONGODB_URI, {
                serverSelectionTimeoutMS: 10000
            });
            console.log('MongoDB connected successfully');
            return;
        } catch (err) {
            console.error(`MongoDB connection attempt ${i + 1} failed:`, err.message);
            if (i < retries - 1) {
                console.log(`Retrying connection in ${delay / 1000}s...`);
                await new Promise(res => setTimeout(res, delay));
            } else {
                console.error('All MongoDB connection attempts exhausted.');
                process.exit(1);
            }
        }
    }
};

module.exports = connectDB;