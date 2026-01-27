"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '8004', 10),
    // Database
    postgres: {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
        user: process.env.POSTGRES_USER || 'manish',
        password: process.env.POSTGRES_PASSWORD || 'manish_secret',
        database: process.env.POSTGRES_DB || 'manish_dev',
    },
    // Redis
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || 'manish_secret',
    },
    // Services
    llmServiceUrl: process.env.LLM_SERVICE_URL || 'http://localhost:8003',
    snowstormUrl: process.env.SNOWSTORM_URL || 'http://localhost:8080',
    backendApiUrl: process.env.BACKEND_API_URL || 'http://localhost:8000',
    // JWT
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    // CORS
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:8081'],
};
//# sourceMappingURL=env.js.map