// services/emergency.service.js
const twilio = require('twilio');
const Emergency = require('../models/emergencyModel');
const User = require('../models/userModel');

const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

/**
 * Trigger emergency alert with full tracking
 */
exports.triggerAlert = async (alertData) => {
    const { userId, alertType, latitude, longitude, accuracy, deviceInfo, notes } = alertData;
    
    // 1. Get user details for personalized message
    const user = await User.findById(userId).select('name email');
    const userName = user ? user.name : 'Unknown User';
    
    // 2. Create emergency record
    const emergency = await Emergency.create({
        userId,
        alertType: alertType || 'manual',
        latitude: latitude || null,
        longitude: longitude || null,
        accuracy: accuracy || null,
        deviceInfo: deviceInfo || null,
        notes: notes || '',
        status: 'triggered',
        smsContactsNotified: []
    });
    
    // 3. Build SMS message
    const mapLink = (latitude && longitude) 
        ? `https://www.google.com/maps?q=${latitude},${longitude}`
        : 'Location unavailable';
    
    const alertTypeText = {
        fall: '🚨 FALL DETECTED',
        inactive: '⚠️ INACTIVITY ALERT',
        manual: '🆘 MANUAL SOS'
    }[alertType] || '🚨 EMERGENCY';
    
    const messageBody = `${alertTypeText}!\n\nPatient: ${userName}\nNeeds immediate help.\n\nLocation: ${mapLink}\n\nTime: ${new Date().toLocaleString('en-IN')}`;
    
    // 4. Get emergency contacts
    const contacts = [
        process.env.EMERGENCY_CONTACT_1,
        process.env.EMERGENCY_CONTACT_2,
        process.env.EMERGENCY_CONTACT_3
    ].filter(Boolean);
    
    // 5. Send SMS to all contacts
    const smsPromises = contacts.map(async (number) => {
        try {
            const message = await client.messages.create({
                body: messageBody,
                from: process.env.TWILIO_PHONE,
                to: number
            });
            
            // Track successful send
            emergency.smsContactsNotified.push({
                phoneNumber: number,
                sentAt: new Date(),
                deliveryStatus: 'sent',
                twilioSid: message.sid
            });
            
            console.log(`✅ SMS sent to ${number} (SID: ${message.sid})`);
            return { success: true, number, sid: message.sid };
            
        } catch (error) {
            // Track failed send
            emergency.smsContactsNotified.push({
                phoneNumber: number,
                sentAt: new Date(),
                deliveryStatus: 'failed'
            });
            
            console.error(`❌ SMS failed for ${number}:`, error.message);
            return { success: false, number, error: error.message };
        }
    });
    
    const results = await Promise.allSettled(smsPromises);
    
    // Save SMS tracking data
    await emergency.save();
    
    return emergency;
};

/**
 * Get alert history for a user
 */
exports.getAlertHistory = async (userId, options = {}) => {
    const query = { userId };
    
    if (options.status) {
        query.status = options.status;
    }
    
    const alerts = await Emergency.find(query)
        .sort({ createdAt: -1 })
        .limit(options.limit || 20)
        .populate('userId', 'name email role')
        .populate('resolvedBy', 'name role');
    
    return alerts;
};

/**
 * Get single alert by ID
 */
exports.getAlertById = async (alertId, userId) => {
    const alert = await Emergency.findOne({
        _id: alertId,
        userId: userId
    })
    .populate('userId', 'name email role')
    .populate('resolvedBy', 'name role');
    
    return alert;
};

/**
 * Mark alert as resolved
 */
exports.resolveAlert = async (alertId, userId, notes) => {
    const alert = await Emergency.findOne({ _id: alertId, userId });
    
    if (!alert) {
        return null;
    }
    
    await alert.resolve(userId, notes);
    return alert;
};

/**
 * Mark alert as false alarm
 */
exports.markFalseAlarm = async (alertId, userId, notes) => {
    const alert = await Emergency.findOne({ _id: alertId, userId });
    
    if (!alert) {
        return null;
    }
    
    await alert.markFalseAlarm(notes);
    return alert;
};

/**
 * Get emergency statistics
 */
exports.getEmergencyStats = async (userId) => {
    // Count by alert type
    const typeCounts = await Emergency.aggregate([
        { $match: { userId: userId } },
        { $group: { _id: '$alertType', count: { $sum: 1 } } }
    ]);
    
    // Count by status
    const statusCounts = await Emergency.aggregate([
        { $match: { userId: userId } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    const stats = {
        total: 0,
        byType: { fall: 0, inactive: 0, manual: 0, other: 0 },
        byStatus: { triggered: 0, resolved: 0, cancelled: 0, 'false-alarm': 0 }
    };
    
    typeCounts.forEach(item => {
        stats.byType[item._id] = item.count;
        stats.total += item.count;
    });
    
    statusCounts.forEach(item => {
        stats.byStatus[item._id] = item.count;
    });
    
    // Get most recent alert
    const recentAlert = await Emergency.findOne({ userId })
        .sort({ createdAt: -1 })
        .select('alertType status createdAt');
    
    stats.mostRecent = recentAlert;
    
    return stats;
};