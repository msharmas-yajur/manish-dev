"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
exports.createError = createError;
const logger_1 = require("../config/logger");
function errorHandler(err, req, res, _next) {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    logger_1.logger.error({
        err,
        method: req.method,
        url: req.url,
        statusCode,
    }, 'Request error');
    res.status(statusCode).json({
        success: false,
        error: {
            message,
            ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
        },
    });
}
function createError(message, statusCode) {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.isOperational = true;
    return error;
}
//# sourceMappingURL=errorHandler.js.map