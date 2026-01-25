import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import passport from 'passport';
import { pgPool } from '../config/database';
import { config } from '../config/env';
import { createError } from '../middleware/errorHandler';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../config/logger';
import { GoogleUser } from '../config/passport';
import { getUserRoleInfo, assignDefaultRole } from '../services/rbac';

export const authRouter = Router();

// Validation schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6),
});

// Login
authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const result = await pgPool.query(
      'SELECT id, email, password_hash, role, first_name, last_name FROM users WHERE email = $1 AND is_active = true',
      [email]
    );

    if (result.rows.length === 0) {
      return next(createError('Invalid credentials', 401));
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return next(createError('Invalid credentials', 401));
    }

    // Get user roles and permissions
    const roleInfo = await getUserRoleInfo(user.id);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: '24h' }
    );

    logger.info({ userId: user.id, email: user.email }, 'User logged in');

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          roles: roleInfo.roles,
          permissions: roleInfo.permissions,
        },
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(createError('Invalid input', 400));
    }
    next(err);
  }
});

// Register
authRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, firstName, lastName } = registerSchema.parse(req.body);

    // Check if user exists
    const existingUser = await pgPool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return next(createError('Email already registered', 409));
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const result = await pgPool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, 'user')
       RETURNING id, email, first_name, last_name, role`,
      [email, passwordHash, firstName, lastName]
    );

    const user = result.rows[0];

    // Assign default role to new user
    await assignDefaultRole(user.id);

    // Get user roles and permissions
    const roleInfo = await getUserRoleInfo(user.id);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: '24h' }
    );

    logger.info({ userId: user.id, email: user.email }, 'User registered');

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          roles: roleInfo.roles,
          permissions: roleInfo.permissions,
        },
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(createError('Invalid input', 400));
    }
    next(err);
  }
});

// Get current user
authRouter.get('/me', authenticate, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const result = await pgPool.query(
      'SELECT id, email, first_name, last_name, role FROM users WHERE id = $1',
      [authReq.user!.id]
    );

    if (result.rows.length === 0) {
      return next(createError('User not found', 404));
    }

    const user = result.rows[0];

    // Get user roles and permissions
    const roleInfo = await getUserRoleInfo(user.id);

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        roles: roleInfo.roles,
        permissions: roleInfo.permissions,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Logout (just for client-side token invalidation acknowledgment)
authRouter.post('/logout', authenticate, (req, res) => {
  const authReq = req as AuthenticatedRequest;
  logger.info({ userId: authReq.user!.id }, 'User logged out');
  res.json({ success: true, message: 'Logged out successfully' });
});

// =============================================
// Password Reset Routes
// =============================================

// Request password reset
authRouter.post('/forgot-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);

    // Find user by email
    const result = await pgPool.query(
      'SELECT id, email, first_name, auth_provider FROM users WHERE email = $1 AND is_active = true',
      [email]
    );

    // Always return success to prevent email enumeration attacks
    const successResponse = {
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    };

    if (result.rows.length === 0) {
      logger.info({ email }, 'Password reset requested for non-existent email');
      return res.json(successResponse);
    }

    const user = result.rows[0];

    // Check if user uses OAuth only (no password)
    if (user.auth_provider !== 'local') {
      logger.info({ email, provider: user.auth_provider }, 'Password reset requested for OAuth user');
      return res.json(successResponse);
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store hashed token in database
    await pgPool.query(
      'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3',
      [resetTokenHash, resetExpires, user.id]
    );

    // Build reset URL
    const resetUrl = `${config.frontendUrl}/auth/reset-password?token=${resetToken}`;

    // In production, send email here. For now, log it.
    logger.info({
      userId: user.id,
      email: user.email,
      resetUrl,
    }, 'Password reset link generated');

    // TODO: Send email with reset link
    // await sendPasswordResetEmail(user.email, user.first_name, resetUrl);

    // For development, also log to console
    console.log('\n========================================');
    console.log('PASSWORD RESET LINK (Development Only)');
    console.log('========================================');
    console.log(`Email: ${user.email}`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log('Token expires in 1 hour');
    console.log('========================================\n');

    res.json(successResponse);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(createError('Invalid email address', 400));
    }
    next(err);
  }
});

// Verify reset token (optional endpoint for UX - check if token is valid before showing form)
authRouter.get('/verify-reset-token/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;

    // Hash the token to compare with stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const result = await pgPool.query(
      `SELECT id, email FROM users
       WHERE password_reset_token = $1
       AND password_reset_expires > NOW()
       AND is_active = true`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: false,
        error: { message: 'Invalid or expired reset token' },
      });
    }

    res.json({
      success: true,
      data: {
        email: result.rows[0].email,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Reset password with token
authRouter.post('/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);

    // Hash the token to compare with stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid token
    const result = await pgPool.query(
      `SELECT id, email FROM users
       WHERE password_reset_token = $1
       AND password_reset_expires > NOW()
       AND is_active = true`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      return next(createError('Invalid or expired reset token', 400));
    }

    const user = result.rows[0];

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 12);

    // Update password and clear reset token
    await pgPool.query(
      `UPDATE users
       SET password_hash = $1,
           password_reset_token = NULL,
           password_reset_expires = NULL,
           updated_at = NOW()
       WHERE id = $2`,
      [passwordHash, user.id]
    );

    logger.info({ userId: user.id, email: user.email }, 'Password reset successful');

    res.json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.',
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(createError('Invalid input. Password must be at least 6 characters.', 400));
    }
    next(err);
  }
});

// =============================================
// Google OAuth Routes
// =============================================

// Initiate Google OAuth flow
authRouter.get('/google', (req: Request, res: Response, next: NextFunction) => {
  if (!config.google.clientId) {
    return res.status(503).json({
      success: false,
      error: { message: 'Google OAuth is not configured' },
    });
  }

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })(req, res, next);
});

// Google OAuth callback
authRouter.get(
  '/google/callback',
  (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate('google', {
      session: false,
      failureRedirect: `${config.frontendUrl}/login?error=google_auth_failed`,
    })(req, res, next);
  },
  (req: Request, res: Response) => {
    try {
      const user = req.user as GoogleUser;

      if (!user) {
        logger.error('Google OAuth callback: No user in request');
        return res.redirect(`${config.frontendUrl}/login?error=google_auth_failed`);
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        config.jwtSecret,
        { expiresIn: '24h' }
      );

      logger.info({ userId: user.id, email: user.email }, 'Google OAuth successful');

      // Redirect to frontend with token
      // The frontend will extract the token from the URL and store it
      res.redirect(
        `${config.frontendUrl}/auth/callback?token=${token}&provider=google`
      );
    } catch (error) {
      logger.error({ error }, 'Google OAuth callback error');
      res.redirect(`${config.frontendUrl}/login?error=google_auth_failed`);
    }
  }
);

// Check if Google OAuth is available
authRouter.get('/providers', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      providers: {
        local: true,
        google: !!config.google.clientId,
      },
    },
  });
});
