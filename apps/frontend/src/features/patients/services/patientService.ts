import type {
  Patient,
  PatientFilters,
  PatientsResponse,
  CreatePatientRequest,
  UpdatePatientRequest,
} from '../types/patient.types';
import { apiFetch } from '../../../utils/api';

const API_BASE = '/api/backend/patients';

// Mock data for development when backend is not available
// Patient names and data matching the design screenshots
const mockPatients: Patient[] = [
  {
    id: '2025971',
    firstName: 'Chitra',
    lastName: 'K',
    fullName: 'Chitra K',
    abhaNumber: '',
    abhaAddress: '',
    phone: '6875421366',
    dateOfBirth: '2003-03-06',
    gender: 'Female',
    status: 'NOT_LINKED',
    lastVisit: '2026-01-22',
    createdAt: '2025-06-10T10:30:00Z',
    updatedAt: '2026-01-22T14:45:00Z',
  },
  {
    id: '2025069',
    firstName: 'Clark',
    lastName: 'Kent',
    fullName: 'Clark Kent',
    abhaNumber: '',
    abhaAddress: '',
    phone: '8745236558',
    dateOfBirth: '1975-07-09',
    gender: 'Male',
    status: 'NOT_LINKED',
    lastVisit: '2026-01-21',
    createdAt: '2025-08-05T09:15:00Z',
    updatedAt: '2026-01-21T11:20:00Z',
  },
  {
    id: '2025331',
    firstName: 'Sheela',
    lastName: 'Vijay',
    fullName: 'Sheela Vijay',
    abhaNumber: '',
    abhaAddress: '',
    phone: '8532145785',
    dateOfBirth: '1973-03-01',
    gender: 'Female',
    status: 'NOT_LINKED',
    lastVisit: '2026-01-13',
    createdAt: '2025-04-20T14:00:00Z',
    updatedAt: '2026-01-13T16:30:00Z',
  },
  {
    id: '2025599',
    firstName: 'Leela',
    lastName: 'Indhiran',
    fullName: 'Leela Indhiran',
    abhaNumber: '',
    abhaAddress: '',
    phone: '9872135425',
    dateOfBirth: '1988-03-03',
    gender: 'Female',
    status: 'NOT_LINKED',
    lastVisit: '2026-01-13',
    createdAt: '2025-09-12T08:45:00Z',
    updatedAt: '2026-01-13T10:15:00Z',
  },
  {
    id: '2025801',
    firstName: 'Radhe',
    lastName: 'Rathod',
    fullName: 'Radhe Rathod',
    abhaNumber: '',
    abhaAddress: '',
    phone: '6854585565',
    dateOfBirth: '1990-06-07',
    gender: 'Male',
    status: 'NOT_LINKED',
    lastVisit: '2026-01-12',
    createdAt: '2025-11-28T12:00:00Z',
    updatedAt: '2026-01-12T09:30:00Z',
  },
  {
    id: '2025969',
    firstName: 'Nancy',
    lastName: 'Wheeler',
    fullName: 'Nancy Wheeler',
    abhaNumber: '',
    abhaAddress: '',
    phone: '8745236585',
    dateOfBirth: '1965-06-08',
    gender: 'Female',
    status: 'NOT_LINKED',
    lastVisit: '2026-01-08',
    createdAt: '2025-03-15T10:00:00Z',
    updatedAt: '2026-01-08T14:30:00Z',
  },
  {
    id: '2025062',
    firstName: 'Ethan',
    lastName: 'Hunt',
    fullName: 'Ethan Hunt',
    abhaNumber: '',
    abhaAddress: '',
    phone: '8548545854',
    dateOfBirth: '1985-02-07',
    gender: 'Male',
    status: 'NOT_LINKED',
    lastVisit: '2026-01-08',
    createdAt: '2025-07-20T11:00:00Z',
    updatedAt: '2026-01-08T16:00:00Z',
  },
  {
    id: '2025370',
    firstName: 'Jane',
    lastName: 'Doe',
    fullName: 'Jane Doe',
    abhaNumber: '',
    abhaAddress: '',
    phone: '9875487548',
    dateOfBirth: '1999-02-09',
    gender: 'Female',
    status: 'NOT_LINKED',
    lastVisit: '2025-12-31',
    createdAt: '2025-01-10T09:00:00Z',
    updatedAt: '2025-12-31T12:00:00Z',
  },
  {
    id: '2025123',
    firstName: 'John',
    lastName: 'Smith',
    fullName: 'John Smith',
    abhaNumber: '91-1234-5678-9012',
    abhaAddress: 'john.smith@abha',
    phone: '9876543210',
    dateOfBirth: '1982-05-15',
    gender: 'Male',
    status: 'LINKED',
    lastVisit: '2026-01-20',
    createdAt: '2024-12-01T08:00:00Z',
    updatedAt: '2026-01-20T10:30:00Z',
  },
  {
    id: '2025456',
    firstName: 'Priya',
    lastName: 'Sharma',
    fullName: 'Priya Sharma',
    abhaNumber: '91-2345-6789-0123',
    abhaAddress: 'priya.sharma@abha',
    phone: '8765432109',
    dateOfBirth: '1990-11-22',
    gender: 'Female',
    status: 'LINKED',
    lastVisit: '2026-01-18',
    createdAt: '2025-02-14T13:00:00Z',
    updatedAt: '2026-01-18T15:45:00Z',
  },
];

// Helper function to filter mock patients
function filterMockPatients(
  patients: Patient[],
  filters: PatientFilters
): Patient[] {
  return patients.filter((patient) => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch =
        patient.fullName.toLowerCase().includes(searchLower) ||
        patient.id.toLowerCase().includes(searchLower) ||
        patient.abhaNumber?.toLowerCase().includes(searchLower) ||
        patient.phone?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Status filter
    if (filters.status !== 'all' && patient.status !== filters.status) {
      return false;
    }

    // Gender filter
    if (filters.gender !== 'all' && patient.gender !== filters.gender) {
      return false;
    }

    return true;
  });
}

// Helper function to paginate mock patients
function paginateMockPatients(
  patients: Patient[],
  page: number,
  pageSize: number
): PatientsResponse {
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedPatients = patients.slice(startIndex, endIndex);

  return {
    patients: paginatedPatients,
    total: patients.length,
    page,
    pageSize,
  };
}

// Helper function to get mock response for patients list
function getMockPatientsResponse(
  page: number,
  pageSize: number,
  filters: PatientFilters
): PatientsResponse {
  const filteredPatients = filterMockPatients(mockPatients, filters);
  return paginateMockPatients(filteredPatients, page, pageSize);
}

export const patientService = {
  /**
   * Get paginated list of patients with optional filters
   */
  async getPatients(
    page: number = 1,
    pageSize: number = 8,
    filters: PatientFilters = { search: '', status: 'all', gender: 'all' }
  ): Promise<PatientsResponse> {
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        search: filters.search || '',
        status: filters.status || 'all',
        gender: filters.gender || 'all',
      });

      const response = await apiFetch(`${API_BASE}?${queryParams.toString()}`);

      if (!response.ok) {
        return getMockPatientsResponse(page, pageSize, filters);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        return getMockPatientsResponse(page, pageSize, filters);
      }

      return response.json();
    } catch {
      return getMockPatientsResponse(page, pageSize, filters);
    }
  },

  /**
   * Get a single patient by ID
   */
  async getPatientById(id: string): Promise<Patient | null> {
    try {
      const response = await apiFetch(`${API_BASE}/${id}`);

      if (!response.ok) {
        // Fallback to mock data
        const mockPatient = mockPatients.find((p) => p.id === id);
        return mockPatient || null;
      }

      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        const mockPatient = mockPatients.find((p) => p.id === id);
        return mockPatient || null;
      }

      return response.json();
    } catch {
      // Fallback to mock data
      const mockPatient = mockPatients.find((p) => p.id === id);
      return mockPatient || null;
    }
  },

  /**
   * Create a new patient
   */
  async createPatient(data: CreatePatientRequest): Promise<Patient> {
    try {
      const response = await apiFetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        // Fallback: create mock patient
        const newPatient: Patient = {
          id: `${Date.now()}`,
          firstName: data.firstName,
          lastName: data.lastName,
          fullName: `${data.firstName} ${data.lastName}`,
          abhaNumber: data.abhaNumber || '',
          email: data.email,
          phone: data.phone,
          dateOfBirth: data.dateOfBirth,
          gender: data.gender,
          status: data.abhaNumber ? 'LINKED' : 'NOT_LINKED',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        mockPatients.unshift(newPatient);
        return newPatient;
      }

      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        // Fallback: create mock patient
        const newPatient: Patient = {
          id: `${Date.now()}`,
          firstName: data.firstName,
          lastName: data.lastName,
          fullName: `${data.firstName} ${data.lastName}`,
          abhaNumber: data.abhaNumber || '',
          email: data.email,
          phone: data.phone,
          dateOfBirth: data.dateOfBirth,
          gender: data.gender,
          status: data.abhaNumber ? 'LINKED' : 'NOT_LINKED',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        mockPatients.unshift(newPatient);
        return newPatient;
      }

      return response.json();
    } catch {
      // Fallback: create mock patient
      const newPatient: Patient = {
        id: `${Date.now()}`,
        firstName: data.firstName,
        lastName: data.lastName,
        fullName: `${data.firstName} ${data.lastName}`,
        abhaNumber: data.abhaNumber || '',
        email: data.email,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        status: data.abhaNumber ? 'LINKED' : 'NOT_LINKED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockPatients.unshift(newPatient);
      return newPatient;
    }
  },

  /**
   * Update an existing patient
   */
  async updatePatient(id: string, data: UpdatePatientRequest): Promise<Patient | null> {
    try {
      const response = await apiFetch(`${API_BASE}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        // Fallback: update mock patient
        const patientIndex = mockPatients.findIndex((p) => p.id === id);
        if (patientIndex === -1) return null;

        const existingPatient = mockPatients[patientIndex];
        const updatedPatient: Patient = {
          ...existingPatient,
          ...data,
          fullName: data.firstName && data.lastName
            ? `${data.firstName} ${data.lastName}`
            : data.firstName
            ? `${data.firstName} ${existingPatient.lastName}`
            : data.lastName
            ? `${existingPatient.firstName} ${data.lastName}`
            : existingPatient.fullName,
          updatedAt: new Date().toISOString(),
        };
        mockPatients[patientIndex] = updatedPatient;
        return updatedPatient;
      }

      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        // Fallback: update mock patient
        const patientIndex = mockPatients.findIndex((p) => p.id === id);
        if (patientIndex === -1) return null;

        const existingPatient = mockPatients[patientIndex];
        const updatedPatient: Patient = {
          ...existingPatient,
          ...data,
          fullName: data.firstName && data.lastName
            ? `${data.firstName} ${data.lastName}`
            : data.firstName
            ? `${data.firstName} ${existingPatient.lastName}`
            : data.lastName
            ? `${existingPatient.firstName} ${data.lastName}`
            : existingPatient.fullName,
          updatedAt: new Date().toISOString(),
        };
        mockPatients[patientIndex] = updatedPatient;
        return updatedPatient;
      }

      return response.json();
    } catch {
      // Fallback: update mock patient
      const patientIndex = mockPatients.findIndex((p) => p.id === id);
      if (patientIndex === -1) return null;

      const existingPatient = mockPatients[patientIndex];
      const updatedPatient: Patient = {
        ...existingPatient,
        ...data,
        fullName: data.firstName && data.lastName
          ? `${data.firstName} ${data.lastName}`
          : data.firstName
          ? `${data.firstName} ${existingPatient.lastName}`
          : data.lastName
          ? `${existingPatient.firstName} ${data.lastName}`
          : existingPatient.fullName,
        updatedAt: new Date().toISOString(),
      };
      mockPatients[patientIndex] = updatedPatient;
      return updatedPatient;
    }
  },

  /**
   * Delete a patient by ID
   */
  async deletePatient(id: string): Promise<boolean> {
    try {
      const response = await apiFetch(`${API_BASE}/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        // Fallback: delete from mock data
        const patientIndex = mockPatients.findIndex((p) => p.id === id);
        if (patientIndex === -1) return false;
        mockPatients.splice(patientIndex, 1);
        return true;
      }

      return true;
    } catch {
      // Fallback: delete from mock data
      const patientIndex = mockPatients.findIndex((p) => p.id === id);
      if (patientIndex === -1) return false;
      mockPatients.splice(patientIndex, 1);
      return true;
    }
  },
};
