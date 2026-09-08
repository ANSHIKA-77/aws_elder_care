// lambda.js — Entry point for AWS Lambda
// Wraps the existing Express app with serverless-http.
// Local dev still uses server.js (unchanged).

'use strict';

const serverless = require('serverless-http');
const connectDB = require('./config/db');
const app = require('./app');

// Wrap Express app once — reused across warm Lambda invocations
const handler = serverless(app);

module.exports.handler = async (event, context) => {
    // Tell Lambda NOT to wait for the event loop to empty before freezing.
    // This is critical with MongoDB — keeps the connection alive between
    // warm invocations instead of timing out.
    context.callbackWaitsForEmptyEventLoop = false;

    // Connect to MongoDB (cached — only opens a new connection on cold start)
    await connectDB();

    // Hand off to Express via serverless-http
    return handler(event, context);
};
