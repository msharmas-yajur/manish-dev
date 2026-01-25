import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AuthenticatedRequest } from './auth';
import { createError } from './errorHandler';
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasRole,
  hasAnyRole,
} from '../services/rbac';

/**
 * Middleware to require a specific permission
 */
export function requirePermission(permission: string): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      return next(createError('Not authenticated', 401));
    }

    const allowed = await hasPermission(authReq.user.id, permission);

    if (!allowed) {
      return next(
        createError(`Permission denied. Required: ${permission}`, 403)
      );
    }

    next();
  };
}

/**
 * Middleware to require any of the specified permissions
 */
export function requireAnyPermission(permissions: string[]): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      return next(createError('Not authenticated', 401));
    }

    const allowed = await hasAnyPermission(authReq.user.id, permissions);

    if (!allowed) {
      return next(
        createError(
          `Permission denied. Required one of: ${permissions.join(', ')}`,
          403
        )
      );
    }

    next();
  };
}

/**
 * Middleware to require all of the specified permissions
 */
export function requireAllPermissions(permissions: string[]): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      return next(createError('Not authenticated', 401));
    }

    const allowed = await hasAllPermissions(authReq.user.id, permissions);

    if (!allowed) {
      return next(
        createError(
          `Permission denied. Required all of: ${permissions.join(', ')}`,
          403
        )
      );
    }

    next();
  };
}

/**
 * Middleware to require a specific role
 */
export function requireRole(role: string): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      return next(createError('Not authenticated', 401));
    }

    const allowed = await hasRole(authReq.user.id, role);

    if (!allowed) {
      return next(createError(`Role required: ${role}`, 403));
    }

    next();
  };
}

/**
 * Middleware to require any of the specified roles
 */
export function requireAnyRole(roles: string[]): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      return next(createError('Not authenticated', 401));
    }

    const allowed = await hasAnyRole(authReq.user.id, roles);

    if (!allowed) {
      return next(
        createError(`Required one of roles: ${roles.join(', ')}`, 403)
      );
    }

    next();
  };
}

/**
 * Middleware to require system admin role
 */
export const requireAdmin: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authReq = req as AuthenticatedRequest;

  if (!authReq.user) {
    return next(createError('Not authenticated', 401));
  }

  const isAdmin = await hasRole(authReq.user.id, 'system_admin');

  if (!isAdmin) {
    return next(createError('Admin access required', 403));
  }

  next();
};

/**
 * Middleware to check if user is accessing their own resource
 * Use with requirePermission for own_* permissions
 */
export function requireOwnership(
  paramName: string = 'userId'
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      return next(createError('Not authenticated', 401));
    }

    const resourceUserId = req.params[paramName];

    if (resourceUserId !== authReq.user.id) {
      return next(createError('Access denied. You can only access your own resources.', 403));
    }

    next();
  };
}

/**
 * Middleware to check if user is admin OR accessing their own resource
 */
export function requireAdminOrOwnership(
  paramName: string = 'userId'
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      return next(createError('Not authenticated', 401));
    }

    const resourceUserId = req.params[paramName];
    const isOwnResource = resourceUserId === authReq.user.id;
    const isAdmin = await hasRole(authReq.user.id, 'system_admin');

    if (!isOwnResource && !isAdmin) {
      return next(createError('Access denied', 403));
    }

    next();
  };
}
