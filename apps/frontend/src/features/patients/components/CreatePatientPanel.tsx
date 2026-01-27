import { useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  styled,
} from '@mui/material';
import {
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
}

/**
 * Registration methods configuration
 */
const registrationMethods: RegistrationMethod[] = [
  {
    id: 'aadhaar',
    title: 'Create ABHA with Aadhaar',
    description: 'Create a new ABHA number using Aadhaar verification for quick and secure registration.',
    icon: <PersonAddIcon />,
  },
  {
    id: 'abha-verification',
    title: 'Create Patient Using ABHA Verification',
    description: 'Register a patient using their existing ABHA number for verified health records.',
    icon: <VerifiedUserIcon />,
  },
  {
    id: 'search-abha',
    title: 'Search ABHA / Forgot ABHA',
    description: 'Find existing ABHA numbers or help patients recover forgotten ABHA details.',
    icon: <SearchIcon />,
  },
  {
    id: 'manual',
    title: 'Manual Registration',
    description: 'Manually enter patient details for registration without ABHA verification.',
    icon: <EditIcon />,
  },
];

/**
 * Styled components for the panel
 */
const PanelHeader = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  padding: theme.spacing(3),
  borderRadius: `${theme.shape.borderRadius}px ${theme.shape.borderRadius}px 0 0`,
}));

const MethodCard = styled(Paper)(({ theme }) => ({
  display: 'flex',
  alignItems: 'flex-start',
  gap: theme.spacing(2),
  padding: theme.spacing(2),
  cursor: 'pointer',
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  transition: 'all 0.2s ease',
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.primary.main + '08',
    boxShadow: `0 2px 8px ${theme.palette.primary.main}20`,
  },
}));

const IconContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 48,
  height: 48,
  borderRadius: '50%',
  backgroundColor: theme.palette.primary.main + '15',
  color: theme.palette.primary.main,
  flexShrink: 0,
  '& svg': {
    fontSize: 24,
  },
}));

interface CreatePatientPanelProps {
  onMethodSelect?: (methodId: string) => void;
  onCancel?: () => void;
}

export function CreatePatientPanel({
  onMethodSelect,
  onCancel,
}: CreatePatientPanelProps) {
  const handleMethodClick = useCallback(
    (methodId: string) => {
      onMethodSelect?.(methodId);
    },
    [onMethodSelect]
  );

  const handleCancel = useCallback(() => {
    onCancel?.();
  }, [onCancel]);

  return (
    <Box
      sx={{
        width: 320,
        minWidth: 320,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'background.paper',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
        height: 'fit-content',
      }}
    >
      {/* Blue Header */}
      <PanelHeader>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            mb: 0.5,
          }}
        >
          Create New Patient
        </Typography>
        <Typography
          variant="body2"
          sx={{
            opacity: 0.9,
            fontSize: '0.8125rem',
          }}
        >
          Choose a registration method to continue
        </Typography>
      </PanelHeader>

      {/* Content Section */}
      <Box sx={{ p: 3 }}>
        {/* Registration Methods Section */}
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 600,
              color: 'text.primary',
              mb: 0.5,
            }}
          >
            Registration Methods
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              fontSize: '0.8125rem',
              mb: 2,
            }}
          >
            Select one of the options below to register a new patient
          </Typography>

          {/* Method Cards */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
            }}
          >
            {registrationMethods.map((method) => (
              <MethodCard
                key={method.id}
                elevation={0}
                onClick={() => handleMethodClick(method.id)}
              >
                <IconContainer>{method.icon}</IconContainer>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 600,
                      color: 'text.primary',
                      mb: 0.25,
                      fontSize: '0.875rem',
                    }}
                  >
                    {method.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'text.secondary',
                      fontSize: '0.75rem',
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

        {/* Cancel Button */}
        <Button
          fullWidth
          variant="outlined"
          color="inherit"
          onClick={handleCancel}
          sx={{
            borderColor: 'divider',
            color: 'text.secondary',
            textTransform: 'none',
            fontWeight: 500,
            py: 1,
            '&:hover': {
              borderColor: 'text.secondary',
              backgroundColor: 'grey.50',
            },
          }}
        >
          Cancel
        </Button>
      </Box>
    </Box>
  );
}
