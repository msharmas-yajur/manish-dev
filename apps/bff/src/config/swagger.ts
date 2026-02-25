import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Caladrius Health API',
      version: '1.0.0',
      description: 'BFF (Backend for Frontend) API for the Caladrius Health platform',
      contact: {
        name: 'Caladrius Health Team',
      },
    },
    servers: [
      {
        url: '/api',
        description: 'BFF API endpoints',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT authentication token. Obtain via /auth/login or OAuth flow.',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  description: 'Error message',
                  example: 'An error occurred',
                },
                code: {
                  type: 'string',
                  description: 'Error code (optional)',
                  example: 'VALIDATION_ERROR',
                },
              },
              required: ['message'],
            },
          },
          required: ['success', 'error'],
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
              description: 'Response data payload',
            },
            message: {
              type: 'string',
              description: 'Optional success message',
            },
          },
          required: ['success'],
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'User unique identifier',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
            },
            firstName: {
              type: 'string',
              description: 'User first name',
            },
            lastName: {
              type: 'string',
              description: 'User last name',
            },
            role: {
              type: 'string',
              description: 'Primary user role (legacy field)',
              enum: ['admin', 'user', 'doctor', 'nurse'],
            },
            roles: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'List of assigned role names',
            },
            permissions: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'List of effective permissions',
            },
          },
          required: ['id', 'email'],
        },
        Role: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Role unique identifier',
            },
            name: {
              type: 'string',
              description: 'Role name (slug)',
              example: 'admin',
            },
            displayName: {
              type: 'string',
              description: 'Human-readable role name',
              example: 'Administrator',
            },
            description: {
              type: 'string',
              nullable: true,
              description: 'Role description',
            },
            isSystem: {
              type: 'boolean',
              description: 'Whether this is a system-defined role',
            },
            isActive: {
              type: 'boolean',
              description: 'Whether the role is active',
            },
          },
          required: ['id', 'name', 'displayName', 'isSystem', 'isActive'],
        },
        LoginRequest: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'user@example.com',
            },
            password: {
              type: 'string',
              minLength: 6,
              description: 'User password (minimum 6 characters)',
              example: 'password123',
            },
          },
          required: ['email', 'password'],
        },
        RegisterRequest: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'newuser@example.com',
            },
            password: {
              type: 'string',
              minLength: 6,
              description: 'User password (minimum 6 characters)',
              example: 'securepassword',
            },
            firstName: {
              type: 'string',
              minLength: 1,
              description: 'User first name',
              example: 'John',
            },
            lastName: {
              type: 'string',
              minLength: 1,
              description: 'User last name',
              example: 'Doe',
            },
          },
          required: ['email', 'password', 'firstName', 'lastName'],
        },
      },
    },
    tags: [
      {
        name: 'Auth',
        description: 'Authentication and authorization endpoints',
      },
      {
        name: 'Roles',
        description: 'Role and permission management endpoints',
      },
      {
        name: 'Copilot',
        description: 'AI Copilot service endpoints',
      },
      {
        name: 'Sync',
        description: 'Data synchronization endpoints (ERPNext integration)',
      },
      {
        name: 'Health',
        description: 'Health check and monitoring endpoints',
      },
      {
        name: 'Backend',
        description: 'Backend service proxy endpoints',
      },
    ],
  },
  apis: [path.join(__dirname, '../routes/*.ts')],
};

export const swaggerSpec = swaggerJsdoc(options);
