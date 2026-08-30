// server.js
require('dotenv').config();
const connectDB = require('./config/db');  // ← fix: was './db'
const app       = require('./app');

connectDB().then(() => {
    app.listen(process.env.PORT || 3000, () => {
        console.log(`Server running on port ${process.env.PORT || 3000}`);
    });
});