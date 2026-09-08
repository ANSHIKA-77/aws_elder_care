// server.js
require('dotenv').config();
const connectDB = require('./config/db');  // ← fix: was './db'
const app       = require('./app');

process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

connectDB().then(() => {
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
        
        // Start background maintenance (resets daily meds, marks missed appointments, cleans stale calls)
        const Medication = require('./models/medicationModel');
        const Appointment = require('./models/appointmentModel');
        const Group = require('./models/groupModel');

        async function runMaintenance() {
            try {
                const startOfToday = new Date();
                startOfToday.setHours(0, 0, 0, 0);

                // 1. Reset medications marked taken before today
                const medRes = await Medication.updateMany({
                    takenToday: true,
                    $or: [
                        { lastTakenAt: null },
                        { lastTakenAt: { $lt: startOfToday } }
                    ]
                }, {
                    $set: { takenToday: false }
                });

                // 2. Mark passed appointments as missed
                const apptRes = await Appointment.updateMissedAppointments();

                // 3. Mark ringing calls older than 60s as ended
                await Group.updateMany({
                    'activeCall.status': 'ringing',
                    'activeCall.createdAt': { $lt: new Date(Date.now() - 60000) }
                }, {
                    $set: { 'activeCall.status': 'ended' }
                });

                console.log(`[Maintenance] Daily check completed at ${new Date().toLocaleTimeString()}`);
            } catch (err) {
                console.error('[Maintenance] Error running maintenance:', err.message);
            }
        }

        // Run immediately on boot
        runMaintenance();

        // Run periodically every 30 minutes
        setInterval(runMaintenance, 30 * 60 * 1000);
    });
});