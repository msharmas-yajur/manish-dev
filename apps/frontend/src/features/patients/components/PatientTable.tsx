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
  CircularProgress,
  Skeleton,
} from '@mui/material';
import { Patient } from '../types/patient.types';
import { PatientTableRow } from './PatientTableRow';

interface PatientTableProps {
  patients: Patient[];
  isLoading: boolean;
  onView?: (patientId: string) => void;
  onEdit?: (patientId: string) => void;
  onDelete?: (patientId: string) => void;
}

const tableHeaders = [
  { id: 'patientDetails', label: 'PATIENT DETAILS', minWidth: 200 },
  { id: 'abhaNumber', label: 'ABHA NUMBER', minWidth: 150 },
  { id: 'contact', label: 'CONTACT', minWidth: 120 },
  { id: 'dateOfBirth', label: 'DATE OF BIRTH', minWidth: 120 },
  { id: 'gender', label: 'GENDER', minWidth: 80 },
  { id: 'status', label: 'STATUS', minWidth: 100 },
  { id: 'lastVisit', label: 'LAST VISIT', minWidth: 120 },
  { id: 'action', label: 'ACTION', minWidth: 80 },
];

function LoadingSkeleton() {
  return (
    <>
      {[...Array(5)].map((_, index) => (
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
            py: 6,
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
      }}
    >
      <Table sx={{ minWidth: 1000 }} aria-label="patients table">
        <TableHead>
          <TableRow
            sx={{
              backgroundColor: 'grey.50',
            }}
          >
            {tableHeaders.map((header) => (
              <TableCell
                key={header.id}
                sx={{
                  minWidth: header.minWidth,
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  borderBottom: '1px solid',
                  borderBottomColor: 'divider',
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
              <PatientTableRow
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
      {isLoading && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            py: 2,
          }}
        >
          <CircularProgress size={24} />
          <Typography
            variant="body2"
            sx={{
              ml: 2,
              color: 'text.secondary',
            }}
          >
            Loading patients...
          </Typography>
        </Box>
      )}
    </TableContainer>
  );
}
