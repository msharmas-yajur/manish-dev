/**
 * Layout Components Index
 *
 * Exports all layout components for Caladrius Health AI Studio
 */

// Legacy components (kept for backward compatibility)
export { Navbar } from './Navbar';
export { Sidebar, SIDEBAR_WIDTH } from './Sidebar';
export { UserMenu } from './UserMenu';

// New Phase 2 Layout Components

// Main layout wrapper
export { MainLayout } from './MainLayout';
export { default as MainLayoutDefault } from './MainLayout';

// Top AppBar
export { AppBar } from './AppBar';
export { default as AppBarDefault } from './AppBar';

// Left Navigation
export { LeftRail } from './LeftRail';
export { default as LeftRailDefault } from './LeftRail';
export { LeftDrawer } from './LeftDrawer';
export { default as LeftDrawerDefault } from './LeftDrawer';

// Right Tools Panel
export { RightRail } from './RightRail';
export { default as RightRailDefault } from './RightRail';
export { RightPanel } from './RightPanel';
export { default as RightPanelDefault } from './RightPanel';

// Re-export navigation config for convenience
export {
  navigationItems,
  getFilteredNavItems,
  getNavItemById,
  getNavItemByPath,
  type NavItem,
} from './config/navigationConfig';
