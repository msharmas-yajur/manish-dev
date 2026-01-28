import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
  Skeleton,
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { Patient } from '../types/patient.types';
import { PatientStatusBadge } from './PatientStatusBadge';

interface PatientTableProps {
  patients: Patient[];
  isLoading: boolean;
  onView?: (patientId: string) => void;
  onEdit?: (patientId: string) => void;
  onDelete?: (patientId: string) => void;
}

const tableHeaders = [
  { id: 'patientDetails', label: 'PATIENT DETAILS', minWidth: 180, align: 'left' as const },
  { id: 'abhaNumber', label: 'ABHA NUMBER', minWidth: 120, align: 'left' as const },
  { id: 'abhaAddress', label: 'ABHA ADDRESS', minWidth: 120, align: 'left' as const },
  { id: 'contact', label: 'CONTACT', minWidth: 120, align: 'left' as const },
  { id: 'dateOfBirth', label: 'DATE OF BIRTH', minWidth: 110, align: 'left' as const },
  { id: 'gender', label: 'GENDER', minWidth: 80, align: 'left' as const },
  { id: 'status', label: 'STATUS', minWidth: 100, align: 'left' as const },
  { id: 'lastVisit', label: 'LAST VISIT', minWidth: 100, align: 'left' as const },
  { id: 'actions', label: 'EDIT | DELETE', minWidth: 100, align: 'center' as const },
];

/**
 * Format a date string to a readable format (e.g., "06 Mar 2003")
 */
function formatDate(dateString?: string): string {
  if (!dateString) return '-';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function LoadingSkeleton() {
  return (
    <>
      {[...Array(8)].map((_, index) => (
        <TableRow key={index}>
          {tableHeaders.map((header) => (
            <TableCell key={header.id}>
              <Skeleton variant="text" width="80%" height={24} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

function EmptyState() {
  return (
    <TableRow>
      <TableCell colSpan={tableHeaders.length}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 8,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              color: 'text.secondary',
              mb: 1,
            }}
          >
            No patients found
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: 'text.disabled',
            }}
          >
            Try adjusting your search or filters
          </Typography>
        </Box>
      </TableCell>
    </TableRow>
  );
}

interface PatientRowProps {
  patient: Patient;
  onView?: (patientId: string) => void;
  onEdit?: (patientId: string) => void;
  onDelete?: (patientId: string) => void;
}

function PatientRow({ patient, onView, onEdit, onDelete }: PatientRowProps) {
  const handleNameClick = () => {
    onView?.(patient.id);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(patient.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(patient.id);
  };

  return (
    <TableRow
      hover
      sx={{
        cursor: 'pointer',
        '&:last-child td, &:last-child th': { border: 0 },
        '&:hover': {
          backgroundColor: 'grey.50',
        },
      }}
      onClick={handleNameClick}
    >
      {/* Patient Details (Name + ID) */}
      <TableCell>
        <Box>
          <Typography
            variant="body2"
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
              fontSize: '0.75rem',
            }}
          >
            ID: {patient.id}
          </Typography>
        </Box>
      </TableCell>

      {/* ABHA Number */}
      <TableCell>
        {patient.abhaNumber && patient.abhaNumber !== 'Not Linked' ? (
          <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
            {patient.abhaNumber}
          </Typography>
        ) : (
          <Chip
            label="Not Linked"
            size="small"
            sx={{
              backgroundColor: '#f5f5f5',
              color: '#757575',
              fontSize: '0.75rem',
              height: 24,
              borderRadius: '4px',
            }}
          />
        )}
      </TableCell>

      {/* ABHA Address */}
      <TableCell>
        {patient.abhaAddress ? (
          <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
            {patient.abhaAddress}
          </Typography>
        ) : (
          <Chip
            label="Not Linked"
            size="small"
            sx={{
              backgroundColor: '#f5f5f5',
              color: '#757575',
              fontSize: '0.75rem',
              height: 24,
              borderRadius: '4px',
            }}
          />
        )}
      </TableCell>

      {/* Contact (Phone) */}
      <TableCell>
        <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
          {patient.phone || '-'}
        </Typography>
      </TableCell>

      {/* Date of Birth */}
      <TableCell>
        <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
          {formatDate(patient.dateOfBirth)}
        </Typography>
      </TableCell>

      {/* Gender */}
      <TableCell>
        <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
          {patient.gender}
        </Typography>
      </TableCell>

      {/* Status */}
      <TableCell>
        <PatientStatusBadge status={patient.status} />
      </TableCell>

      {/* Last Visit */}
      <TableCell>
        <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
          {formatDate(patient.lastVisit)}
        </Typography>
      </TableCell>

      {/* Actions (Edit | Delete) */}
      <TableCell align="center">
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
          <Tooltip title="Edit patient">
            <IconButton
              size="small"
              onClick={handleEdit}
              sx={{
                color: 'primary.main',
                '&:hover': {
                  backgroundColor: 'primary.50',
                },
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete patient">
            <IconButton
              size="small"
              onClick={handleDelete}
              sx={{
                color: 'error.main',
                '&:hover': {
                  backgroundColor: 'error.50',
                },
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </TableCell>
    </TableRow>
  );
}

export function PatientTable({
  patients,
  isLoading,
  onView,
  onEdit,
  onDelete,
}: PatientTableProps) {
  const showEmptyState = !isLoading && patients.length === 0;

  return (
    <TableContainer
      component={Paper}
      sx={{
        boxShadow: 'none',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <Table sx={{ minWidth: 1100 }} aria-label="patients table">
        <TableHead>
          <TableRow
            sx={{
              backgroundColor: 'grey.50',
            }}
          >
            {tableHeaders.map((header) => (
              <TableCell
                key={header.id}
                align={header.align}
                sx={{
                  minWidth: header.minWidth,
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  borderBottom: '1px solid',
                  borderBottomColor: 'divider',
                  py: 1.5,
                }}
              >
                {header.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {isLoading ? (
            <LoadingSkeleton />
          ) : showEmptyState ? (
            <EmptyState />
          ) : (
            patients.map((patient) => (
              <PatientRow
                key={patient.id}
                patient={patient}
                onView={onView}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
