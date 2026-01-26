"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = exports.pgPool = void 0;
exports.checkPostgresHealth = checkPostgresHealth;
exports.checkRedisHealth = checkRedisHealth;
const pg_1 = require("pg");
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("./env");
const logger_1 = require("./logger");
// PostgreSQL connection pool
exports.pgPool = new pg_1.Pool({
    host: env_1.config.postgres.host,
    port: env_1.config.postgres.port,
    user: env_1.config.postgres.user,
    password: env_1.config.postgres.password,
    database: env_1.config.postgres.database,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
exports.pgPool.on('error', (err) => {
    logger_1.logger.error('Unexpected PostgreSQL error:', err);
});
// Redis client
exports.redis = new ioredis_1.default({
    host: env_1.config.redis.host,
    port: env_1.config.redis.port,
    password: env_1.config.redis.password,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
});
exports.redis.on('error', (err) => {
    logger_1.logger.error('Redis connection error:', err);
});
exports.redis.on('connect', () => {
    logger_1.logger.info('Connected to Redis');
});
// Health check functions
async function checkPostgresHealth() {
    try {
        const result = await exports.pgPool.query('SELECT 1');
        return result.rows.length > 0;
    }
    catch {
        return false;
    }
}
async function checkRedisHealth() {
    try {
        const result = await exports.redis.ping();
        return result === 'PONG';
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=database.js.map