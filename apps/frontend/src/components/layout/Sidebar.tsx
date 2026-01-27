import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import DescriptionIcon from '@mui/icons-material/Description';
import SettingsIcon from '@mui/icons-material/Settings';

const DRAWER_WIDTH = 240;

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
  { label: 'Patients', path: '/patients', icon: <PeopleIcon /> },
  { label: 'Appointments', path: '/appointments', icon: <CalendarMonthIcon /> },
  { label: 'Records', path: '/records', icon: <DescriptionIcon /> },
  { label: 'Settings', path: '/settings', icon: <SettingsIcon /> },
];

/**
 * Sidebar component - Left navigation drawer
 * Fixed position with navigation links
 */
export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string): boolean => {
    if (path === '/patients') {
      return location.pathname === '/' || location.pathname.startsWith('/patients');
    }
    return location.pathname.startsWith(path);
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          bgcolor: 'grey.50',
          borderRight: '1px solid',
          borderColor: 'grey.200',
        },
      }}
    >
      {/* Spacer for navbar height */}
      <Toolbar />

      <Box sx={{ overflow: 'auto', mt: 2 }}>
        <List>
          {navItems.map((item) => (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                selected={isActive(item.path)}
                onClick={() => navigate(item.path)}
                sx={{
                  mx: 1,
                  borderRadius: 1,
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'white',
                    },
                  },
                  '&:hover': {
                    bgcolor: 'grey.200',
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 40,
                    color: isActive(item.path) ? 'inherit' : 'grey.600',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontWeight: isActive(item.path) ? 600 : 400,
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
    </Drawer>
  );
}

export const SIDEBAR_WIDTH = DRAWER_WIDTH;
