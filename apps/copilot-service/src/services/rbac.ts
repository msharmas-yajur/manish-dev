import { pgPool, redis } from '../config/database';
import { logger } from '../config/logger';

const CACHE_TTL = 300; // 5 minutes
const CACHE_PREFIX = 'rbac:';

export interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
}

export interface Permission {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  resource: string;
  action: string;
}

export interface UserRoleInfo {
  roles: string[];
  permissions: string[];
}

/**
 * Get all permissions for a user (with Redis caching)
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  const cacheKey = `${CACHE_PREFIX}permissions:${userId}`;

  try {
    // Try cache first
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    // Query database
    const result = await pgPool.query(
      `SELECT DISTINCT p.name
       FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       JOIN user_roles ur ON rp.role_id = ur.role_id
       WHERE ur.user_id = $1`,
      [userId]
    );

    const permissions = result.rows.map((row) => row.name);

    // Cache result
    if (redis) {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(permissions));
    }

    return permissions;
  } catch (error) {
    logger.error({ error, userId }, 'Failed to get user permissions');
    return [];
  }
}

/**
 * Get all roles for a user
 */
export async function getUserRoles(userId: string): Promise<string[]> {
  const cacheKey = `${CACHE_PREFIX}roles:${userId}`;

  try {
    // Try cache first
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    // Query database
    const result = await pgPool.query(
      `SELECT r.name
       FROM roles r
       JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = $1 AND r.is_active = true`,
      [userId]
    );

    const roles = result.rows.map((row) => row.name);

    // Cache result
    if (redis) {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(roles));
    }

    return roles;
  } catch (error) {
    logger.error({ error, userId }, 'Failed to get user roles');
    return [];
  }
}

/**
 * Get both roles and permissions for a user
 */
export async function getUserRoleInfo(userId: string): Promise<UserRoleInfo> {
  const [roles, permissions] = await Promise.all([
    getUserRoles(userId),
    getUserPermissions(userId),
  ]);

  return { roles, permissions };
}

/**
 * Check if user has a specific permission
 */
export async function hasPermission(
  userId: string,
  permission: string
): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  return permissions.includes(permission);
}

/**
 * Check if user has any of the specified permissions
 */
export async function hasAnyPermission(
  userId: string,
  permissionList: string[]
): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  return permissionList.some((p) => permissions.includes(p));
}

/**
 * Check if user has all of the specified permissions
 */
export async function hasAllPermissions(
  userId: string,
  permissionList: string[]
): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  return permissionList.every((p) => permissions.includes(p));
}

/**
 * Check if user has a specific role
 */
export async function hasRole(userId: string, role: string): Promise<boolean> {
  const roles = await getUserRoles(userId);
  return roles.includes(role);
}

/**
 * Check if user has any of the specified roles
 */
export async function hasAnyRole(
  userId: string,
  roleList: string[]
): Promise<boolean> {
  const roles = await getUserRoles(userId);
  return roleList.some((r) => roles.includes(r));
}

/**
 * Invalidate user's RBAC cache (call after role changes)
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  if (!redis) return;

  try {
    await Promise.all([
      redis.del(`${CACHE_PREFIX}permissions:${userId}`),
      redis.del(`${CACHE_PREFIX}roles:${userId}`),
    ]);
    logger.info({ userId }, 'Invalidated RBAC cache for user');
  } catch (error) {
    logger.error({ error, userId }, 'Failed to invalidate RBAC cache');
  }
}

/**
 * Assign roles to a user
 */
export async function assignRolesToUser(
  userId: string,
  roleNames: string[],
  assignedBy: string
): Promise<void> {
  const client = await pgPool.connect();

  try {
    await client.query('BEGIN');

    // Remove existing roles
    await client.query('DELETE FROM user_roles WHERE user_id = $1', [userId]);

    // Get role IDs
    const rolesResult = await client.query(
      'SELECT id, name FROM roles WHERE name = ANY($1) AND is_active = true',
      [roleNames]
    );

    // Insert new role assignments
    for (const role of rolesResult.rows) {
      await client.query(
        `INSERT INTO user_roles (user_id, role_id, assigned_by)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [userId, role.id, assignedBy]
      );
    }

    await client.query('COMMIT');

    // Invalidate cache
    await invalidateUserCache(userId);

    logger.info({ userId, roles: roleNames, assignedBy }, 'Assigned roles to user');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error({ error, userId, roleNames }, 'Failed to assign roles');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Add a single role to a user
 */
export async function addRoleToUser(
  userId: string,
  roleName: string,
  assignedBy: string
): Promise<boolean> {
  try {
    const roleResult = await pgPool.query(
      'SELECT id FROM roles WHERE name = $1 AND is_active = true',
      [roleName]
    );

    if (roleResult.rows.length === 0) {
      return false;
    }

    await pgPool.query(
      `INSERT INTO user_roles (user_id, role_id, assigned_by)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [userId, roleResult.rows[0].id, assignedBy]
    );

    await invalidateUserCache(userId);
    return true;
  } catch (error) {
    logger.error({ error, userId, roleName }, 'Failed to add role to user');
    throw error;
  }
}

/**
 * Remove a role from a user
 */
export async function removeRoleFromUser(
  userId: string,
  roleName: string
): Promise<boolean> {
  try {
    const result = await pgPool.query(
      `DELETE FROM user_roles
       WHERE user_id = $1
       AND role_id = (SELECT id FROM roles WHERE name = $2)`,
      [userId, roleName]
    );

    await invalidateUserCache(userId);
    return result.rowCount !== null && result.rowCount > 0;
  } catch (error) {
    logger.error({ error, userId, roleName }, 'Failed to remove role from user');
    throw error;
  }
}

/**
 * Get all available roles
 */
export async function getAllRoles(): Promise<Role[]> {
  const result = await pgPool.query(
    `SELECT id, name, display_name, description, is_system, is_active
     FROM roles
     WHERE is_active = true
     ORDER BY name`
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    displayName: row.display_name,
    description: row.description,
    isSystem: row.is_system,
    isActive: row.is_active,
  }));
}

/**
 * Get all available permissions
 */
export async function getAllPermissions(): Promise<Permission[]> {
  const result = await pgPool.query(
    `SELECT id, name, display_name, description, resource, action
     FROM permissions
     ORDER BY resource, action`
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    displayName: row.display_name,
    description: row.description,
    resource: row.resource,
    action: row.action,
  }));
}

/**
 * Get permissions for a specific role
 */
export async function getRolePermissions(roleName: string): Promise<string[]> {
  const result = await pgPool.query(
    `SELECT p.name
     FROM permissions p
     JOIN role_permissions rp ON p.id = rp.permission_id
     JOIN roles r ON rp.role_id = r.id
     WHERE r.name = $1`,
    [roleName]
  );

  return result.rows.map((row) => row.name);
}

/**
 * Assign default role to new user
 */
export async function assignDefaultRole(userId: string): Promise<void> {
  try {
    const roleResult = await pgPool.query(
      "SELECT id FROM roles WHERE name = 'user' AND is_active = true"
    );

    if (roleResult.rows.length > 0) {
      await pgPool.query(
        `INSERT INTO user_roles (user_id, role_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [userId, roleResult.rows[0].id]
      );
      logger.info({ userId }, 'Assigned default role to user');
    }
  } catch (error) {
    logger.error({ error, userId }, 'Failed to assign default role');
  }
}
