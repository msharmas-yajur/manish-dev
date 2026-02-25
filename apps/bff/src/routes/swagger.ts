import { Router, Request, Response, NextFunction } from 'express';
import type { Router as RouterType } from 'express';
import swaggerUi from 'swagger-ui-express';
import { getMergedSpec, getBffSpec } from '../services/swaggerMerger';
import { logger } from '../config/logger';

export const swaggerRouter: RouterType = Router();

/**
 * @swagger
 * tags:
 *   - name: Documentation
 *     description: API documentation endpoints
 */

/**
 * GET /openapi.json - Return merged OpenAPI spec (BFF + Backend)
 */
swaggerRouter.get('/openapi.json', async (req: Request, res: Response) => {
  try {
    const spec = await getMergedSpec();
    res.json(spec);
  } catch (error) {
    logger.error({ error }, 'Failed to generate merged OpenAPI spec');
    res.status(500).json({
      success: false,
      error: { message: 'Failed to generate API documentation' },
    });
  }
});

/**
 * GET /bff/openapi.json - Return BFF-only OpenAPI spec
 */
swaggerRouter.get('/bff/openapi.json', (req: Request, res: Response) => {
  try {
    const spec = getBffSpec();
    res.json(spec);
  } catch (error) {
    logger.error({ error }, 'Failed to generate BFF OpenAPI spec');
    res.status(500).json({
      success: false,
      error: { message: 'Failed to generate API documentation' },
    });
  }
});

// Swagger UI options
const swaggerUiOptions: swaggerUi.SwaggerUiOptions = {
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true,
    tryItOutEnabled: true,
    displayRequestDuration: true,
    filter: true,
    docExpansion: 'list',
    defaultModelsExpandDepth: 2,
  },
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Caladrius Health API Documentation',
};

/**
 * Serve Swagger UI at root with merged spec
 * Note: We need to dynamically load the spec for Swagger UI
 */
swaggerRouter.use(
  '/',
  swaggerUi.serve,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const spec = await getMergedSpec();
      const handler = swaggerUi.setup(spec, swaggerUiOptions);
      handler(req, res, next);
    } catch (error) {
      logger.error({ error }, 'Failed to serve Swagger UI');
      res.status(500).json({
        success: false,
        error: { message: 'Failed to load API documentation' },
      });
    }
  }
);
