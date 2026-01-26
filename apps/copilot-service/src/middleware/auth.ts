import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { createError } from './errorHandler';

export interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

export interface UserInfo {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  profilePicture: string | null;
  authProvider: string;
}

export interface AuthenticatedRequest extends Request {
  user?: UserInfo;
}

export const authenticate: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(createError('No token provided', 401));
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    // Set user on request
    (req as AuthenticatedRequest).user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      firstName: '',
      lastName: '',
      profilePicture: null,
      authProvider: 'local',
    };
    next();
  } catch {
    next(createError('Invalid or expired token', 401));
  }
};

export function authorize(...roles: string[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      return next(createError('Not authenticated', 401));
    }

    if (!roles.includes(authReq.user.role)) {
      return next(createError('Not authorized', 403));
    }

    next();
  };
}
