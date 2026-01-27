import { useState, useEffect, useCallback } from 'react';
import { patientService } from '../services/patientService';
import type { Patient, PatientFilters } from '../types/patient.types';

export function usePatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<PatientFilters>({
    search: '',
    status: 'all',
    gender: 'all',
  });

  useEffect(() => {
    const fetchPatients = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await patientService.getPatients(page, pageSize, filters);
        setPatients(data.patients);
        setTotal(data.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load patients');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPatients();
  }, [page, pageSize, filters]);

  const updateFilters = useCallback((newFilters: Partial<PatientFilters>) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      ...newFilters,
    }));
    setPage(1);
  }, []);

  const changePage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const changePageSize = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  }, []);

  const refresh = useCallback(() => {
    setFilters((prevFilters) => ({ ...prevFilters }));
  }, []);

  return {
    patients,
    total,
    page,
    pageSize,
    isLoading,
    error,
    filters,
    updateFilters,
    changePage,
    changePageSize,
    refresh,
  };
}
