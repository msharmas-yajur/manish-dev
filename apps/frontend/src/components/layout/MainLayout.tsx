import { Box, Toolbar } from '@mui/material';
import {
  LayoutProvider,
  useContentMargins,
  APPBAR_HEIGHT,
} from '../../contexts/LayoutContext';
import { AppBar } from './AppBar';
import { LeftRail } from './LeftRail';
import { LeftDrawer } from './LeftDrawer';
import { RightRail } from './RightRail';
import { RightPanel } from './RightPanel';

/**
 * Props for MainLayout component
 */
interface MainLayoutProps {
  children: React.ReactNode;
}

/**
 * Inner layout content that uses the layout context
 * This is separated because useContentMargins requires LayoutProvider
 */
function LayoutContent({ children }: MainLayoutProps) {
  const { marginLeft, marginRight } = useContentMargins();

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        minWidth: '1024px', // Desktop-only constraint
        bgcolor: 'background.default',
      }}
    >
      {/* AppBar - Fixed at top */}
      <AppBar />

      {/* Left Navigation */}
      <LeftRail />
      <LeftDrawer />

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          ml: `${marginLeft}px`,
          mr: `${marginRight}px`,
          transition: (theme) =>
            theme.transitions.create(['margin-left', 'margin-right'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
        }}
      >
        {/* Spacer for fixed AppBar */}
        <Toolbar
          sx={{
            minHeight: `${APPBAR_HEIGHT}px !important`,
          }}
        />

        {/* Page Content */}
        <Box
          sx={{
            flex: 1,
            p: 3,
            overflow: 'auto',
          }}
        >
          {children}
        </Box>
      </Box>

      {/* Right Tools */}
      <RightPanel />
      <RightRail />
    </Box>
  );
}

/**
 * MainLayout component - Assembles all layout components
 *
 * Features:
 * - Wraps children in LayoutProvider for state management
 * - Includes AppBar, LeftRail, LeftDrawer, RightRail, RightPanel
 * - Content area adjusts width based on drawer states
 * - Smooth transitions when drawers open/close
 *
 * Usage:
 * ```tsx
 * <MainLayout>
 *   <YourPageContent />
 * </MainLayout>
 * ```
 */
export function MainLayout({ children }: MainLayoutProps) {
  return (
    <LayoutProvider>
      <LayoutContent>{children}</LayoutContent>
    </LayoutProvider>
  );
}

export default MainLayout;
