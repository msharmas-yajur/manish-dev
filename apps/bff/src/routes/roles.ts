import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { pgPool } from '../config/database';
import { createError } from '../middleware/errorHandler';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { requirePermission, requireAdmin } from '../middleware/rbac';
import {
  getAllRoles,
  getAllPermissions,
  getRolePermissions,
  getUserRoles,
  getUserPermissions,
  assignRolesToUser,
  addRoleToUser,
  removeRoleFromUser,
  invalidateUserCache,
} from '../services/rbac';
import { logger } from '../config/logger';

export const rolesRouter = Router();

// Validation schemas
const assignRolesSchema = z.object({
  roles: z.array(z.string()).min(1),
});

const updateRolePermissionsSchema = z.object({
  permissions: z.array(z.string()),
});

const createRoleSchema = z.object({
  name: z.string().min(1).max(50).regex(/^[a-z_]+$/),
  displayName: z.string().min(1).max(100),
  description: z.string().optional(),
});

// =============================================
// Role Management Routes
// =============================================

/**
 * GET /api/roles - List all roles
 */
rolesRouter.get(
  '/',
  authenticate,
  requirePermission('roles:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const roles = await getAllRoles();
      res.json({ success: true, data: roles });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/roles - Create a new role
 */
rolesRouter.post(
  '/',
  authenticate,
  requirePermission('roles:create'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, displayName, description } = createRoleSchema.parse(req.body);

      const result = await pgPool.query(
        `INSERT INTO roles (name, display_name, description)
         VALUES ($1, $2, $3)
         RETURNING id, name, display_name, description, is_system, is_active`,
        [name, displayName, description || null]
      );

      const authReq = req as AuthenticatedRequest;
      logger.info(
        { roleId: result.rows[0].id, roleName: name, createdBy: authReq.user!.id },
        'Role created'
      );

      res.status(201).json({
        success: true,
        data: {
          id: result.rows[0].id,
          name: result.rows[0].name,
          displayName: result.rows[0].display_name,
          description: result.rows[0].description,
          isSystem: result.rows[0].is_system,
          isActive: result.rows[0].is_active,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(createError('Invalid input', 400));
      }
      next(error);
    }
  }
);

/**
 * GET /api/roles/:roleId - Get role details
 */
rolesRouter.get(
  '/:roleId',
  authenticate,
  requirePermission('roles:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { roleId } = req.params;

      const result = await pgPool.query(
        `SELECT id, name, display_name, description, is_system, is_active
         FROM roles WHERE id = $1`,
        [roleId]
      );

      if (result.rows.length === 0) {
        return next(createError('Role not found', 404));
      }

      const role = result.rows[0];
      const permissions = await getRolePermissions(role.name);

      res.json({
        success: true,
        data: {
          id: role.id,
          name: role.name,
          displayName: role.display_name,
          description: role.description,
          isSystem: role.is_system,
          isActive: role.is_active,
          permissions,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/roles/:roleId - Update role
 */
rolesRouter.put(
  '/:roleId',
  authenticate,
  requirePermission('roles:update'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { roleId } = req.params;
      const { displayName, description } = req.body;

      // Check if role exists and is not a system role
      const checkResult = await pgPool.query(
        'SELECT is_system FROM roles WHERE id = $1',
        [roleId]
      );

      if (checkResult.rows.length === 0) {
        return next(createError('Role not found', 404));
      }

      if (checkResult.rows[0].is_system) {
        return next(createError('Cannot modify system roles', 403));
      }

      const result = await pgPool.query(
        `UPDATE roles
         SET display_name = COALESCE($1, display_name),
             description = COALESCE($2, description),
             updated_at = NOW()
         WHERE id = $3
         RETURNING id, name, display_name, description, is_system, is_active`,
        [displayName, description, roleId]
      );

      res.json({
        success: true,
        data: {
          id: result.rows[0].id,
          name: result.rows[0].name,
          displayName: result.rows[0].display_name,
          description: result.rows[0].description,
          isSystem: result.rows[0].is_system,
          isActive: result.rows[0].is_active,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/roles/:roleId - Delete role
 */
rolesRouter.delete(
  '/:roleId',
  authenticate,
  requirePermission('roles:delete'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { roleId } = req.params;

      // Check if role is a system role
      const checkResult = await pgPool.query(
        'SELECT is_system, name FROM roles WHERE id = $1',
        [roleId]
      );

      if (checkResult.rows.length === 0) {
        return next(createError('Role not found', 404));
      }

      if (checkResult.rows[0].is_system) {
        return next(createError('Cannot delete system roles', 403));
      }

      await pgPool.query('DELETE FROM roles WHERE id = $1', [roleId]);

      const authReq = req as AuthenticatedRequest;
      logger.info(
        { roleId, roleName: checkResult.rows[0].name, deletedBy: authReq.user!.id },
        'Role deleted'
      );

      res.json({ success: true, message: 'Role deleted' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/roles/:roleId/permissions - Get role permissions
 */
rolesRouter.get(
  '/:roleId/permissions',
  authenticate,
  requirePermission('roles:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { roleId } = req.params;

      const roleResult = await pgPool.query(
        'SELECT name FROM roles WHERE id = $1',
        [roleId]
      );

      if (roleResult.rows.length === 0) {
        return next(createError('Role not found', 404));
      }

      const permissions = await getRolePermissions(roleResult.rows[0].name);

      res.json({ success: true, data: permissions });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/roles/:roleId/permissions - Update role permissions
 */
rolesRouter.put(
  '/:roleId/permissions',
  authenticate,
  requirePermission('roles:update'),
  async (req: Request, res: Response, next: NextFunction) => {
    const client = await pgPool.connect();

    try {
      const { roleId } = req.params;
      const { permissions } = updateRolePermissionsSchema.parse(req.body);

      // Check if role is a system role
      const roleResult = await client.query(
        'SELECT is_system, name FROM roles WHERE id = $1',
        [roleId]
      );

      if (roleResult.rows.length === 0) {
        return next(createError('Role not found', 404));
      }

      // Allow updating system role permissions (except system_admin which has all)
      if (roleResult.rows[0].name === 'system_admin') {
        return next(createError('Cannot modify system_admin permissions', 403));
      }

      await client.query('BEGIN');

      // Remove existing permissions
      await client.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);

      // Add new permissions
      if (permissions.length > 0) {
        const permissionResult = await client.query(
          'SELECT id FROM permissions WHERE name = ANY($1)',
          [permissions]
        );

        for (const perm of permissionResult.rows) {
          await client.query(
            'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)',
            [roleId, perm.id]
          );
        }
      }

      await client.query('COMMIT');

      const authReq = req as AuthenticatedRequest;
      logger.info(
        { roleId, roleName: roleResult.rows[0].name, permissions, updatedBy: authReq.user!.id },
        'Role permissions updated'
      );

      res.json({ success: true, data: permissions });
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof z.ZodError) {
        return next(createError('Invalid input', 400));
      }
      next(error);
    } finally {
      client.release();
    }
  }
);

// =============================================
// Permission Routes
// =============================================

/**
 * GET /api/permissions - List all permissions
 */
rolesRouter.get(
  '/permissions/all',
  authenticate,
  requirePermission('roles:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const permissions = await getAllPermissions();
      res.json({ success: true, data: permissions });
    } catch (error) {
      next(error);
    }
  }
);

// =============================================
// User Role Assignment Routes
// =============================================

/**
 * GET /api/users/:userId/roles - Get user's roles
 */
rolesRouter.get(
  '/users/:userId/roles',
  authenticate,
  requirePermission('roles:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const roles = await getUserRoles(userId);
      res.json({ success: true, data: roles });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/users/:userId/permissions - Get user's permissions
 */
rolesRouter.get(
  '/users/:userId/permissions',
  authenticate,
  requirePermission('roles:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const permissions = await getUserPermissions(userId);
      res.json({ success: true, data: permissions });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/users/:userId/roles - Assign roles to user
 */
rolesRouter.put(
  '/users/:userId/roles',
  authenticate,
  requirePermission('roles:assign'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const authReq = req as AuthenticatedRequest;
      const { roles } = assignRolesSchema.parse(req.body);

      // Prevent self-demotion from admin
      if (userId === authReq.user!.id) {
        const currentRoles = await getUserRoles(userId);
        if (currentRoles.includes('system_admin') && !roles.includes('system_admin')) {
          return next(createError('Cannot remove your own admin role', 403));
        }
      }

      await assignRolesToUser(userId, roles, authReq.user!.id);

      res.json({ success: true, data: roles });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(createError('Invalid input. Provide an array of role names.', 400));
      }
      next(error);
    }
  }
);

/**
 * POST /api/users/:userId/roles/:roleName - Add a role to user
 */
rolesRouter.post(
  '/users/:userId/roles/:roleName',
  authenticate,
  requirePermission('roles:assign'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, roleName } = req.params;
      const authReq = req as AuthenticatedRequest;

      const success = await addRoleToUser(userId, roleName, authReq.user!.id);

      if (!success) {
        return next(createError('Role not found', 404));
      }

      res.json({ success: true, message: `Role ${roleName} added to user` });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/users/:userId/roles/:roleName - Remove a role from user
 */
rolesRouter.delete(
  '/users/:userId/roles/:roleName',
  authenticate,
  requirePermission('roles:assign'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, roleName } = req.params;
      const authReq = req as AuthenticatedRequest;

      // Prevent self-demotion from admin
      if (userId === authReq.user!.id && roleName === 'system_admin') {
        return next(createError('Cannot remove your own admin role', 403));
      }

      const success = await removeRoleFromUser(userId, roleName);

      if (!success) {
        return next(createError('User does not have this role', 404));
      }

      logger.info(
        { userId, roleName, removedBy: authReq.user!.id },
        'Role removed from user'
      );

      res.json({ success: true, message: `Role ${roleName} removed from user` });
    } catch (error) {
      next(error);
    }
  }
);
