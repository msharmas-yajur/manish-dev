import type {
  Patient,
  PatientFilters,
  PatientsResponse,
  CreatePatientRequest,
  UpdatePatientRequest,
} from '../types/patient.types';

const API_BASE = '/api/backend/patients';

// Mock data for development when backend is not available
const mockPatients: Patient[] = [
  {
    id: 'p-001',
    firstName: 'Rajesh',
    lastName: 'Kumar',
    fullName: 'Rajesh Kumar',
    abhaNumber: '91-1234-5678-9012',
    phone: '+91 98765 43210',
    dateOfBirth: '1985-03-15',
    gender: 'Male',
    status: 'LINKED',
    lastVisit: '2026-01-20',
    createdAt: '2025-06-10T10:30:00Z',
    updatedAt: '2026-01-20T14:45:00Z',
  },
  {
    id: 'p-002',
    firstName: 'Priya',
    lastName: 'Sharma',
    fullName: 'Priya Sharma',
    abhaNumber: '91-2345-6789-0123',
    phone: '+91 87654 32109',
    dateOfBirth: '1992-07-22',
    gender: 'Female',
    status: 'LINKED',
    lastVisit: '2026-01-18',
    createdAt: '2025-08-05T09:15:00Z',
    updatedAt: '2026-01-18T11:20:00Z',
  },
  {
    id: 'p-003',
    firstName: 'Amit',
    lastName: 'Patel',
    fullName: 'Amit Patel',
    abhaNumber: '91-3456-7890-1234',
    phone: '+91 76543 21098',
    dateOfBirth: '1978-11-08',
    gender: 'Male',
    status: 'LINKED',
    lastVisit: '2026-01-15',
    createdAt: '2025-04-20T14:00:00Z',
    updatedAt: '2026-01-15T16:30:00Z',
  },
  {
    id: 'p-004',
    firstName: 'Sunita',
    lastName: 'Reddy',
    fullName: 'Sunita Reddy',
    abhaNumber: '91-4567-8901-2345',
    phone: '+91 65432 10987',
    dateOfBirth: '1988-05-30',
    gender: 'Female',
    status: 'LINKED',
    lastVisit: '2026-01-22',
    createdAt: '2025-09-12T08:45:00Z',
    updatedAt: '2026-01-22T10:15:00Z',
  },
  {
    id: 'p-005',
    firstName: 'Vikram',
    lastName: 'Singh',
    fullName: 'Vikram Singh',
    abhaNumber: '91-5678-9012-3456',
    phone: '+91 54321 09876',
    dateOfBirth: '1995-01-12',
    gender: 'Male',
    status: 'LINKED',
    lastVisit: '2026-01-10',
    createdAt: '2025-11-28T12:00:00Z',
    updatedAt: '2026-01-10T09:30:00Z',
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
        patient.abhaNumber.toLowerCase().includes(searchLower) ||
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
    pageSize: number = 10,
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

      const response = await fetch(`${API_BASE}?${queryParams.toString()}`);

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
      const response = await fetch(`${API_BASE}/${id}`);

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
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        // Fallback: create mock patient
        const newPatient: Patient = {
          id: `p-${Date.now()}`,
          firstName: data.firstName,
          lastName: data.lastName,
          fullName: `${data.firstName} ${data.lastName}`,
          abhaNumber: data.abhaNumber,
          email: data.email,
          phone: data.phone,
          dateOfBirth: data.dateOfBirth,
          gender: data.gender,
          status: 'LINKED',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        mockPatients.push(newPatient);
        return newPatient;
      }

      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        // Fallback: create mock patient
        const newPatient: Patient = {
          id: `p-${Date.now()}`,
          firstName: data.firstName,
          lastName: data.lastName,
          fullName: `${data.firstName} ${data.lastName}`,
          abhaNumber: data.abhaNumber,
          email: data.email,
          phone: data.phone,
          dateOfBirth: data.dateOfBirth,
          gender: data.gender,
          status: 'LINKED',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        mockPatients.push(newPatient);
        return newPatient;
      }

      return response.json();
    } catch {
      // Fallback: create mock patient
      const newPatient: Patient = {
        id: `p-${Date.now()}`,
        firstName: data.firstName,
        lastName: data.lastName,
        fullName: `${data.firstName} ${data.lastName}`,
        abhaNumber: data.abhaNumber,
        email: data.email,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        status: 'LINKED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockPatients.push(newPatient);
      return newPatient;
    }
  },

  /**
   * Update an existing patient
   */
  async updatePatient(id: string, data: UpdatePatientRequest): Promise<Patient | null> {
    try {
      const response = await fetch(`${API_BASE}/${id}`, {
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
      const response = await fetch(`${API_BASE}/${id}`, {
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
