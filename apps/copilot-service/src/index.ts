import express from 'express';
import { config } from './config/env';
import { logger } from './config/logger';
import { corsMiddleware } from './middleware/cors';
import { errorHandler } from './middleware/errorHandler';
import routes from './routes';

const app = express();

// Middleware
app.use(express.json());
app.use(corsMiddleware);

// Routes
app.use('/', routes);

// Error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Copilot service started');
});

export default app;
