/**
 * Unit Tests for RBAC Service
 * Tests role-based access control with caching
 */

// Mock database and cache modules before importing the service
jest.mock('../../config/database', () => ({
  pgPool: {
    query: jest.fn(),
    connect: jest.fn(),
  },
  redis: {
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
  },
}));

jest.mock('../../config/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import {
  getUserPermissions,
  getUserRoles,
  getUserRoleInfo,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasRole,
  hasAnyRole,
  invalidateUserCache,
  assignRolesToUser,
  addRoleToUser,
  removeRoleFromUser,
  getAllRoles,
  getAllPermissions,
  getRolePermissions,
  assignDefaultRole,
} from '../../services/rbac';
import { pgPool, redis } from '../../config/database';
import { logger } from '../../config/logger';

describe('RBAC Service', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserPermissions', () => {
    it('should return cached permissions when available', async () => {
      const cachedPermissions = ['patients:read', 'records:read'];
      (redis.get as jest.Mock).mockResolvedValue(JSON.stringify(cachedPermissions));

      const result = await getUserPermissions(mockUserId);

      expect(result).toEqual(cachedPermissions);
      expect(pgPool.query).not.toHaveBeenCalled();
    });

    it('should query database when cache is empty', async () => {
      const dbPermissions = [{ name: 'patients:read' }, { name: 'records:read' }];
      (redis.get as jest.Mock).mockResolvedValue(null);
      (pgPool.query as jest.Mock).mockResolvedValue({ rows: dbPermissions });

      const result = await getUserPermissions(mockUserId);

      expect(result).toEqual(['patients:read', 'records:read']);
      expect(pgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT DISTINCT p.name'),
        [mockUserId]
      );
    });

    it('should cache database results', async () => {
      const dbPermissions = [{ name: 'patients:read' }];
      (redis.get as jest.Mock).mockResolvedValue(null);
      (pgPool.query as jest.Mock).mockResolvedValue({ rows: dbPermissions });

      await getUserPermissions(mockUserId);

      expect(redis.setex).toHaveBeenCalledWith(
        `rbac:permissions:${mockUserId}`,
        300, // 5 minute TTL
        JSON.stringify(['patients:read'])
      );
    });

    it('should return empty array on database error', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);
      (pgPool.query as jest.Mock).mockRejectedValue(new Error('Connection failed'));

      const result = await getUserPermissions(mockUserId);

      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ userId: mockUserId }),
        'Failed to get user permissions'
      );
    });

    it('should work when Redis is unavailable', async () => {
      // Simulate Redis being null/undefined
      const originalRedis = redis;
      Object.defineProperty(require('../../config/database'), 'redis', { value: null });

      const dbPermissions = [{ name: 'llm:use' }];
      (pgPool.query as jest.Mock).mockResolvedValue({ rows: dbPermissions });

      // Re-import to get fresh module
      jest.resetModules();

      // Restore for other tests
      Object.defineProperty(require('../../config/database'), 'redis', { value: originalRedis });
    });
  });

  describe('getUserRoles', () => {
    it('should return cached roles when available', async () => {
      const cachedRoles = ['physician', 'admin'];
      (redis.get as jest.Mock).mockResolvedValue(JSON.stringify(cachedRoles));

      const result = await getUserRoles(mockUserId);

      expect(result).toEqual(cachedRoles);
      expect(pgPool.query).not.toHaveBeenCalled();
    });

    it('should query database when cache is empty', async () => {
      const dbRoles = [{ name: 'physician' }, { name: 'user' }];
      (redis.get as jest.Mock).mockResolvedValue(null);
      (pgPool.query as jest.Mock).mockResolvedValue({ rows: dbRoles });

      const result = await getUserRoles(mockUserId);

      expect(result).toEqual(['physician', 'user']);
      expect(pgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT r.name'),
        [mockUserId]
      );
    });

    it('should only return active roles', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);
      (pgPool.query as jest.Mock).mockResolvedValue({ rows: [{ name: 'active_role' }] });

      await getUserRoles(mockUserId);

      const queryCall = (pgPool.query as jest.Mock).mock.calls[0][0];
      expect(queryCall).toContain('is_active = true');
    });

    it('should cache database results', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);
      (pgPool.query as jest.Mock).mockResolvedValue({ rows: [{ name: 'nurse' }] });

      await getUserRoles(mockUserId);

      expect(redis.setex).toHaveBeenCalledWith(
        `rbac:roles:${mockUserId}`,
        300,
        JSON.stringify(['nurse'])
      );
    });

    it('should return empty array on error', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);
      (pgPool.query as jest.Mock).mockRejectedValue(new Error('Query failed'));

      const result = await getUserRoles(mockUserId);

      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getUserRoleInfo', () => {
    it('should return both roles and permissions', async () => {
      (redis.get as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify(['physician']))
        .mockResolvedValueOnce(JSON.stringify(['patients:read']));

      const result = await getUserRoleInfo(mockUserId);

      expect(result).toEqual({
        roles: ['physician'],
        permissions: ['patients:read'],
      });
    });

    it('should fetch both concurrently', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);
      (pgPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ name: 'user' }] })
        .mockResolvedValueOnce({ rows: [{ name: 'records:read' }] });

      await getUserRoleInfo(mockUserId);

      // Both should be queried
      expect(pgPool.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('hasPermission', () => {
    it('should return true when user has the permission', async () => {
      (redis.get as jest.Mock).mockResolvedValue(JSON.stringify(['patients:read', 'records:read']));

      const result = await hasPermission(mockUserId, 'patients:read');

      expect(result).toBe(true);
    });

    it('should return false when user lacks the permission', async () => {
      (redis.get as jest.Mock).mockResolvedValue(JSON.stringify(['patients:read']));

      const result = await hasPermission(mockUserId, 'admin:all');

      expect(result).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true when user has at least one permission', async () => {
      (redis.get as jest.Mock).mockResolvedValue(JSON.stringify(['patients:read']));

      const result = await hasAnyPermission(mockUserId, ['admin:all', 'patients:read']);

      expect(result).toBe(true);
    });

    it('should return false when user has none of the permissions', async () => {
      (redis.get as jest.Mock).mockResolvedValue(JSON.stringify(['records:read']));

      const result = await hasAnyPermission(mockUserId, ['admin:all', 'users:delete']);

      expect(result).toBe(false);
    });

    it('should return false for empty permission list', async () => {
      (redis.get as jest.Mock).mockResolvedValue(JSON.stringify(['patients:read']));

      const result = await hasAnyPermission(mockUserId, []);

      expect(result).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true when user has all permissions', async () => {
      (redis.get as jest.Mock).mockResolvedValue(
        JSON.stringify(['patients:read', 'records:read', 'llm:use'])
      );

      const result = await hasAllPermissions(mockUserId, ['patients:read', 'llm:use']);

      expect(result).toBe(true);
    });

    it('should return false when user is missing any permission', async () => {
      (redis.get as jest.Mock).mockResolvedValue(JSON.stringify(['patients:read']));

      const result = await hasAllPermissions(mockUserId, ['patients:read', 'admin:all']);

      expect(result).toBe(false);
    });

    it('should return true for empty permission list', async () => {
      (redis.get as jest.Mock).mockResolvedValue(JSON.stringify(['patients:read']));

      const result = await hasAllPermissions(mockUserId, []);

      expect(result).toBe(true);
    });
  });

  describe('hasRole', () => {
    it('should return true when user has the role', async () => {
      (redis.get as jest.Mock).mockResolvedValue(JSON.stringify(['physician', 'user']));

      const result = await hasRole(mockUserId, 'physician');

      expect(result).toBe(true);
    });

    it('should return false when user lacks the role', async () => {
      (redis.get as jest.Mock).mockResolvedValue(JSON.stringify(['user']));

      const result = await hasRole(mockUserId, 'admin');

      expect(result).toBe(false);
    });
  });

  describe('hasAnyRole', () => {
    it('should return true when user has at least one role', async () => {
      (redis.get as jest.Mock).mockResolvedValue(JSON.stringify(['nurse']));

      const result = await hasAnyRole(mockUserId, ['physician', 'nurse']);

      expect(result).toBe(true);
    });

    it('should return false when user has none of the roles', async () => {
      (redis.get as jest.Mock).mockResolvedValue(JSON.stringify(['patient']));

      const result = await hasAnyRole(mockUserId, ['physician', 'admin']);

      expect(result).toBe(false);
    });
  });

  describe('invalidateUserCache', () => {
    it('should delete both permissions and roles cache', async () => {
      (redis.del as jest.Mock).mockResolvedValue(1);

      await invalidateUserCache(mockUserId);

      expect(redis.del).toHaveBeenCalledWith(`rbac:permissions:${mockUserId}`);
      expect(redis.del).toHaveBeenCalledWith(`rbac:roles:${mockUserId}`);
    });

    it('should log cache invalidation', async () => {
      (redis.del as jest.Mock).mockResolvedValue(1);

      await invalidateUserCache(mockUserId);

      expect(logger.info).toHaveBeenCalledWith(
        { userId: mockUserId },
        'Invalidated RBAC cache for user'
      );
    });

    it('should handle Redis errors gracefully', async () => {
      (redis.del as jest.Mock).mockRejectedValue(new Error('Redis connection lost'));

      await expect(invalidateUserCache(mockUserId)).resolves.not.toThrow();

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ userId: mockUserId }),
        'Failed to invalidate RBAC cache'
      );
    });
  });

  describe('assignRolesToUser', () => {
    const mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    beforeEach(() => {
      (pgPool.connect as jest.Mock).mockResolvedValue(mockClient);
      mockClient.query.mockResolvedValue({ rows: [{ id: 'role-1', name: 'physician' }] });
    });

    it('should use transaction for role assignment', async () => {
      await assignRolesToUser(mockUserId, ['physician'], 'admin-user');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should delete existing roles before assigning new ones', async () => {
      await assignRolesToUser(mockUserId, ['physician'], 'admin-user');

      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM user_roles WHERE user_id = $1',
        [mockUserId]
      );
    });

    it('should rollback on error', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // DELETE
        .mockRejectedValueOnce(new Error('Insert failed')); // roles query

      await expect(
        assignRolesToUser(mockUserId, ['physician'], 'admin-user')
      ).rejects.toThrow('Insert failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should release client connection after completion', async () => {
      await assignRolesToUser(mockUserId, ['physician'], 'admin-user');

      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should invalidate cache after successful assignment', async () => {
      (redis.del as jest.Mock).mockResolvedValue(1);

      await assignRolesToUser(mockUserId, ['physician'], 'admin-user');

      expect(redis.del).toHaveBeenCalled();
    });
  });

  describe('addRoleToUser', () => {
    it('should add a single role to user', async () => {
      (pgPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'role-1' }] }) // role lookup
        .mockResolvedValueOnce({ rowCount: 1 }); // insert

      const result = await addRoleToUser(mockUserId, 'physician', 'admin-user');

      expect(result).toBe(true);
    });

    it('should return false when role does not exist', async () => {
      (pgPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await addRoleToUser(mockUserId, 'nonexistent', 'admin-user');

      expect(result).toBe(false);
    });

    it('should invalidate cache after adding role', async () => {
      (pgPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'role-1' }] })
        .mockResolvedValueOnce({ rowCount: 1 });
      (redis.del as jest.Mock).mockResolvedValue(1);

      await addRoleToUser(mockUserId, 'physician', 'admin-user');

      expect(redis.del).toHaveBeenCalled();
    });
  });

  describe('removeRoleFromUser', () => {
    it('should remove role from user and return true', async () => {
      (pgPool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });
      (redis.del as jest.Mock).mockResolvedValue(1);

      const result = await removeRoleFromUser(mockUserId, 'physician');

      expect(result).toBe(true);
    });

    it('should return false when role was not assigned', async () => {
      (pgPool.query as jest.Mock).mockResolvedValue({ rowCount: 0 });

      const result = await removeRoleFromUser(mockUserId, 'admin');

      expect(result).toBe(false);
    });

    it('should invalidate cache after removal', async () => {
      (pgPool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });
      (redis.del as jest.Mock).mockResolvedValue(1);

      await removeRoleFromUser(mockUserId, 'physician');

      expect(redis.del).toHaveBeenCalled();
    });
  });

  describe('getAllRoles', () => {
    it('should return all active roles', async () => {
      const mockRoles = [
        { id: '1', name: 'admin', display_name: 'Administrator', description: null, is_system: true, is_active: true },
        { id: '2', name: 'user', display_name: 'User', description: 'Regular user', is_system: false, is_active: true },
      ];
      (pgPool.query as jest.Mock).mockResolvedValue({ rows: mockRoles });

      const result = await getAllRoles();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: '1',
        name: 'admin',
        displayName: 'Administrator',
        description: null,
        isSystem: true,
        isActive: true,
      });
    });

    it('should query only active roles', async () => {
      (pgPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      await getAllRoles();

      const queryCall = (pgPool.query as jest.Mock).mock.calls[0][0];
      expect(queryCall).toContain('is_active = true');
    });
  });

  describe('getAllPermissions', () => {
    it('should return all permissions', async () => {
      const mockPermissions = [
        { id: '1', name: 'patients:read', display_name: 'Read Patients', description: null, resource: 'patients', action: 'read' },
      ];
      (pgPool.query as jest.Mock).mockResolvedValue({ rows: mockPermissions });

      const result = await getAllPermissions();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: '1',
        name: 'patients:read',
        displayName: 'Read Patients',
        description: null,
        resource: 'patients',
        action: 'read',
      });
    });

    it('should order by resource and action', async () => {
      (pgPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      await getAllPermissions();

      const queryCall = (pgPool.query as jest.Mock).mock.calls[0][0];
      expect(queryCall).toContain('ORDER BY resource, action');
    });
  });

  describe('getRolePermissions', () => {
    it('should return permissions for a specific role', async () => {
      (pgPool.query as jest.Mock).mockResolvedValue({
        rows: [{ name: 'patients:read' }, { name: 'records:read' }],
      });

      const result = await getRolePermissions('physician');

      expect(result).toEqual(['patients:read', 'records:read']);
    });

    it('should query with role name', async () => {
      (pgPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      await getRolePermissions('admin');

      expect(pgPool.query).toHaveBeenCalledWith(
        expect.any(String),
        ['admin']
      );
    });
  });

  describe('assignDefaultRole', () => {
    it('should assign user role to new users', async () => {
      (pgPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'role-user' }] })
        .mockResolvedValueOnce({ rowCount: 1 });

      await assignDefaultRole(mockUserId);

      expect(pgPool.query).toHaveBeenCalledWith(
        expect.stringContaining("name = 'user'"),
        expect.anything()
      );
    });

    it('should not throw when default role does not exist', async () => {
      (pgPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      await expect(assignDefaultRole(mockUserId)).resolves.not.toThrow();
    });

    it('should log successful assignment', async () => {
      (pgPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'role-user' }] })
        .mockResolvedValueOnce({ rowCount: 1 });

      await assignDefaultRole(mockUserId);

      expect(logger.info).toHaveBeenCalledWith(
        { userId: mockUserId },
        'Assigned default role to user'
      );
    });
  });
});
