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
import { PatientSearchBar } from './PatientSearchBar';
import { PatientTable } from './PatientTable';
import { CreatePatientDialog } from './CreatePatientDialog';

interface PatientListProps {
  onViewPatient?: (patientId: string) => void;
  onEditPatient?: (patientId: string) => void;
  onDeletePatient?: (patientId: string) => void;
}

export function PatientList({
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

  // Create patient dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Calculate pagination display values
  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, total);
  const totalPages = Math.ceil(total / pageSize);

  const handleSearchChange = useCallback(
    (value: string) => {
      updateFilters({ search: value });
    },
    [updateFilters]
  );

  const handlePageChange = useCallback(
    (_event: React.ChangeEvent<unknown>, newPage: number) => {
      changePage(newPage);
    },
    [changePage]
  );

  const handleFiltersClick = useCallback(() => {
    // TODO: Implement filters modal
    console.log('Filters clicked');
  }, []);

  const handleExportClick = useCallback(() => {
    // TODO: Implement export functionality
    console.log('Export clicked');
  }, []);

  const handleCreateClick = useCallback(() => {
    setIsCreateDialogOpen(true);
  }, []);

  const handleCreateDialogClose = useCallback(() => {
    setIsCreateDialogOpen(false);
  }, []);

  const handleMethodSelect = useCallback((methodId: string) => {
    console.log('Registration method selected:', methodId);
    // TODO: Navigate to appropriate registration flow
    setIsCreateDialogOpen(false);
  }, []);

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
        flexDirection: 'column',
        minHeight: 'calc(100vh - 64px)', // Account for navbar height
        backgroundColor: 'grey.100',
        p: 3,
      }}
    >
      {/* Search Bar with Actions */}
      <PatientSearchBar
        searchValue={filters.search}
        onSearchChange={handleSearchChange}
        onFiltersClick={handleFiltersClick}
        onExportClick={handleExportClick}
        onCreateClick={handleCreateClick}
      />

      {/* Patient List Card */}
      <Paper
        elevation={0}
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'white',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 2.5,
            borderBottom: '1px solid',
            borderBottomColor: 'divider',
          }}
        >
          <Typography
            variant="h6"
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

        {/* Patient Table */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <PatientTable
            patients={patients}
            isLoading={isLoading}
            onView={onViewPatient}
            onEdit={onEditPatient}
            onDelete={onDeletePatient}
          />
        </Box>

        {/* Footer with Pagination */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 2,
            borderTop: '1px solid',
            borderTopColor: 'divider',
            backgroundColor: 'grey.50',
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              fontSize: '0.875rem',
            }}
          >
            Showing {startIndex}-{endIndex} of {total} patients
          </Typography>

          {!isLoading && totalPages > 1 && (
            <Pagination
              count={totalPages}
              page={page}
              onChange={handlePageChange}
              color="primary"
              shape="rounded"
              size="small"
              sx={{
                '& .MuiPaginationItem-root': {
                  fontWeight: 500,
                  fontSize: '0.875rem',
                },
                '& .Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                },
              }}
            />
          )}
        </Box>
      </Paper>

      {/* Create Patient Dialog */}
      <CreatePatientDialog
        open={isCreateDialogOpen}
        onClose={handleCreateDialogClose}
        onMethodSelect={handleMethodSelect}
      />
    </Box>
  );
}
