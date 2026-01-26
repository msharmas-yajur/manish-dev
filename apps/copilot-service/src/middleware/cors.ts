import cors from 'cors';

export const corsMiddleware = cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:8081'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
