import { Pool } from 'pg';
import Redis from 'ioredis';
import { config } from './env';
import { logger } from './logger';

// PostgreSQL connection pool
export const pgPool = new Pool({
  host: config.postgres.host,
  port: config.postgres.port,
  user: config.postgres.user,
  password: config.postgres.password,
  database: config.postgres.database,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pgPool.on('error', (err) => {
  logger.error('Unexpected PostgreSQL error:', err);
});

// Redis client
export const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('error', (err) => {
  logger.error('Redis connection error:', err);
});

redis.on('connect', () => {
  logger.info('Connected to Redis');
});

// Health check functions
export async function checkPostgresHealth(): Promise<boolean> {
  try {
    const result = await pgPool.query('SELECT 1');
    return result.rows.length > 0;
  } catch {
    return false;
  }
}

export async function checkRedisHealth(): Promise<boolean> {
  try {
    const result = await redis.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
}
