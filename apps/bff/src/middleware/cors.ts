import cors from 'cors';
import { config } from '../config/env';

export const corsOptions = {
  origin: process.env.CORS_ORIGINS?.split(',') || [
    config.frontendUrl,
    'http://localhost:8081',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400, // 24 hours
};

export const corsMiddleware = cors(corsOptions);
