// app.js
const express        = require('express');
const cors           = require('cors');
const helmet         = require('helmet');
const rateLimit      = require('express-rate-limit');
const path           = require('path');
//const mongoSanitize  = require('express-mongo-sanitize');

const app = express();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false
}));
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',  // fix: was https
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, slow down.' }
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json());
//app.use(mongoSanitize({ replaceWith: '_' }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes — just this one line, routes/index.js handles the rest
app.use('/api/v1', require('./routes'));

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Google Maps key
app.get('/api/config', (req, res) => {
    res.json({ googleMapsKey: process.env.GOOGLE_MAPS_KEY }); // fix: was res.join
});

// Health check
app.get('/api/health', (req, res) => {
    const mongoose = require('mongoose');
    res.json({                                                  // fix: was res.join
        status: 'ok',
        db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        uptime: Math.floor(process.uptime()) + 's'             // fix: bracket placement
    });
});

// Global error handler — must be last
app.use(require('./middleware/errorHandler'));

module.exports = app;