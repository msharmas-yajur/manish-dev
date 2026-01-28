/**
 * Navigation Configuration for Caladrius Health AI Studio
 *
 * Defines the main navigation structure and permission-based filtering
 * for the application sidebar/navigation menu.
 */

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  requiredPermissions?: string[];
  requiredRoles?: string[];
}

/**
 * Main navigation items for the application.
 * Items are displayed in the order defined here.
 */
export const navigationItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: 'Dashboard',
  },
  {
    id: 'patients',
    label: 'Patients',
    path: '/patients',
    icon: 'People',
    requiredPermissions: ['patients:read'],
  },
  {
    id: 'appointments',
    label: 'Appointments',
    path: '/appointments',
    icon: 'CalendarMonth',
    requiredPermissions: ['appointments:read'],
  },
  {
    id: 'records',
    label: 'Medical Records',
    path: '/records',
    icon: 'Description',
    requiredPermissions: ['records:read'],
  },
  {
    id: 'prescriptions',
    label: 'Prescriptions',
    path: '/prescriptions',
    icon: 'Medication',
    requiredPermissions: ['prescriptions:read'],
  },
  {
    id: 'billing',
    label: 'Billing',
    path: '/billing',
    icon: 'Receipt',
    requiredPermissions: ['billing:read'],
  },
  {
    id: 'users',
    label: 'User Management',
    path: '/users',
    icon: 'AdminPanelSettings',
    requiredPermissions: ['users:read'],
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: 'Settings',
  },
];

/**
 * Filters navigation items based on user permissions and roles.
 *
 * @param userPermissions - Array of permission strings the user has
 * @param userRoles - Array of role strings the user has
 * @returns Filtered array of NavItems the user can access
 *
 * @example
 * const items = getFilteredNavItems(['patients:read', 'appointments:read'], ['doctor']);
 */
export function getFilteredNavItems(
  userPermissions: string[],
  userRoles: string[]
): NavItem[] {
  return navigationItems.filter((item) => {
    // Check if user has any of the required permissions
    if (item.requiredPermissions && item.requiredPermissions.length > 0) {
      const hasPermission = item.requiredPermissions.some((permission) =>
        userPermissions.includes(permission)
      );
      if (!hasPermission) {
        return false;
      }
    }

    // Check if user has any of the required roles
    if (item.requiredRoles && item.requiredRoles.length > 0) {
      const hasRole = item.requiredRoles.some((role) =>
        userRoles.includes(role)
      );
      if (!hasRole) {
        return false;
      }
    }

    // Item is accessible if no requirements or all requirements met
    return true;
  });
}

/**
 * Gets a navigation item by its ID.
 *
 * @param id - The unique identifier of the navigation item
 * @returns The NavItem if found, undefined otherwise
 */
export function getNavItemById(id: string): NavItem | undefined {
  return navigationItems.find((item) => item.id === id);
}

/**
 * Gets a navigation item by its path.
 *
 * @param path - The route path of the navigation item
 * @returns The NavItem if found, undefined otherwise
 */
export function getNavItemByPath(path: string): NavItem | undefined {
  return navigationItems.find((item) => item.path === path);
}
