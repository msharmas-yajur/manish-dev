import { useState, useCallback } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  Chip,
  Typography,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import type { PatientFilters as PatientFiltersType } from '../types/patient.types';

interface PatientFiltersProps {
  filters: PatientFiltersType;
  onFilterChange: (filters: Partial<PatientFiltersType>) => void;
}

interface ActiveFilter {
  key: keyof PatientFiltersType;
  label: string;
  value: string;
}

export function PatientFilters({ filters, onFilterChange }: PatientFiltersProps) {
  const [searchValue, setSearchValue] = useState(filters.search);

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setSearchValue(value);
      onFilterChange({ search: value });
    },
    [onFilterChange]
  );

  const handleRemoveFilter = useCallback(
    (filterKey: keyof PatientFiltersType) => {
      if (filterKey === 'search') {
        setSearchValue('');
        onFilterChange({ search: '' });
      } else if (filterKey === 'status') {
        onFilterChange({ status: 'all' });
      } else if (filterKey === 'gender') {
        onFilterChange({ gender: 'all' });
      }
    },
    [onFilterChange]
  );

  // Build list of active filters for display
  const activeFilters: ActiveFilter[] = [];

  if (filters.search && filters.search.trim() !== '') {
    activeFilters.push({
      key: 'search',
      label: 'Search',
      value: filters.search,
    });
  }

  if (filters.status && filters.status !== 'all') {
    activeFilters.push({
      key: 'status',
      label: 'Status',
      value: filters.status,
    });
  }

  if (filters.gender && filters.gender !== 'all') {
    activeFilters.push({
      key: 'gender',
      label: 'Gender',
      value: filters.gender,
    });
  }

  return (
    <Box>
      {/* Search Field */}
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search by name, ABHA number, or phone..."
          value={searchValue}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'background.paper',
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
      </Box>

      {/* Active Filters Section */}
      {activeFilters.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              mr: 1,
            }}
          >
            <FilterListIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                fontWeight: 500,
                fontSize: '0.8125rem',
              }}
            >
              Active Filters:
            </Typography>
          </Box>

          {activeFilters.map((filter) => (
            <Chip
              key={filter.key}
              label={`${filter.label}: ${filter.value}`}
              size="small"
              onDelete={() => handleRemoveFilter(filter.key)}
              deleteIcon={<CloseIcon sx={{ fontSize: 16 }} />}
              sx={{
                backgroundColor: 'primary.50',
                color: 'primary.main',
                fontWeight: 500,
                fontSize: '0.75rem',
                height: 28,
                '& .MuiChip-deleteIcon': {
                  color: 'primary.main',
                  '&:hover': {
                    color: 'primary.dark',
                  },
                },
              }}
            />
          ))}

          {activeFilters.length > 1 && (
            <Chip
              label="Clear All"
              size="small"
              onClick={() => {
                setSearchValue('');
                onFilterChange({
                  search: '',
                  status: 'all',
                  gender: 'all',
                });
              }}
              sx={{
                backgroundColor: 'grey.100',
                color: 'text.secondary',
                fontWeight: 500,
                fontSize: '0.75rem',
                height: 28,
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: 'grey.200',
                },
              }}
            />
          )}
        </Box>
      )}
    </Box>
  );
}
