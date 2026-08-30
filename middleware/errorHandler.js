const errorHandler = (err, req, res, next) => {
    const status  = err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message;

    console.error(`[ERROR] ${status} - ${err.message}`);
    res.status(status).json({ success: false, message });
};

module.exports = errorHandler;