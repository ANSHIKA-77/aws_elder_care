// app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Recursively strip MongoDB operator keys ($-prefixed) from an object.
// Replaces express-mongo-sanitize which is incompatible with Express v5
// because Express v5 made req.query a read-only getter.
function sanitizeObject(obj) {
    if (Array.isArray(obj)) return obj.map(sanitizeObject);
    if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce((acc, key) => {
            if (!key.startsWith('$')) {
                acc[key] = sanitizeObject(obj[key]);
            }
            return acc;
        }, {});
    }
    return obj;
}

const app = express();

// Trust API Gateway / load balancer proxy — required for rate-limit to read
// the real client IP from X-Forwarded-For instead of the Lambda internal IP.
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({ contentSecurityPolicy: false }));

// CORS — allow both local dev and deployed frontend URL
// When FRONTEND_URL='*' (Lambda env), allow all origins
const allowedOrigins = [
    'http://localhost:3000',
    process.env.FRONTEND_URL,
].filter(Boolean);

const corsOptions = process.env.FRONTEND_URL === '*'
    ? { origin: '*', credentials: false }   // Lambda: open CORS (tighten after S3 deploy)
    : {
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            if (allowedOrigins.includes(origin)) return callback(null, true);
            callback(new Error(`CORS: origin ${origin} not allowed`));
        },
        credentials: true
    };

app.use(cors(corsOptions));

// Rate limiting — configure high threshold and skip localhost & polling endpoints
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10000,
    skip: (req) => {
        // Skip rate limiting for local dev and background polling routes
        const ip = req.ip || req.connection?.remoteAddress || '';
        if (ip === '127.0.0.1' || ip === '::1' || ip.includes('127.0.0.1')) return true;
        if (req.originalUrl?.includes('/video/call/status') || req.originalUrl?.includes('/emergency/alerts')) return true;
        return false;
    },
    message: { error: 'Too many requests, slow down.' }
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json());

// NoSQL injection sanitization on req.body (the main injection surface)
app.use((req, _res, next) => {
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body);
    }
    next();
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// API routes
app.use('/api/v1', require('./routes'));

// Serve frontend SPA root (local dev: serves login.html; Lambda: returns API status)
app.get('/', (req, res) => {
    const fs = require('fs');
    const loginPath = path.join(__dirname, 'public', 'login.html');
    if (fs.existsSync(loginPath)) {
        return res.sendFile(loginPath);
    }
    res.json({
        service: 'Elder Care API Gateway',
        status: 'online',
        message: 'Backend API is running on AWS Lambda. Frontend is hosted on AWS S3.',
        health: '/api/health',
        api: '/api/v1'
    });
});

// Google Maps key (safe to expose — it's a public-facing key)
app.get('/api/config', (req, res) => {
    res.json({ googleMapsKey: process.env.GOOGLE_MAPS_KEY });
});

// Health check
app.get('/api/health', (req, res) => {
    const mongoose = require('mongoose');
    res.json({
        status: 'ok',
        db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        uptime: Math.floor(process.uptime()) + 's'
    });
});

// Global error handler — must be last
app.use(require('./middleware/errorHandler'));

module.exports = app;
