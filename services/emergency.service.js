// services/emergency.service.js
const twilio    = require('twilio');
const Emergency = require('../models/emergencyModel');

const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

exports.triggerAlert = async (latitude, longitude) => {
    // 1. Save to DB
    const record = await Emergency.create({ latitude, longitude });

    // 2. Build message
    const mapLink     = `https://www.google.com/maps?q=${latitude},${longitude}`;
    const messageBody = `EMERGENCY ALERT! Patient needs help. Location: ${mapLink}`;

    // 3. Send SMS to all contacts
    const contacts = [
        process.env.EMERGENCY_CONTACT_1,
        process.env.EMERGENCY_CONTACT_2,  // add more in .env as needed
    ].filter(Boolean); // removes undefined entries if contact isn't set

    const results = await Promise.allSettled(
        contacts.map(number =>
            client.messages.create({
                body: messageBody,
                from: process.env.TWILIO_PHONE,
                to: number
            })
        )
    );

    // Log any failed SMS sends without crashing the whole alert
    results.forEach((r, i) => {
        if (r.status === 'rejected') {
            console.error(`SMS failed for contact ${i + 1}:`, r.reason.message);
        }
    });

    return record;
};