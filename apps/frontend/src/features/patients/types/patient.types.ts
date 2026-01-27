// Patient feature type definitions

export type PatientStatus = 'LINKED' | 'ACTIVE' | 'INACTIVE';

export type PatientGender = 'Male' | 'Female' | 'Other';

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  abhaNumber: string;
  email?: string;
  phone?: string;
  dateOfBirth: string;
  gender: PatientGender;
  status: PatientStatus;
  lastVisit?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PatientFilters {
  search: string;
  status: PatientStatus | 'all';
  gender: PatientGender | 'all';
}

export interface PatientsResponse {
  patients: Patient[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreatePatientRequest {
  firstName: string;
  lastName: string;
  abhaNumber: string;
  email?: string;
  phone?: string;
  dateOfBirth: string;
  gender: PatientGender;
}

export interface UpdatePatientRequest extends Partial<CreatePatientRequest> {
  status?: PatientStatus;
}

export interface PatientTableColumn {
  id: keyof Patient | 'action';
  label: string;
  minWidth?: number;
  align?: 'left' | 'center' | 'right';
}
