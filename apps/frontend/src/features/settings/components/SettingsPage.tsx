import { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import SecurityIcon from '@mui/icons-material/Security';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CableIcon from '@mui/icons-material/Cable';
import BuildIcon from '@mui/icons-material/Build';

import { ProfileSettings } from './ProfileSettings';
import { SecuritySettings } from './SecuritySettings';
import { LLMConfigSettings } from './LLMConfigSettings';
import { ConnectorsSettings } from './ConnectorsSettings';
import { ToolsSettings } from './ToolsSettings';
import type { SettingsSection, SettingsSectionConfig } from '../types';

/**
 * Settings sections configuration
 */
const SETTINGS_SECTIONS: SettingsSectionConfig[] = [
  {
    id: 'profile',
    label: 'Profile',
    icon: 'Person',
    description: 'Manage your personal information and preferences',
  },
  {
    id: 'security',
    label: 'Security',
    icon: 'Security',
    description: 'Password, two-factor authentication, and sessions',
  },
  {
    id: 'llm-config',
    label: 'LLM Configuration',
    icon: 'SmartToy',
    description: 'Configure AI language model providers and settings',
  },
  {
    id: 'connectors',
    label: 'Connectors',
    icon: 'Cable',
    description: 'Connect to EHR systems and external services',
  },
  {
    id: 'tools',
    label: 'Tools',
    icon: 'Build',
    description: 'Manage available tools and integrations',
  },
];

/**
 * Get icon component for a section
 */
function getSectionIcon(iconName: string) {
  switch (iconName) {
    case 'Person':
      return <PersonIcon />;
    case 'Security':
      return <SecurityIcon />;
    case 'SmartToy':
      return <SmartToyIcon />;
    case 'Cable':
      return <CableIcon />;
    case 'Build':
      return <BuildIcon />;
    default:
      return <PersonIcon />;
  }
}

/**
 * Render the appropriate settings section content
 */
function SettingsContent({ section }: { section: SettingsSection }) {
  switch (section) {
    case 'profile':
      return <ProfileSettings />;
    case 'security':
      return <SecuritySettings />;
    case 'llm-config':
      return <LLMConfigSettings />;
    case 'connectors':
      return <ConnectorsSettings />;
    case 'tools':
      return <ToolsSettings />;
    default:
      return <ProfileSettings />;
  }
}

/**
 * SettingsPage - Main settings page with sidebar navigation
 * Layout similar to Claude's settings page with left sidebar and right content area
 */
export function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');

  const handleSectionChange = useCallback((section: SettingsSection) => {
    setActiveSection(section);
  }, []);

  const currentSection = SETTINGS_SECTIONS.find((s) => s.id === activeSection);

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 3,
        p: 3,
        minHeight: 'calc(100vh - 64px)',
        backgroundColor: 'grey.50',
      }}
    >
      {/* Left Sidebar Navigation */}
      <Paper
        elevation={0}
        sx={{
          width: 280,
          flexShrink: 0,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
        }}
      >
        {/* Settings Header */}
        <Box
          sx={{
            p: 3,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography
            variant="h5"
            sx={{
              fontWeight: 600,
              color: 'text.primary',
            }}
          >
            Settings
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              mt: 0.5,
            }}
          >
            Manage your account and preferences
          </Typography>
        </Box>

        {/* Navigation List */}
        <List sx={{ p: 1 }}>
          {SETTINGS_SECTIONS.map((section, index) => (
            <Box key={section.id}>
              {index > 0 && section.id === 'llm-config' && (
                <Divider sx={{ my: 1 }} />
              )}
              <ListItem disablePadding>
                <ListItemButton
                  selected={activeSection === section.id}
                  onClick={() => handleSectionChange(section.id)}
                  sx={{
                    borderRadius: 1,
                    mx: 0.5,
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
                      bgcolor: 'grey.100',
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 40,
                      color:
                        activeSection === section.id
                          ? 'inherit'
                          : 'grey.600',
                    }}
                  >
                    {getSectionIcon(section.icon)}
                  </ListItemIcon>
                  <ListItemText
                    primary={section.label}
                    primaryTypographyProps={{
                      fontWeight: activeSection === section.id ? 600 : 400,
                      fontSize: '0.9375rem',
                    }}
                  />
                </ListItemButton>
              </ListItem>
            </Box>
          ))}
        </List>
      </Paper>

      {/* Right Content Area */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {/* Section Header */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography
            variant="h5"
            sx={{
              fontWeight: 600,
              color: 'text.primary',
            }}
          >
            {currentSection?.label}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              mt: 0.5,
            }}
          >
            {currentSection?.description}
          </Typography>
        </Paper>

        {/* Section Content */}
        <SettingsContent section={activeSection} />
      </Box>
    </Box>
  );
}
