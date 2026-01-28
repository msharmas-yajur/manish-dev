import { useCallback } from 'react';
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  Tooltip,
} from '@mui/material';
import {
  AutoAwesome as AutoAwesomeIcon,
  AcUnit as AcUnitIcon,
  LocalHospital as LocalHospitalIcon,
  QrCode2 as QrCode2Icon,
  ListAlt as ListAltIcon,
} from '@mui/icons-material';
import {
  useLayout,
  RIGHT_RAIL_WIDTH,
  APPBAR_HEIGHT,
} from '../../contexts/LayoutContext';
import { getEnabledTools, getSortedTools } from '../../features/tools/config/toolsConfig';
import type { Tool } from '../../features/tools/types';

/**
 * Icon mapping from string icon names to MUI icon components
 */
const iconMap: Record<string, React.ReactElement> = {
  AutoAwesome: <AutoAwesomeIcon />,
  AcUnit: <AcUnitIcon />,
  LocalHospital: <LocalHospitalIcon />,
  QrCode2: <QrCode2Icon />,
  ListAlt: <ListAltIcon />,
};

/**
 * Get icon component by name
 */
function getIcon(iconName: string): React.ReactElement {
  return iconMap[iconName] || <AutoAwesomeIcon />;
}

/**
 * RightRail component - Vertical tool rail on the right side
 *
 * Features:
 * - Fixed 56px wide vertical rail on right
 * - Shows tool icons from toolsConfig
 * - Clicking tool icon opens right panel with that tool
 * - Tooltips show tool names on hover
 */
export function RightRail() {
  const { activeToolId, setActiveTool, rightPanelOpen, closeRightPanel } = useLayout();

  // Get enabled and sorted tools
  const enabledTools = getEnabledTools();
  const sortedTools = getSortedTools(enabledTools);

  // Handle tool click
  const handleToolClick = useCallback(
    (tool: Tool) => {
      // If clicking the same tool that's already open, close the panel
      if (rightPanelOpen && activeToolId === tool.id) {
        closeRightPanel();
      } else {
        // For link type tools, open in new tab
        if (tool.type === 'link' && tool.url) {
          window.open(tool.url, '_blank', 'noopener,noreferrer');
        } else {
          // For component and iframe types, open in panel
          setActiveTool(tool.id);
        }
      }
    },
    [activeToolId, rightPanelOpen, setActiveTool, closeRightPanel]
  );

  return (
    <Box
      component="aside"
      sx={{
        position: 'fixed',
        right: 0,
        top: APPBAR_HEIGHT,
        bottom: 0,
        width: RIGHT_RAIL_WIDTH,
        bgcolor: 'background.paper',
        borderLeft: 1,
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        zIndex: (theme) => theme.zIndex.drawer,
      }}
      aria-label="Tools rail"
    >
      {/* Tools list */}
      <List
        sx={{
          flex: 1,
          py: 2,
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
        {sortedTools.map((tool) => {
          const isActive = rightPanelOpen && activeToolId === tool.id;
          const isLinkType = tool.type === 'link';

          return (
            <Tooltip
              key={tool.id}
              title={
                isLinkType
                  ? `${tool.name} (opens in new tab)`
                  : tool.name
              }
              placement="left"
              arrow
            >
              <ListItemButton
                onClick={() => handleToolClick(tool)}
                selected={isActive}
                sx={{
                  minHeight: 48,
                  justifyContent: 'center',
                  px: 1,
                  my: 0.5,
                  borderRadius: 1.5,
                  '&.Mui-selected': {
                    bgcolor: 'secondary.main',
                    color: 'secondary.contrastText',
                    '&:hover': {
                      bgcolor: 'secondary.dark',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'secondary.contrastText',
                    },
                  },
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
                aria-label={tool.name}
                aria-pressed={isActive}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    justifyContent: 'center',
                    color: isActive ? 'inherit' : 'text.secondary',
                  }}
                >
                  {getIcon(tool.icon)}
                </ListItemIcon>
              </ListItemButton>
            </Tooltip>
          );
        })}
      </List>
    </Box>
  );
}

export default RightRail;
