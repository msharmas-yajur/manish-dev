import pino from 'pino';
import { config } from './env';

export const logger = pino({
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  base: { service: 'copilot-service' },
  transport:
    config.nodeEnv !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
          },
        }
      : undefined,
});
