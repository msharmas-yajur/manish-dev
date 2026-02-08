import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import { config } from './config/env';
import { logger } from './config/logger';
import passport, { configurePassport } from './config/passport';
import { healthRouter } from './routes/health';
import { authRouter } from './routes/auth';
import { rolesRouter } from './routes/roles';
import { proxyRouter } from './routes/proxy';
import { syncRouter } from './routes/sync';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { corsMiddleware } from './middleware/cors';

const app = express();

// Security middleware
app.use(helmet());
app.use(corsMiddleware);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// Session middleware (required for Passport OAuth)
app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: config.nodeEnv === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Initialize Passport
configurePassport();
app.use(passport.initialize());
app.use(passport.session());

// Request logging
app.use(requestLogger);

// Routes
app.use('/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/roles', rolesRouter);
app.use('/api', proxyRouter); // Proxy must come before generic rolesRouter to handle /api/backend/* and /api/llm/*
app.use('/api', rolesRouter); // For /api/users/:userId/roles paths - placed after proxyRouter
app.use('/api/sync', syncRouter);

// Error handling
app.use(errorHandler);

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  logger.info(`BFF server running on port ${PORT}`);
  logger.info(`Environment: ${config.nodeEnv}`);
});

export default app;
