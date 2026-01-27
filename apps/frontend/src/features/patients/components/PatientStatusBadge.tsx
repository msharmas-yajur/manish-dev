import { Chip } from '@mui/material';
import { PatientStatus } from '../types/patient.types';

interface PatientStatusBadgeProps {
  status: PatientStatus;
}

const statusConfig: Record<PatientStatus, { label: string; color: 'primary' | 'success' | 'default'; sx?: object }> = {
  LINKED: {
    label: 'Linked',
    color: 'primary',
    sx: {
      backgroundColor: '#1565C0',
      color: '#fff',
    },
  },
  ACTIVE: {
    label: 'Active',
    color: 'success',
  },
  INACTIVE: {
    label: 'Inactive',
    color: 'default',
  },
};

export function PatientStatusBadge({ status }: PatientStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Chip
      label={config.label}
      color={config.color}
      size="small"
      sx={{
        fontWeight: 500,
        fontSize: '0.75rem',
        ...config.sx,
      }}
    />
  );
}
