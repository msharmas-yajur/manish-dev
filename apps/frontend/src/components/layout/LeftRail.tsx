import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  Menu as MenuIcon,
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
  APPBAR_HEIGHT,
} from '../../contexts/LayoutContext';
import { navigationItems, type NavItem } from './config/navigationConfig';

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
 * LeftRail component - Vertical navigation rail on the left side
 *
 * Features:
 * - Fixed 56px wide vertical rail
 * - Shows icons only from navigationConfig
 * - Hamburger menu at top to toggle drawer
 * - Clicking icon opens drawer AND navigates to route
 * - Tooltips show full labels on hover
 */
export function LeftRail() {
  const { toggleLeftDrawer, openLeftDrawer } = useLayout();
  const navigate = useNavigate();
  const location = useLocation();

  // Handle navigation item click
  const handleNavClick = useCallback(
    (item: NavItem) => {
      openLeftDrawer(); // Open drawer when clicking nav item
      navigate(item.path);
    },
    [navigate, openLeftDrawer]
  );

  // Check if a nav item is active
  const isActive = useCallback(
    (path: string) => {
      return location.pathname === path || location.pathname.startsWith(`${path}/`);
    },
    [location.pathname]
  );

  return (
    <Box
      component="nav"
      sx={{
        position: 'fixed',
        left: 0,
        top: APPBAR_HEIGHT,
        bottom: 0,
        width: LEFT_RAIL_WIDTH,
        bgcolor: 'background.paper',
        borderRight: 1,
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        zIndex: (theme) => theme.zIndex.drawer,
      }}
      aria-label="Main navigation rail"
    >
      {/* Hamburger menu at top */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 56,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Tooltip title="Toggle navigation" placement="right">
          <IconButton
            onClick={toggleLeftDrawer}
            aria-label="Toggle navigation drawer"
            sx={{
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
          >
            <MenuIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Navigation items */}
      <List
        sx={{
          flex: 1,
          py: 1,
          px: 0.5,
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
      >
        {navigationItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Tooltip
              key={item.id}
              title={item.label}
              placement="right"
              arrow
            >
              <ListItemButton
                onClick={() => handleNavClick(item)}
                selected={active}
                sx={{
                  minHeight: 48,
                  justifyContent: 'center',
                  px: 1,
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
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    justifyContent: 'center',
                    color: active ? 'inherit' : 'text.secondary',
                  }}
                >
                  {getIcon(item.icon)}
                </ListItemIcon>
              </ListItemButton>
            </Tooltip>
          );
        })}
      </List>
    </Box>
  );
}

export default LeftRail;
