import { Chip } from '@mui/material';
import { PatientStatus } from '../types/patient.types';

interface PatientStatusBadgeProps {
  status: PatientStatus;
}

const statusConfig: Record<PatientStatus, { label: string; sx: object }> = {
  LINKED: {
    label: 'LINKED',
    sx: {
      backgroundColor: '#e3f2fd',
      color: '#1565c0',
      border: '1px solid #90caf9',
    },
  },
  NOT_LINKED: {
    label: 'NOT_LINKED',
    sx: {
      backgroundColor: '#f5f5f5',
      color: '#757575',
      border: '1px solid #e0e0e0',
    },
  },
  ACTIVE: {
    label: 'Active',
    sx: {
      backgroundColor: '#e8f5e9',
      color: '#2e7d32',
      border: '1px solid #a5d6a7',
    },
  },
  INACTIVE: {
    label: 'Inactive',
    sx: {
      backgroundColor: '#fafafa',
      color: '#9e9e9e',
      border: '1px solid #eeeeee',
    },
  },
};

export function PatientStatusBadge({ status }: PatientStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.NOT_LINKED;

  return (
    <Chip
      label={config.label}
      size="small"
      sx={{
        fontWeight: 500,
        fontSize: '0.7rem',
        height: 24,
        borderRadius: '4px',
        ...config.sx,
      }}
    />
  );
}
