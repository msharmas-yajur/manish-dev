import { TableRow, TableCell, Typography, Box } from '@mui/material';
import { Patient } from '../types/patient.types';
import { PatientStatusBadge } from './PatientStatusBadge';
import { PatientActionMenu } from './PatientActionMenu';

interface PatientTableRowProps {
  patient: Patient;
  onView?: (patientId: string) => void;
  onEdit?: (patientId: string) => void;
  onDelete?: (patientId: string) => void;
}

/**
 * Format a date string to a readable format (e.g., "17 Nov 2025")
 */
function formatDate(dateString?: string): string {
  if (!dateString) return '-';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function PatientTableRow({
  patient,
  onView = () => {},
  onEdit = () => {},
  onDelete = () => {},
}: PatientTableRowProps) {
  const handleNameClick = () => {
    onView(patient.id);
  };

  return (
    <TableRow
      hover
      sx={{
        '&:last-child td, &:last-child th': { border: 0 },
      }}
    >
      {/* Patient Details (Name + ID) */}
      <TableCell>
        <Box>
          <Typography
            variant="body2"
            onClick={handleNameClick}
            sx={{
              color: 'primary.main',
              cursor: 'pointer',
              fontWeight: 500,
              '&:hover': {
                textDecoration: 'underline',
              },
            }}
          >
            {patient.fullName}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
            }}
          >
            {patient.id}
          </Typography>
        </Box>
      </TableCell>

      {/* ABHA Number */}
      <TableCell>
        <Typography variant="body2">{patient.abhaNumber}</Typography>
      </TableCell>

      {/* Contact (Phone) */}
      <TableCell>
        <Typography variant="body2">{patient.phone || '-'}</Typography>
      </TableCell>

      {/* Date of Birth */}
      <TableCell>
        <Typography variant="body2">{formatDate(patient.dateOfBirth)}</Typography>
      </TableCell>

      {/* Gender */}
      <TableCell>
        <Typography variant="body2">{patient.gender}</Typography>
      </TableCell>

      {/* Status */}
      <TableCell>
        <PatientStatusBadge status={patient.status} />
      </TableCell>

      {/* Last Visit */}
      <TableCell>
        <Typography variant="body2">{formatDate(patient.lastVisit)}</Typography>
      </TableCell>

      {/* Action */}
      <TableCell>
        <PatientActionMenu
          patientId={patient.id}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </TableCell>
    </TableRow>
  );
}
