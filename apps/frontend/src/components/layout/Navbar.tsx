import { AppBar, Box, Toolbar, Typography } from '@mui/material';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import { UserMenu } from './UserMenu';

/**
 * Navbar component - Top navigation bar
 * Fixed position at top with logo and user menu
 */
export function Navbar() {
  return (
    <AppBar
      position="fixed"
      sx={{
        bgcolor: 'primary.main', // #1565C0
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar>
        {/* Logo and App Name */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocalHospitalIcon sx={{ color: 'white', fontSize: 28 }} />
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontWeight: 600,
              color: 'white',
              letterSpacing: '0.5px',
            }}
          >
            Caladrius Health AI Studio
          </Typography>
        </Box>

        {/* Spacer */}
        <Box sx={{ flexGrow: 1 }} />

        {/* User Menu */}
        <UserMenu />
      </Toolbar>
    </AppBar>
  );
}
