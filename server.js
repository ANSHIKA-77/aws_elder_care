require('dotenv').config();
require('./db');

const twilio = require('twilio');

const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

const Emergency = require('./models/emergencyModel');//added
const authRoutes = require('./routes/auth'); //added

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', authRoutes);//added

app.post('/send-emergency', async (req, res) => {

    const { latitude, longitude } = req.body;

    await Emergency.create({        //added
        latitude,
        longitude
    }); //till here

    const mapLink = `https://www.google.com/maps?q=${latitude},${longitude}`;

    const messageBody = `🚨 EMERGENCY ALERT!
Patient needs immediate assistance.
Location: ${mapLink}`;

    const hospitalNumbers = [
        "+917987855907",
        
    ];

    try {

        for (let number of hospitalNumbers) {
            await client.messages.create({
                body: messageBody,
                from: process.env.TWILIO_PHONE,
                to: number
            });
        }

        res.json({ message: "Emergency SMS sent successfully" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to send SMS" });
    }

});


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/config', (req, res) => {
    res.json({
        googleMapsKey: process.env.GOOGLE_MAPS_KEY
    });
});


app.listen(3000, () => {
    console.log("Server running at http://localhost:3000");
});


