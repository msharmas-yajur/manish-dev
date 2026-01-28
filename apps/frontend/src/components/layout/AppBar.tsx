import { useState, useCallback } from 'react';
import {
  AppBar as MuiAppBar,
  Toolbar,
  IconButton,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Box,
  Divider,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { useLayout, APPBAR_HEIGHT } from '../../contexts/LayoutContext';

/**
 * AppBar component for Caladrius Health AI Studio
 *
 * Features:
 * - Fixed at top, full width
 * - Left: Hamburger menu (toggles left drawer) + Logo + App title
 * - Right: User avatar with dropdown menu (Profile, Logout)
 */
export function AppBar() {
  const { toggleLeftDrawer } = useLayout();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const isMenuOpen = Boolean(anchorEl);

  // Handle user menu open
  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  // Handle user menu close
  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  // Handle profile click
  const handleProfileClick = useCallback(() => {
    handleMenuClose();
    // TODO: Navigate to profile page
    console.log('Navigate to profile');
  }, [handleMenuClose]);

  // Handle logout click
  const handleLogoutClick = useCallback(() => {
    handleMenuClose();
    // TODO: Implement logout logic
    console.log('Logout');
  }, [handleMenuClose]);

  return (
    <MuiAppBar
      position="fixed"
      elevation={1}
      sx={{
        height: APPBAR_HEIGHT,
        zIndex: (theme) => theme.zIndex.drawer + 1,
        bgcolor: 'background.paper',
        color: 'text.primary',
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Toolbar
        sx={{
          height: APPBAR_HEIGHT,
          minHeight: `${APPBAR_HEIGHT}px !important`,
          px: { xs: 1.5, sm: 2 },
        }}
      >
        {/* Left section: Hamburger + Logo + Title */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="Toggle navigation menu"
            onClick={toggleLeftDrawer}
            sx={{
              mr: 1,
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
          >
            <MenuIcon />
          </IconButton>

          {/* Logo placeholder - can be replaced with actual logo */}
          <Box
            sx={{
              width: 32,
              height: 32,
              bgcolor: 'primary.main',
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mr: 1.5,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: 'primary.contrastText',
                fontWeight: 700,
                fontSize: '0.875rem',
              }}
            >
              C
            </Typography>
          </Box>

          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{
              fontWeight: 600,
              letterSpacing: '-0.01em',
              color: 'text.primary',
              display: { xs: 'none', sm: 'block' },
            }}
          >
            CALADRIUS HEALTH AI STUDIO
          </Typography>
        </Box>

        {/* Spacer */}
        <Box sx={{ flexGrow: 1 }} />

        {/* Right section: User Avatar */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton
            onClick={handleMenuOpen}
            size="small"
            aria-label="User account menu"
            aria-controls={isMenuOpen ? 'user-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={isMenuOpen ? 'true' : undefined}
            sx={{
              p: 0.5,
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
          >
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: 'primary.main',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              U
            </Avatar>
          </IconButton>

          {/* User dropdown menu */}
          <Menu
            id="user-menu"
            anchorEl={anchorEl}
            open={isMenuOpen}
            onClose={handleMenuClose}
            onClick={handleMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            slotProps={{
              paper: {
                elevation: 3,
                sx: {
                  mt: 1,
                  minWidth: 180,
                  borderRadius: 2,
                  overflow: 'visible',
                  '&::before': {
                    content: '""',
                    display: 'block',
                    position: 'absolute',
                    top: 0,
                    right: 14,
                    width: 10,
                    height: 10,
                    bgcolor: 'background.paper',
                    transform: 'translateY(-50%) rotate(45deg)',
                    zIndex: 0,
                  },
                },
              },
            }}
          >
            <MenuItem onClick={handleProfileClick}>
              <ListItemIcon>
                <PersonIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Profile</ListItemText>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogoutClick}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Logout</ListItemText>
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </MuiAppBar>
  );
}

export default AppBar;
