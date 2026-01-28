import { useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Drawer,
  styled,
} from '@mui/material';
import {
  Close as CloseIcon,
  PersonAdd as PersonAddIcon,
  VerifiedUser as VerifiedUserIcon,
  Search as SearchIcon,
  Edit as EditIcon,
} from '@mui/icons-material';

/**
 * Registration method card data interface
 */
interface RegistrationMethod {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBgColor: string;
  iconColor: string;
}

/**
 * Registration methods configuration
 */
const registrationMethods: RegistrationMethod[] = [
  {
    id: 'aadhaar',
    title: 'Create ABHA with Aadhaar',
    description: 'Use Aadhaar for instant verification and ABHA creation',
    icon: <PersonAddIcon />,
    iconBgColor: '#e3f2fd',
    iconColor: '#1565c0',
  },
  {
    id: 'abha-verification',
    title: 'Create Patient Using ABHA Verification',
    description: 'Register patient with existing ABHA credentials',
    icon: <VerifiedUserIcon />,
    iconBgColor: '#e8f5e9',
    iconColor: '#2e7d32',
  },
  {
    id: 'search-abha',
    title: 'Search ABHA / Forgot ABHA',
    description: 'Find your ABHA using mobile number or Aadhaar',
    icon: <SearchIcon />,
    iconBgColor: '#fff3e0',
    iconColor: '#e65100',
  },
  {
    id: 'manual',
    title: 'Manual Registration',
    description: 'Register without ABHA (can be added later)',
    icon: <EditIcon />,
    iconBgColor: '#f3e5f5',
    iconColor: '#7b1fa2',
  },
];

/**
 * Styled components for the dialog
 */
const DialogHeader = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  padding: theme.spacing(2.5, 3),
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
}));

const MethodCard = styled(Paper)(({ theme }) => ({
  display: 'flex',
  alignItems: 'flex-start',
  gap: theme.spacing(2),
  padding: theme.spacing(2),
  cursor: 'pointer',
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius * 1.5,
  transition: 'all 0.2s ease',
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.primary.main + '08',
    boxShadow: `0 2px 12px ${theme.palette.primary.main}15`,
  },
}));

interface CreatePatientDialogProps {
  open: boolean;
  onClose: () => void;
  onMethodSelect?: (methodId: string) => void;
}

export function CreatePatientDialog({
  open,
  onClose,
  onMethodSelect,
}: CreatePatientDialogProps) {
  const handleMethodClick = useCallback(
    (methodId: string) => {
      onMethodSelect?.(methodId);
      // Don't close dialog - let parent handle navigation
    },
    [onMethodSelect]
  );

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: 480,
          maxWidth: '100%',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
        },
      }}
    >
      {/* Blue Header */}
      <DialogHeader>
        <Box>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              mb: 0.5,
              fontSize: '1.25rem',
            }}
          >
            Create New Patient
          </Typography>
          <Typography
            variant="body2"
            sx={{
              opacity: 0.9,
              fontSize: '0.875rem',
            }}
          >
            Choose a registration method to continue
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          sx={{
            color: 'white',
            mt: -0.5,
            mr: -1,
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogHeader>

      {/* Content Section */}
      <Box sx={{ p: 3, backgroundColor: 'grey.50', flexGrow: 1 }}>
        {/* Registration Methods Section */}
        <Box
          sx={{
            backgroundColor: 'white',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            p: 3,
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 600,
              color: 'primary.main',
              mb: 0.5,
            }}
          >
            Registration Methods
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              fontSize: '0.875rem',
              mb: 3,
            }}
          >
            Select the most appropriate method based on the patient's situation
            and available documentation.
          </Typography>

          {/* Method Cards */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            {registrationMethods.map((method) => (
              <MethodCard
                key={method.id}
                elevation={0}
                onClick={() => handleMethodClick(method.id)}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 48,
                    height: 48,
                    borderRadius: '12px',
                    backgroundColor: method.iconBgColor,
                    color: method.iconColor,
                    flexShrink: 0,
                    '& svg': {
                      fontSize: 24,
                    },
                  }}
                >
                  {method.icon}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 600,
                      color: 'text.primary',
                      mb: 0.5,
                      fontSize: '0.9375rem',
                    }}
                  >
                    {method.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'text.secondary',
                      fontSize: '0.8125rem',
                      lineHeight: 1.4,
                    }}
                  >
                    {method.description}
                  </Typography>
                </Box>
              </MethodCard>
            ))}
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
}
