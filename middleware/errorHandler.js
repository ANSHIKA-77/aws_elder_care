const errorHandler = (err, req, res, next) => {
    const status = err.statusCode || 500;

    // In production: expose message for client errors (4xx) so the UI can
    // show meaningful feedback (e.g. "Invalid email or password").
    // Only mask internal server errors (5xx) to avoid leaking stack traces.
    const message = (process.env.NODE_ENV === 'production' && status >= 500)
        ? 'Internal server error'
        : err.message;

    console.error(`[ERROR] ${status} - ${err.message}`);
    res.status(status).json({ success: false, message });
};

module.exports = errorHandler;