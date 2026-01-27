import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Avatar,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material';
import { useAuthContext } from '@features/auth';

/**
 * UserMenu component displays user avatar with dropdown menu
 * Shows first letter of user name in avatar
 * Provides logout functionality
 */
export function UserMenu() {
  const { user, logout } = useAuthContext();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleClose();
    await logout();
    navigate('/login');
  };

  // Get first letter of user name or email for avatar
  const getAvatarLetter = (): string => {
    if (user?.name) {
      return user.name.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  // Get display name
  const getDisplayName = (): string => {
    return user?.name || user?.email || 'User';
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography
        variant="body2"
        sx={{
          color: 'white',
          display: { xs: 'none', sm: 'block' },
        }}
      >
        {getDisplayName()}
      </Typography>
      <IconButton
        onClick={handleClick}
        size="small"
        aria-controls={open ? 'user-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        sx={{ p: 0 }}
      >
        <Avatar
          sx={{
            width: 36,
            height: 36,
            bgcolor: 'primary.light',
            color: 'white',
            fontSize: '1rem',
            fontWeight: 600,
          }}
        >
          {getAvatarLetter()}
        </Avatar>
      </IconButton>
      <Menu
        id="user-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        slotProps={{
          paper: {
            elevation: 3,
            sx: {
              minWidth: 150,
              mt: 1,
              '& .MuiMenuItem-root': {
                px: 2,
                py: 1,
              },
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleLogout}>Logout</MenuItem>
      </Menu>
    </Box>
  );
}
