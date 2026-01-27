import { useState, useCallback } from 'react';
import {
  Drawer,
  Box,
  IconButton,
  Typography,
  Tooltip,
  Fab,
  useTheme,
  styled,
  Divider,
  Badge,
} from '@mui/material';
import {
  SmartToy as AIIcon,
  ChevronLeft as ChevronLeftIcon,
  Psychology as PsychologyIcon,
  HealthAndSafety as HealthIcon,
} from '@mui/icons-material';
import { useAuthContext } from '@features/auth';
import { CopilotChat } from './CopilotChat';

/**
 * Sidebar width constant
 */
const SIDEBAR_WIDTH = 420;

/**
 * Styled components for healthcare-themed design
 */
const StyledDrawer = styled(Drawer)(({ theme }) => ({
  '& .MuiDrawer-paper': {
    width: SIDEBAR_WIDTH,
    backgroundColor: theme.palette.background.paper,
    borderLeft: `1px solid ${theme.palette.divider}`,
    boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.1)',
  },
}));

const SidebarHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(2),
  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
  color: theme.palette.primary.contrastText,
  minHeight: 72,
}));

const HeaderContent = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
});

const LogoContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 44,
  height: 44,
  borderRadius: '50%',
  backgroundColor: 'rgba(255, 255, 255, 0.2)',
  '& svg': {
    fontSize: 26,
    color: theme.palette.primary.contrastText,
  },
}));

const ToggleFab = styled(Fab)(({ theme }) => ({
  position: 'fixed',
  right: 24,
  bottom: 24,
  zIndex: theme.zIndex.drawer - 1,
  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
  color: theme.palette.primary.contrastText,
  '&:hover': {
    background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`,
  },
  boxShadow: '0 4px 20px rgba(21, 101, 192, 0.4)',
}));

const StatusIndicator = styled(Box)<{ status: 'online' | 'offline' | 'busy' }>(({ theme, status }) => ({
  width: 10,
  height: 10,
  borderRadius: '50%',
  backgroundColor:
    status === 'online'
      ? theme.palette.success.main
      : status === 'busy'
      ? theme.palette.warning.main
      : theme.palette.error.main,
  border: `2px solid ${theme.palette.primary.contrastText}`,
}));

const ContentContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  height: 'calc(100% - 72px)',
  overflow: 'hidden',
});

const QuickActionsBar = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1.5, 2),
  backgroundColor: theme.palette.background.default,
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const QuickActionChip = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  padding: theme.spacing(0.75, 1.5),
  borderRadius: 16,
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  cursor: 'pointer',
  fontSize: '0.75rem',
  fontWeight: 500,
  color: theme.palette.text.secondary,
  transition: 'all 0.2s ease',
  '&:hover': {
    borderColor: theme.palette.primary.main,
    color: theme.palette.primary.main,
    backgroundColor: `${theme.palette.primary.main}10`,
  },
  '& svg': {
    fontSize: 16,
  },
}));

interface CopilotSidebarProps {
  defaultOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
}

/**
 * CopilotSidebar component provides a Material-UI styled sidebar
 * for the AI assistant chat interface.
 */
export function CopilotSidebar({ defaultOpen = false, onToggle }: CopilotSidebarProps) {
  const theme = useTheme();
  const { isAuthenticated } = useAuthContext();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [connectionStatus] = useState<'online' | 'offline' | 'busy'>('online');

  const handleToggle = useCallback(() => {
    const newState = !isOpen;
    setIsOpen(newState);
    onToggle?.(newState);
  }, [isOpen, onToggle]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    onToggle?.(false);
  }, [onToggle]);

  // Don't render for unauthenticated users
  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* Toggle FAB Button */}
      <Tooltip
        title="Open AI Health Assistant"
        placement="left"
        arrow
      >
        <ToggleFab
          onClick={handleToggle}
          aria-label="Toggle AI Health Assistant sidebar"
          size="large"
          sx={{
            display: isOpen ? 'none' : 'flex',
          }}
        >
          <Badge
            variant="dot"
            color={connectionStatus === 'online' ? 'success' : 'error'}
            overlap="circular"
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <AIIcon sx={{ fontSize: 28 }} />
          </Badge>
        </ToggleFab>
      </Tooltip>

      {/* Sidebar Drawer */}
      <StyledDrawer
        anchor="right"
        open={isOpen}
        onClose={handleClose}
        variant="persistent"
        aria-label="AI Health Assistant sidebar"
      >
        {/* Header */}
        <SidebarHeader>
          <HeaderContent>
            <LogoContainer>
              <PsychologyIcon />
            </LogoContainer>
            <Box>
              <Typography
                variant="h6"
                component="h2"
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                Health AI Assistant
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5 }}>
                <StatusIndicator status={connectionStatus} />
                <Typography
                  variant="caption"
                  sx={{ opacity: 0.9, textTransform: 'capitalize' }}
                >
                  {connectionStatus}
                </Typography>
              </Box>
            </Box>
          </HeaderContent>
          <IconButton
            onClick={handleClose}
            size="small"
            sx={{
              color: 'inherit',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
              },
            }}
            aria-label="Close AI Assistant sidebar"
          >
            <ChevronLeftIcon />
          </IconButton>
        </SidebarHeader>

        <ContentContainer>
          {/* Quick Actions Bar */}
          <QuickActionsBar>
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', fontWeight: 500 }}
            >
              Quick:
            </Typography>
            <QuickActionChip>
              <HealthIcon />
              ICD-10
            </QuickActionChip>
            <QuickActionChip>
              CPT Codes
            </QuickActionChip>
            <QuickActionChip>
              Note
            </QuickActionChip>
          </QuickActionsBar>

          <Divider />

          {/* Chat Interface */}
          <CopilotChat />
        </ContentContainer>
      </StyledDrawer>

      {/* Spacer when sidebar is open to prevent content overlap */}
      {isOpen && (
        <Box
          sx={{
            width: SIDEBAR_WIDTH,
            flexShrink: 0,
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          }}
        />
      )}
    </>
  );
}

export default CopilotSidebar;
