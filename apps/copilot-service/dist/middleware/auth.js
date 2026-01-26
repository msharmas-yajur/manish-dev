"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
exports.authorize = authorize;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const errorHandler_1 = require("./errorHandler");
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next((0, errorHandler_1.createError)('No token provided', 401));
    }
    const token = authHeader.substring(7);
    try {
        const decoded = jsonwebtoken_1.default.verify(token, env_1.config.jwtSecret);
        // Set user on request
        req.user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role,
            firstName: '',
            lastName: '',
            profilePicture: null,
            authProvider: 'local',
        };
        next();
    }
    catch {
        next((0, errorHandler_1.createError)('Invalid or expired token', 401));
    }
};
exports.authenticate = authenticate;
function authorize(...roles) {
    return (req, res, next) => {
        const authReq = req;
        if (!authReq.user) {
            return next((0, errorHandler_1.createError)('Not authenticated', 401));
        }
        if (!roles.includes(authReq.user.role)) {
            return next((0, errorHandler_1.createError)('Not authorized', 403));
        }
        next();
    };
}
//# sourceMappingURL=auth.js.map