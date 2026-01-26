# Copilot Service Middleware Documentation

This document describes the middleware implementation for the copilot-service, copied and adapted from the BFF service.

## Overview

The copilot-service uses the following middleware components:

1. **Authentication Middleware** (`auth.ts`) - JWT validation
2. **Error Handler Middleware** (`errorHandler.ts`) - Centralized error handling
3. **CORS Middleware** (`cors.ts`) - Cross-Origin Resource Sharing configuration

## Directory Structure

```
apps/copilot-service/
├── src/
│   ├── config/
│   │   ├── env.ts          # Environment configuration
│   │   ├── logger.ts       # Pino logger setup
│   │   └── database.ts     # Database configuration
│   ├── middleware/
│   │   ├── auth.ts         # JWT authentication & authorization
│   │   ├── errorHandler.ts # Error handling middleware
│   │   ├── cors.ts         # CORS configuration
│   │   └── index.ts        # Middleware exports
│   └── types/
│       ├── user.ts         # User-related TypeScript types
│       └── index.ts        # Type exports
```

## Middleware Components

### 1. Authentication Middleware (`auth.ts`)

Provides JWT token validation and role-based authorization.

#### Interfaces

```typescript
// JWT token payload
interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

// User information attached to requests
interface UserInfo {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  profilePicture: string | null;
  authProvider: string;
}

// Extended Express Request
interface AuthenticatedRequest extends Request {
  user?: UserInfo;
}
```

#### Functions

**`authenticate`**: Middleware to validate JWT tokens

```typescript
import { authenticate } from './middleware';

// Apply to routes that require authentication
app.get('/protected', authenticate, (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  res.json({ user });
});
```

**`authorize(...roles: string[])`**: Middleware to check user roles

```typescript
import { authenticate, authorize } from './middleware';

// Only allow physicians and nurses
app.post('/clinical-note',
  authenticate,
  authorize('physician', 'nurse'),
  (req, res) => {
    // Handler code
  }
);
```

#### Features

- Validates JWT tokens from `Authorization: Bearer <token>` header
- Decodes token and attaches user info to request
- Returns 401 for missing/invalid tokens
- Role-based authorization with 403 for unauthorized access

### 2. Error Handler Middleware (`errorHandler.ts`)

Centralized error handling for consistent error responses.

#### Interfaces

```typescript
interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}
```

#### Functions

**`errorHandler`**: Express error handling middleware

```typescript
import { errorHandler } from './middleware';

// Apply as the last middleware
app.use(errorHandler);
```

**`createError(message: string, statusCode: number)`**: Helper to create errors

```typescript
import { createError } from './middleware';

// In route handlers
if (!patientId) {
  throw createError('Patient ID is required', 400);
}

// In async handlers
if (!patient) {
  return next(createError('Patient not found', 404));
}
```

#### Features

- Logs errors with request context (method, URL, status)
- Returns JSON error responses with consistent format
- Includes stack traces in development mode
- Handles both operational and unexpected errors

#### Error Response Format

```json
{
  "success": false,
  "error": {
    "message": "Patient not found",
    "stack": "..." // Only in development
  }
}
```

### 3. CORS Middleware (`cors.ts`)

Configures Cross-Origin Resource Sharing for the service.

#### Configuration

```typescript
export const corsMiddleware = cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:8081'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

#### Usage

```typescript
import { corsMiddleware } from './middleware';

app.use(corsMiddleware);
```

#### Features

- Allows credentials (cookies, authorization headers)
- Configurable origins via `CORS_ORIGINS` environment variable
- Supports common HTTP methods
- Allows Content-Type and Authorization headers

## User Types (`types/user.ts`)

### UserContext

User context for CopilotKit actions:

```typescript
interface UserContext {
  userId: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  permissions?: string[];
  roles?: string[];
}
```

### UserRole Enum

```typescript
enum UserRole {
  SYSTEM_ADMIN = 'system_admin',
  PHYSICIAN = 'physician',
  NURSE = 'nurse',
  MEDICAL_ASSISTANT = 'medical_assistant',
  PATIENT = 'patient',
  BILLING_STAFF = 'billing_staff',
  RECEPTIONIST = 'receptionist',
  USER = 'user',
}
```

### Permission Enum

```typescript
enum Permission {
  // Patient permissions
  PATIENTS_READ = 'patients:read',
  PATIENTS_CREATE = 'patients:create',
  PATIENTS_UPDATE = 'patients:update',
  PATIENTS_DELETE = 'patients:delete',

  // Medical records permissions
  RECORDS_READ = 'records:read',
  RECORDS_CREATE = 'records:create',
  RECORDS_UPDATE = 'records:update',
  RECORDS_DELETE = 'records:delete',

  // Appointments permissions
  APPOINTMENTS_READ = 'appointments:read',
  APPOINTMENTS_CREATE = 'appointments:create',
  APPOINTMENTS_UPDATE = 'appointments:update',
  APPOINTMENTS_DELETE = 'appointments:delete',

  // LLM permissions
  LLM_USE = 'llm:use',
  LLM_CONFIGURE = 'llm:configure',

  // Role management permissions
  ROLES_READ = 'roles:read',
  ROLES_CREATE = 'roles:create',
  ROLES_UPDATE = 'roles:update',
  ROLES_DELETE = 'roles:delete',

  // User management permissions
  USERS_READ = 'users:read',
  USERS_CREATE = 'users:create',
  USERS_UPDATE = 'users:update',
  USERS_DELETE = 'users:delete',

  // Own data permissions (for patients)
  OWN_RECORDS_READ = 'own_records:read',
  OWN_RECORDS_UPDATE = 'own_records:update',
  OWN_APPOINTMENTS_READ = 'own_appointments:read',
  OWN_APPOINTMENTS_CREATE = 'own_appointments:create',
}
```

## Complete Express App Example

```typescript
import express from 'express';
import { config } from './config/env';
import { logger } from './config/logger';
import { corsMiddleware, authenticate, authorize, errorHandler } from './middleware';
import { AuthenticatedRequest, UserRole, Permission } from './types';

const app = express();

// CORS middleware (must be early in the chain)
app.use(corsMiddleware);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Public routes (no authentication)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Protected routes (authentication required)
app.get('/api/user', authenticate, (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  res.json({ user });
});

// Role-based protected routes
app.post('/api/clinical-note',
  authenticate,
  authorize(UserRole.PHYSICIAN, UserRole.NURSE, UserRole.MEDICAL_ASSISTANT),
  (req, res) => {
    // Only clinical staff can create clinical notes
    res.json({ message: 'Clinical note created' });
  }
);

app.get('/api/admin',
  authenticate,
  authorize(UserRole.SYSTEM_ADMIN),
  (req, res) => {
    // Only system admins can access
    res.json({ message: 'Admin area' });
  }
);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  logger.info(`Copilot service running on port ${PORT}`);
});
```

## Environment Variables

The middleware relies on these environment variables:

```bash
# JWT Authentication
JWT_SECRET=your-secret-key-change-in-production

# CORS Configuration
CORS_ORIGINS=http://localhost:8081,http://localhost:3000

# Server
COPILOT_PORT=8004
NODE_ENV=development
```

## Security Considerations

1. **JWT Secret**: Always use a strong, randomly generated secret in production
2. **CORS Origins**: Restrict to specific trusted domains in production
3. **Token Expiry**: Tokens are validated but not automatically refreshed
4. **Error Messages**: Stack traces are hidden in production mode
5. **Authorization**: Always use `authenticate` before `authorize`
6. **HTTPS**: Use HTTPS in production for secure token transmission

## Testing

### Test Authentication

```bash
# Get a valid token (login via BFF or auth service)
TOKEN="your-jwt-token-here"

# Test authenticated endpoint
curl -H "Authorization: Bearer $TOKEN" http://localhost:8004/api/user

# Test without token (should return 401)
curl http://localhost:8004/api/user
```

### Test Authorization

```bash
# Login as different role users
curl -H "Authorization: Bearer $PHYSICIAN_TOKEN" \
  http://localhost:8004/api/clinical-note

curl -H "Authorization: Bearer $PATIENT_TOKEN" \
  http://localhost:8004/api/clinical-note # Should return 403
```

## Error Scenarios

### 401 Unauthorized

```json
{
  "success": false,
  "error": {
    "message": "No token provided"
  }
}
```

### 403 Forbidden

```json
{
  "success": false,
  "error": {
    "message": "Not authorized"
  }
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "error": {
    "message": "Internal Server Error",
    "stack": "..." // Only in development
  }
}
```

## Next Steps

1. Integrate with RBAC service for permission-based authorization
2. Add rate limiting middleware
3. Add request logging middleware
4. Implement refresh token mechanism
5. Add audit logging for sensitive operations

## References

- Source: `apps/bff/src/middleware/auth.ts`
- Source: `apps/bff/src/middleware/errorHandler.ts`
- BFF CORS config: `apps/bff/src/index.ts` (lines 21-24)
