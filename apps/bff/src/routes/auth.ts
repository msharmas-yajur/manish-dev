import { Router, Request, Response, NextFunction } from 'express';
import type { Router as RouterType } from 'express';
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

export const authRouter: RouterType = Router();

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

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticates a user with email and password, returns JWT token and user details including roles and permissions.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       description: JWT authentication token
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         email:
 *                           type: string
 *                           format: email
 *                         firstName:
 *                           type: string
 *                         lastName:
 *                           type: string
 *                         role:
 *                           type: string
 *                         roles:
 *                           type: array
 *                           items:
 *                             type: string
 *                         permissions:
 *                           type: array
 *                           items:
 *                             type: string
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Invalid credentials
 */
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

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: User registration
 *     description: Creates a new user account with the provided details. Assigns default role automatically.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName, lastName]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: newuser@example.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: securepassword
 *               firstName:
 *                 type: string
 *                 minLength: 1
 *                 example: John
 *               lastName:
 *                 type: string
 *                 minLength: 1
 *                 example: Doe
 *     responses:
 *       201:
 *         description: Registration successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       description: JWT authentication token
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         email:
 *                           type: string
 *                           format: email
 *                         firstName:
 *                           type: string
 *                         lastName:
 *                           type: string
 *                         role:
 *                           type: string
 *                         roles:
 *                           type: array
 *                           items:
 *                             type: string
 *                         permissions:
 *                           type: array
 *                           items:
 *                             type: string
 *       400:
 *         description: Invalid input
 *       409:
 *         description: Email already registered
 */
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

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user
 *     description: Returns the authenticated user's profile information including roles and permissions.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     email:
 *                       type: string
 *                       format: email
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *                     role:
 *                       type: string
 *                     roles:
 *                       type: array
 *                       items:
 *                         type: string
 *                     permissions:
 *                       type: array
 *                       items:
 *                         type: string
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       404:
 *         description: User not found
 */
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

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: User logout
 *     description: Logs out the authenticated user. Note - This is primarily for client-side token invalidation acknowledgment since JWTs are stateless.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Logged out successfully
 *       401:
 *         description: Unauthorized - Invalid or missing token
 */
// Logout (just for client-side token invalidation acknowledgment)
authRouter.post('/logout', authenticate, (req, res) => {
  const authReq = req as AuthenticatedRequest;
  logger.info({ userId: authReq.user!.id }, 'User logged out');
  res.json({ success: true, message: 'Logged out successfully' });
});

// =============================================
// Password Reset Routes
// =============================================

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     description: Initiates the password reset process by generating a reset token. Always returns success to prevent email enumeration attacks.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Password reset email sent (if account exists)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: If an account with that email exists, a password reset link has been sent.
 *       400:
 *         description: Invalid email address
 */
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

/**
 * @swagger
 * /auth/verify-reset-token/{token}:
 *   get:
 *     summary: Verify password reset token
 *     description: Validates a password reset token before showing the reset form. Optional endpoint for better UX.
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: The password reset token received via email
 *     responses:
 *       200:
 *         description: Token validation result
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     data:
 *                       type: object
 *                       properties:
 *                         email:
 *                           type: string
 *                           format: email
 *                 - type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: false
 *                     error:
 *                       type: object
 *                       properties:
 *                         message:
 *                           type: string
 *                           example: Invalid or expired reset token
 */
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

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     description: Resets the user's password using a valid reset token. Token must not be expired.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token:
 *                 type: string
 *                 minLength: 1
 *                 description: The password reset token received via email
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: The new password (minimum 6 characters)
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Password has been reset successfully. You can now log in with your new password.
 *       400:
 *         description: Invalid or expired reset token, or invalid password
 */
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

/**
 * @swagger
 * /auth/google:
 *   get:
 *     summary: Initiate Google OAuth flow
 *     description: Redirects the user to Google's OAuth consent page for authentication.
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirects to Google OAuth consent page
 *       503:
 *         description: Google OAuth is not configured
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Google OAuth is not configured
 */
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

/**
 * @swagger
 * /auth/google/callback:
 *   get:
 *     summary: Google OAuth callback
 *     description: Handles the callback from Google OAuth. On success, redirects to frontend with JWT token. On failure, redirects to login page with error.
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Authorization code from Google
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: State parameter for CSRF protection
 *     responses:
 *       302:
 *         description: Redirects to frontend with token on success, or to login page with error on failure
 */
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

// =============================================
// Frappe/ERPNext OAuth Routes
// =============================================

/**
 * @swagger
 * /auth/frappe:
 *   get:
 *     summary: Initiate Frappe/ERPNext OAuth flow
 *     description: Redirects the user to Frappe/ERPNext OAuth consent page for authentication.
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirects to Frappe OAuth consent page
 *       503:
 *         description: Frappe OAuth is not configured
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Frappe OAuth is not configured
 */
// Initiate Frappe OAuth flow
authRouter.get('/frappe', (req: Request, res: Response) => {
  if (!config.frappe.clientId) {
    return res.status(503).json({
      success: false,
      error: { message: 'Frappe OAuth is not configured' },
    });
  }

  // Generate state parameter for CSRF protection
  const state = crypto.randomBytes(16).toString('hex');
  (req.session as unknown as Record<string, unknown>).frappeOAuthState = state;

  const params = new URLSearchParams({
    client_id: config.frappe.clientId,
    response_type: 'code',
    redirect_uri: config.frappe.callbackUrl,
    scope: 'openid email profile',
    state,
  });

  res.redirect(
    `${config.frappe.url}/api/method/frappe.integrations.oauth2.authorize?${params.toString()}`
  );
});

/**
 * @swagger
 * /auth/frappe/callback:
 *   get:
 *     summary: Frappe/ERPNext OAuth callback
 *     description: Handles the callback from Frappe/ERPNext OAuth. Exchanges authorization code for access token, fetches user profile, creates or links user account, and redirects to frontend with JWT token.
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Authorization code from Frappe
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: State parameter for CSRF protection
 *     responses:
 *       302:
 *         description: Redirects to frontend with token on success, or to login page with error on failure
 */
// Frappe OAuth callback
authRouter.get('/frappe/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;
    const sessionState = (req.session as unknown as Record<string, unknown>).frappeOAuthState;

    // Verify state to prevent CSRF
    if (!state || state !== sessionState) {
      logger.warn('Frappe OAuth: state mismatch');
      return res.redirect(`${config.frontendUrl}/login?error=frappe_auth_failed`);
    }

    // Clear state from session
    delete (req.session as unknown as Record<string, unknown>).frappeOAuthState;

    if (!code) {
      logger.warn('Frappe OAuth: no authorization code received');
      return res.redirect(`${config.frontendUrl}/login?error=frappe_auth_failed`);
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch(
      `${config.frappe.internalUrl}/api/method/frappe.integrations.oauth2.get_token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code as string,
          redirect_uri: config.frappe.callbackUrl,
          client_id: config.frappe.clientId,
          client_secret: config.frappe.clientSecret,
        }).toString(),
      }
    );

    if (!tokenResponse.ok) {
      logger.error({ status: tokenResponse.status }, 'Frappe OAuth: token exchange failed');
      return res.redirect(`${config.frontendUrl}/login?error=frappe_auth_failed`);
    }

    const tokenData = await tokenResponse.json() as { access_token?: string };
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      logger.error('Frappe OAuth: no access token in response');
      return res.redirect(`${config.frontendUrl}/login?error=frappe_auth_failed`);
    }

    // Fetch user profile from Frappe
    const profileResponse = await fetch(
      `${config.frappe.internalUrl}/api/method/frappe.integrations.oauth2.openid_profile`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!profileResponse.ok) {
      logger.error({ status: profileResponse.status }, 'Frappe OAuth: profile fetch failed');
      return res.redirect(`${config.frontendUrl}/login?error=frappe_auth_failed`);
    }

    const profile = await profileResponse.json() as {
      sub?: string; email?: string; name?: string;
      given_name?: string; family_name?: string;
    };
    const frappeId = profile.sub || profile.email;
    const email = profile.email;
    const firstName = profile.given_name || profile.name?.split(' ')[0] || '';
    const lastName = profile.family_name || profile.name?.split(' ').slice(1).join(' ') || '';

    if (!email) {
      logger.error('Frappe OAuth: no email in profile');
      return res.redirect(`${config.frontendUrl}/login?error=frappe_auth_failed`);
    }

    // Look up or create user (3 scenarios, same as Google OAuth)
    let user;

    // 1. Check if frappe_id already exists
    const existingFrappeUser = await pgPool.query(
      'SELECT id, email, role, first_name, last_name FROM users WHERE frappe_id = $1',
      [frappeId]
    );

    if (existingFrappeUser.rows.length > 0) {
      user = existingFrappeUser.rows[0];
      logger.info({ userId: user.id, email: user.email }, 'Frappe OAuth: existing user login');
    } else {
      // 2. Check if email matches an existing user (link accounts)
      const existingEmailUser = await pgPool.query(
        'SELECT id, email, role, first_name, last_name FROM users WHERE email = $1',
        [email]
      );

      if (existingEmailUser.rows.length > 0) {
        user = existingEmailUser.rows[0];
        // Link Frappe account to existing user
        await pgPool.query(
          'UPDATE users SET frappe_id = $1 WHERE id = $2',
          [frappeId, user.id]
        );
        logger.info({ userId: user.id, email: user.email }, 'Frappe OAuth: linked to existing user');
      } else {
        // 3. Create new user
        const newUser = await pgPool.query(
          `INSERT INTO users (email, frappe_id, first_name, last_name, role, auth_provider)
           VALUES ($1, $2, $3, $4, 'user', 'frappe')
           RETURNING id, email, role, first_name, last_name`,
          [email, frappeId, firstName, lastName]
        );
        user = newUser.rows[0];

        // Assign default role
        await assignDefaultRole(user.id);
        logger.info({ userId: user.id, email: user.email }, 'Frappe OAuth: new user created');
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: '24h' }
    );

    logger.info({ userId: user.id, email: user.email }, 'Frappe OAuth successful');

    // Redirect to frontend with token
    res.redirect(
      `${config.frontendUrl}/auth/callback?token=${token}&provider=frappe`
    );
  } catch (error) {
    logger.error({ error }, 'Frappe OAuth callback error');
    res.redirect(`${config.frontendUrl}/login?error=frappe_auth_failed`);
  }
});

// =============================================
// Provider Discovery
// =============================================

/**
 * @swagger
 * /auth/providers:
 *   get:
 *     summary: Get available auth providers
 *     description: Returns the list of configured authentication providers (local, Google, Frappe).
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: List of available authentication providers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     providers:
 *                       type: object
 *                       properties:
 *                         local:
 *                           type: boolean
 *                           description: Whether local (email/password) authentication is enabled
 *                           example: true
 *                         google:
 *                           type: boolean
 *                           description: Whether Google OAuth is configured
 *                           example: true
 *                         frappe:
 *                           type: boolean
 *                           description: Whether Frappe/ERPNext OAuth is configured
 *                           example: false
 */
// Check available auth providers
authRouter.get('/providers', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      providers: {
        local: true,
        google: !!config.google.clientId,
        frappe: !!config.frappe.clientId,
      },
    },
  });
});
