import { useCallback, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Pagination,
  CircularProgress,
  Alert,
} from '@mui/material';
import { usePatients } from '../hooks/usePatients';
import { PatientFilters } from './PatientFilters';
import { PatientTable } from './PatientTable';
import { CreatePatientPanel } from './CreatePatientPanel';
import type { PatientFilters as PatientFiltersType } from '../types/patient.types';

interface PatientListProps {
  showCreatePanel?: boolean;
  onCreatePanelClose?: () => void;
  onMethodSelect?: (methodId: string) => void;
  onViewPatient?: (patientId: string) => void;
  onEditPatient?: (patientId: string) => void;
  onDeletePatient?: (patientId: string) => void;
}

export function PatientList({
  showCreatePanel = true,
  onCreatePanelClose,
  onMethodSelect,
  onViewPatient,
  onEditPatient,
  onDeletePatient,
}: PatientListProps) {
  const {
    patients,
    total,
    page,
    pageSize,
    filters,
    isLoading,
    error,
    updateFilters,
    changePage,
  } = usePatients();

  const [isPanelOpen, setIsPanelOpen] = useState(showCreatePanel);

  // Calculate pagination display values
  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, total);
  const totalPages = Math.ceil(total / pageSize);

  const handleFilterChange = useCallback(
    (newFilters: Partial<PatientFiltersType>) => {
      updateFilters(newFilters);
    },
    [updateFilters]
  );

  const handlePageChange = useCallback(
    (_event: React.ChangeEvent<unknown>, newPage: number) => {
      changePage(newPage);
    },
    [changePage]
  );

  const handlePanelClose = useCallback(() => {
    setIsPanelOpen(false);
    onCreatePanelClose?.();
  }, [onCreatePanelClose]);

  const handleMethodSelect = useCallback(
    (methodId: string) => {
      onMethodSelect?.(methodId);
    },
    [onMethodSelect]
  );

  // Error state
  if (error && !isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 3,
        p: 3,
        minHeight: 'calc(100vh - 64px)', // Account for navbar height
        backgroundColor: 'grey.50',
      }}
    >
      {/* Left Panel - Create Patient */}
      {isPanelOpen && (
        <CreatePatientPanel
          onMethodSelect={handleMethodSelect}
          onCancel={handlePanelClose}
        />
      )}

      {/* Right Section - Patient List */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0, // Allow flexbox to shrink
        }}
      >
        {/* Header */}
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
          {/* Title and Count */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Typography
              variant="h5"
              sx={{
                fontWeight: 600,
                color: 'text.primary',
              }}
            >
              Patient List
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                fontWeight: 500,
              }}
            >
              {isLoading ? (
                <Box
                  component="span"
                  sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  <CircularProgress size={14} />
                  Loading...
                </Box>
              ) : (
                `Showing ${startIndex}-${endIndex} of ${total} patients`
              )}
            </Typography>
          </Box>

          {/* Filters */}
          <PatientFilters
            filters={filters}
            onFilterChange={handleFilterChange}
          />
        </Paper>

        {/* Patient Table */}
        <Box sx={{ flex: 1, mb: 3 }}>
          <PatientTable
            patients={patients}
            isLoading={isLoading}
            onView={onViewPatient}
            onEdit={onEditPatient}
            onDelete={onDeletePatient}
          />
        </Box>

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              py: 2,
            }}
          >
            <Pagination
              count={totalPages}
              page={page}
              onChange={handlePageChange}
              color="primary"
              shape="rounded"
              showFirstButton
              showLastButton
              sx={{
                '& .MuiPaginationItem-root': {
                  fontWeight: 500,
                },
              }}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
}
