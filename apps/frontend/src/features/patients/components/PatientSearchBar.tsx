import { useState, useCallback } from 'react';
import {
  Box,
  TextField,
  Button,
  InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  FileDownload as FileDownloadIcon,
  Add as AddIcon,
} from '@mui/icons-material';

interface PatientSearchBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onFiltersClick?: () => void;
  onExportClick?: () => void;
  onCreateClick?: () => void;
}

export function PatientSearchBar({
  searchValue,
  onSearchChange,
  onFiltersClick,
  onExportClick,
  onCreateClick,
}: PatientSearchBarProps) {
  const [localValue, setLocalValue] = useState(searchValue);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setLocalValue(value);
      onSearchChange(value);
    },
    [onSearchChange]
  );

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        mb: 3,
      }}
    >
      {/* Search Input */}
      <TextField
        fullWidth
        size="small"
        placeholder="Search by name, ID, ABHA, or mobile number..."
        value={localValue}
        onChange={handleChange}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
            </InputAdornment>
          ),
        }}
        sx={{
          flex: 1,
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'white',
            borderRadius: 2,
            '& fieldset': {
              borderColor: 'divider',
            },
            '&:hover fieldset': {
              borderColor: 'primary.main',
            },
            '&.Mui-focused fieldset': {
              borderColor: 'primary.main',
            },
          },
          '& .MuiOutlinedInput-input': {
            py: 1.25,
            fontSize: '0.875rem',
          },
        }}
      />

      {/* Filters Button */}
      <Button
        variant="outlined"
        startIcon={<FilterListIcon />}
        onClick={onFiltersClick}
        sx={{
          textTransform: 'none',
          fontWeight: 500,
          borderColor: 'divider',
          color: 'text.primary',
          backgroundColor: 'white',
          px: 2.5,
          py: 1,
          borderRadius: 2,
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: 'primary.50',
          },
        }}
      >
        Filters
      </Button>

      {/* Export Button */}
      <Button
        variant="outlined"
        startIcon={<FileDownloadIcon />}
        onClick={onExportClick}
        sx={{
          textTransform: 'none',
          fontWeight: 500,
          borderColor: 'divider',
          color: 'text.primary',
          backgroundColor: 'white',
          px: 2.5,
          py: 1,
          borderRadius: 2,
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: 'primary.50',
          },
        }}
      >
        Export
      </Button>

      {/* Create New Patient Button */}
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={onCreateClick}
        sx={{
          textTransform: 'none',
          fontWeight: 500,
          px: 2.5,
          py: 1,
          borderRadius: 2,
          backgroundColor: 'primary.main',
          '&:hover': {
            backgroundColor: 'primary.dark',
          },
        }}
      >
        Create New Patient
      </Button>
    </Box>
  );
}
