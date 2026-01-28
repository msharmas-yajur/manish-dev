import { useMemo } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
} from '@mui/material';
import {
  Close as CloseIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import {
  useLayout,
  RIGHT_RAIL_WIDTH,
  RIGHT_PANEL_WIDTH,
  APPBAR_HEIGHT,
} from '../../contexts/LayoutContext';
import { getToolById } from '../../features/tools/config/toolsConfig';
import { CopilotTool } from '../../features/tools/components/CopilotTool';
import { IframeTool } from '../../features/tools/components/IframeTool';
import type { Tool } from '../../features/tools/types';

/**
 * Renders the appropriate content based on tool type
 */
function ToolContent({
  tool,
  onClose,
}: {
  tool: Tool;
  onClose: () => void;
}) {
  switch (tool.type) {
    case 'component':
      // Render the component if available
      if (tool.component) {
        const ToolComponent = tool.component;
        return <ToolComponent tool={tool} onClose={onClose} />;
      }
      // Fallback for Copilot tool
      if (tool.id === 'copilot') {
        return <CopilotTool onClose={onClose} />;
      }
      return (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            p: 3,
          }}
        >
          <Typography color="text.secondary">
            Tool component not available
          </Typography>
        </Box>
      );

    case 'iframe':
      if (tool.url) {
        return (
          <IframeTool
            url={tool.url}
            title={tool.name}
            toolId={tool.id}
            onClose={onClose}
          />
        );
      }
      return (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            p: 3,
          }}
        >
          <Typography color="text.secondary">
            Tool URL not configured
          </Typography>
        </Box>
      );

    case 'link':
      // Link types shouldn't be rendered in panel (opened in new tab)
      // But provide a fallback just in case
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            p: 3,
            textAlign: 'center',
          }}
        >
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            This tool opens in a new browser tab
          </Typography>
          <IconButton
            onClick={() => {
              if (tool.url) {
                window.open(tool.url, '_blank', 'noopener,noreferrer');
              }
            }}
            color="primary"
            sx={{ p: 2 }}
          >
            <OpenInNewIcon sx={{ fontSize: 48 }} />
          </IconButton>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Click to open {tool.name}
          </Typography>
        </Box>
      );

    default:
      return (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            p: 3,
          }}
        >
          <Typography color="text.secondary">
            Unknown tool type
          </Typography>
        </Box>
      );
  }
}

/**
 * RightPanel component - Expandable panel for tools
 *
 * Features:
 * - Slides out from right rail (400px wide)
 * - Header with tool name and close button
 * - Content area renders active tool (component, iframe, or link)
 * - Persistent drawer variant
 */
export function RightPanel() {
  const { rightPanelOpen, activeToolId, closeRightPanel } = useLayout();

  // Get the active tool configuration
  const activeTool = useMemo(() => {
    if (!activeToolId) return null;
    return getToolById(activeToolId);
  }, [activeToolId]);

  return (
    <Drawer
      variant="persistent"
      anchor="right"
      open={rightPanelOpen}
      sx={{
        width: rightPanelOpen ? RIGHT_PANEL_WIDTH : 0,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: RIGHT_PANEL_WIDTH,
          boxSizing: 'border-box',
          right: RIGHT_RAIL_WIDTH,
          top: APPBAR_HEIGHT,
          height: `calc(100% - ${APPBAR_HEIGHT}px)`,
          borderLeft: 1,
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
      {/* Panel Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 56,
          px: 2,
          borderBottom: 1,
          borderColor: 'divider',
          flexShrink: 0,
        }}
      >
        <Typography
          variant="subtitle1"
          noWrap
          sx={{
            fontWeight: 600,
            color: 'text.primary',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {activeTool?.name || 'Tool Panel'}
        </Typography>
        <IconButton
          onClick={closeRightPanel}
          size="small"
          aria-label="Close tool panel"
          sx={{
            ml: 1,
            '&:hover': {
              bgcolor: 'action.hover',
            },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Panel Content */}
      <Box
        sx={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {activeTool ? (
          <ToolContent tool={activeTool} onClose={closeRightPanel} />
        ) : (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              p: 3,
            }}
          >
            <Typography color="text.secondary">
              Select a tool from the rail to get started
            </Typography>
          </Box>
        )}
      </Box>
    </Drawer>
  );
}

export default RightPanel;
