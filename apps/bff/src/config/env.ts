import dotenv from 'dotenv';

dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),

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

  // Backend services
  backendUrl: process.env.BACKEND_URL || 'http://localhost:8000',
  llmServiceUrl: process.env.LLM_SERVICE_URL || 'http://localhost:8003',
  copilotServiceUrl: process.env.COPILOT_SERVICE_URL || 'http://localhost:8004',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  jwtExpiration: process.env.JWT_EXPIRATION || '24h',

  // Google OAuth
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/auth/google/callback',
  },

  // Session
  sessionSecret: process.env.SESSION_SECRET || 'session-secret-change-in-production',

  // Frontend URL (for redirects)
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:8081',
};
