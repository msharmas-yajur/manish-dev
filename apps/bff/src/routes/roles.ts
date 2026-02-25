import { Router, Request, Response, NextFunction } from 'express';
import type { Router as RouterType } from 'express';
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

export const rolesRouter: RouterType = Router();

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
 * @swagger
 * /roles:
 *   get:
 *     summary: List all roles
 *     description: Returns a list of all roles in the system.
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of roles retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                         example: admin
 *                       displayName:
 *                         type: string
 *                         example: Administrator
 *                       description:
 *                         type: string
 *                       isSystem:
 *                         type: boolean
 *                       isActive:
 *                         type: boolean
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Missing required permission (roles:read)
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
 * @swagger
 * /roles:
 *   post:
 *     summary: Create a new role
 *     description: Creates a new role with the specified name, display name, and optional description.
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, displayName]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *                 pattern: ^[a-z_]+$
 *                 description: Role name (lowercase letters and underscores only)
 *                 example: content_editor
 *               displayName:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: Content Editor
 *               description:
 *                 type: string
 *                 example: Can create and edit content
 *     responses:
 *       201:
 *         description: Role created successfully
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
 *                     name:
 *                       type: string
 *                     displayName:
 *                       type: string
 *                     description:
 *                       type: string
 *                     isSystem:
 *                       type: boolean
 *                     isActive:
 *                       type: boolean
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Missing required permission (roles:create)
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
 * @swagger
 * /roles/{roleId}:
 *   get:
 *     summary: Get role details
 *     description: Returns detailed information about a specific role, including its permissions.
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique identifier of the role
 *     responses:
 *       200:
 *         description: Role details retrieved successfully
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
 *                     name:
 *                       type: string
 *                     displayName:
 *                       type: string
 *                     description:
 *                       type: string
 *                     isSystem:
 *                       type: boolean
 *                     isActive:
 *                       type: boolean
 *                     permissions:
 *                       type: array
 *                       items:
 *                         type: string
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Missing required permission (roles:read)
 *       404:
 *         description: Role not found
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
 * @swagger
 * /roles/{roleId}:
 *   put:
 *     summary: Update role
 *     description: Updates a role's display name and/or description. System roles cannot be modified.
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique identifier of the role
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               displayName:
 *                 type: string
 *                 example: Updated Display Name
 *               description:
 *                 type: string
 *                 example: Updated description
 *     responses:
 *       200:
 *         description: Role updated successfully
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
 *                     name:
 *                       type: string
 *                     displayName:
 *                       type: string
 *                     description:
 *                       type: string
 *                     isSystem:
 *                       type: boolean
 *                     isActive:
 *                       type: boolean
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Missing required permission (roles:update) or attempting to modify a system role
 *       404:
 *         description: Role not found
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
 * @swagger
 * /roles/{roleId}:
 *   delete:
 *     summary: Delete role
 *     description: Deletes a role from the system. System roles cannot be deleted.
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique identifier of the role
 *     responses:
 *       200:
 *         description: Role deleted successfully
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
 *                   example: Role deleted
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Missing required permission (roles:delete) or attempting to delete a system role
 *       404:
 *         description: Role not found
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
 * @swagger
 * /roles/{roleId}/permissions:
 *   get:
 *     summary: Get role permissions
 *     description: Returns the list of permissions assigned to a specific role.
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique identifier of the role
 *     responses:
 *       200:
 *         description: Role permissions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["users:read", "users:update", "roles:read"]
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Missing required permission (roles:read)
 *       404:
 *         description: Role not found
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
 * @swagger
 * /roles/{roleId}/permissions:
 *   put:
 *     summary: Update role permissions
 *     description: Replaces all permissions for a role with the provided list. The system_admin role's permissions cannot be modified.
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique identifier of the role
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [permissions]
 *             properties:
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["users:read", "users:update", "roles:read"]
 *     responses:
 *       200:
 *         description: Role permissions updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["users:read", "users:update", "roles:read"]
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Missing required permission (roles:update) or attempting to modify system_admin permissions
 *       404:
 *         description: Role not found
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
 * @swagger
 * /roles/permissions/all:
 *   get:
 *     summary: List all permissions
 *     description: Returns a list of all available permissions in the system.
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of permissions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                         example: users:read
 *                       displayName:
 *                         type: string
 *                         example: Read Users
 *                       description:
 *                         type: string
 *                       category:
 *                         type: string
 *                         example: users
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Missing required permission (roles:read)
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
 * @swagger
 * /roles/users/{userId}/roles:
 *   get:
 *     summary: Get user's roles
 *     description: Returns the list of roles assigned to a specific user.
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique identifier of the user
 *     responses:
 *       200:
 *         description: User roles retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["user", "content_editor"]
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Missing required permission (roles:read)
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
 * @swagger
 * /roles/users/{userId}/permissions:
 *   get:
 *     summary: Get user's permissions
 *     description: Returns the list of all permissions a user has through their assigned roles.
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique identifier of the user
 *     responses:
 *       200:
 *         description: User permissions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["users:read", "users:update", "patients:read"]
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Missing required permission (roles:read)
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
 * @swagger
 * /roles/users/{userId}/roles:
 *   put:
 *     summary: Assign roles to user
 *     description: Replaces all roles for a user with the provided list. Users cannot remove their own admin role.
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique identifier of the user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [roles]
 *             properties:
 *               roles:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *                 example: ["user", "content_editor"]
 *     responses:
 *       200:
 *         description: User roles updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["user", "content_editor"]
 *       400:
 *         description: Invalid input - Provide an array of role names
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Missing required permission (roles:assign) or attempting self-demotion from admin
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
 * @swagger
 * /roles/users/{userId}/roles/{roleName}:
 *   post:
 *     summary: Add a role to user
 *     description: Adds a specific role to a user without affecting their other roles.
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique identifier of the user
 *       - in: path
 *         name: roleName
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the role to add
 *         example: content_editor
 *     responses:
 *       200:
 *         description: Role added to user successfully
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
 *                   example: Role content_editor added to user
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Missing required permission (roles:assign)
 *       404:
 *         description: Role not found
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
 * @swagger
 * /roles/users/{userId}/roles/{roleName}:
 *   delete:
 *     summary: Remove a role from user
 *     description: Removes a specific role from a user. Users cannot remove their own admin role.
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique identifier of the user
 *       - in: path
 *         name: roleName
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the role to remove
 *         example: content_editor
 *     responses:
 *       200:
 *         description: Role removed from user successfully
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
 *                   example: Role content_editor removed from user
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Missing required permission (roles:assign) or attempting to remove own admin role
 *       404:
 *         description: User does not have this role
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
