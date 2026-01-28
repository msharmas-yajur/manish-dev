import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  CalendarMonth as CalendarMonthIcon,
  Description as DescriptionIcon,
  Medication as MedicationIcon,
  Receipt as ReceiptIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import {
  useLayout,
  LEFT_RAIL_WIDTH,
  LEFT_DRAWER_WIDTH,
  APPBAR_HEIGHT,
} from '../../contexts/LayoutContext';
import {
  getFilteredNavItems,
  type NavItem,
} from './config/navigationConfig';

/**
 * Icon mapping from string icon names to MUI icon components
 */
const iconMap: Record<string, React.ReactElement> = {
  Dashboard: <DashboardIcon />,
  People: <PeopleIcon />,
  CalendarMonth: <CalendarMonthIcon />,
  Description: <DescriptionIcon />,
  Medication: <MedicationIcon />,
  Receipt: <ReceiptIcon />,
  AdminPanelSettings: <AdminPanelSettingsIcon />,
  Settings: <SettingsIcon />,
};

/**
 * Get icon component by name
 */
function getIcon(iconName: string): React.ReactElement {
  return iconMap[iconName] || <DashboardIcon />;
}

/**
 * LeftDrawer component - Expandable navigation drawer
 *
 * Features:
 * - Slides out from left rail when expanded (180px wide)
 * - Shows full navigation labels alongside icons
 * - Filters items by user role using getFilteredNavItems
 * - Persistent drawer (pushes content)
 */
export function LeftDrawer() {
  const { leftDrawerOpen } = useLayout();
  const navigate = useNavigate();
  const location = useLocation();

  // TODO: Get actual user permissions and roles from auth context
  // For now, showing all items (empty arrays = no filtering)
  const userPermissions: string[] = [
    'patients:read',
    'appointments:read',
    'records:read',
    'prescriptions:read',
    'billing:read',
    'users:read',
  ];
  const userRoles: string[] = ['physician'];

  // Get filtered navigation items based on user permissions
  const filteredNavItems = getFilteredNavItems(userPermissions, userRoles);

  // Handle navigation item click
  const handleNavClick = useCallback(
    (item: NavItem) => {
      navigate(item.path);
    },
    [navigate]
  );

  // Check if a nav item is active
  const isActive = useCallback(
    (path: string) => {
      return location.pathname === path || location.pathname.startsWith(`${path}/`);
    },
    [location.pathname]
  );

  return (
    <Drawer
      variant="persistent"
      anchor="left"
      open={leftDrawerOpen}
      sx={{
        width: leftDrawerOpen ? LEFT_DRAWER_WIDTH : 0,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: LEFT_DRAWER_WIDTH,
          boxSizing: 'border-box',
          left: LEFT_RAIL_WIDTH,
          top: APPBAR_HEIGHT,
          height: `calc(100% - ${APPBAR_HEIGHT}px)`,
          borderRight: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          transition: (theme) =>
            theme.transitions.create(['transform', 'width'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
        },
      }}
    >
      {/* Drawer Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          height: 56,
          px: 2,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 600,
            color: 'text.secondary',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontSize: '0.75rem',
          }}
        >
          Navigation
        </Typography>
      </Box>

      {/* Navigation items */}
      <List
        sx={{
          flex: 1,
          py: 1,
          px: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          '&::-webkit-scrollbar': {
            width: 4,
          },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: 'divider',
            borderRadius: 2,
          },
        }}
        component="nav"
        aria-label="Main navigation"
      >
        {filteredNavItems.map((item) => {
          const active = isActive(item.path);
          return (
            <ListItemButton
              key={item.id}
              onClick={() => handleNavClick(item)}
              selected={active}
              sx={{
                minHeight: 44,
                px: 1.5,
                my: 0.5,
                borderRadius: 1.5,
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'primary.contrastText',
                  },
                },
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
              aria-current={active ? 'page' : undefined}
            >
              <ListItemIcon
                sx={{
                  minWidth: 36,
                  color: active ? 'inherit' : 'text.secondary',
                }}
              >
                {getIcon(item.icon)}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  variant: 'body2',
                  fontWeight: active ? 600 : 400,
                  noWrap: true,
                }}
              />
            </ListItemButton>
          );
        })}
      </List>
    </Drawer>
  );
}

export default LeftDrawer;
