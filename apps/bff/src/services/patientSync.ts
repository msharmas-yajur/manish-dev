import { config } from '../config/env';
import { logger } from '../config/logger';
import {
  createFrappePatient,
  updateFrappePatient,
  getFrappePatientByAbha,
  getFrappePatientByCaladirusId,
  FrappePatient,
  FrappePatientData,
} from './frappeClient';

// =============================================================================
// Bidirectional Patient Sync Orchestration
// =============================================================================

const BACKEND_URL = config.backendUrl + '/api';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface CaladirusPatient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  abha_id: string | null;
  abha_address: string | null;
  aadhaar_last4: string | null;
  erpnext_patient_id: string | null;
  status: string | null;
  sync_source: string | null;
  last_synced_at: string | null;
}

export interface SyncResult {
  success: boolean;
  caladriusPatientId: string;
  erpnextPatientId: string | null;
  action: 'created' | 'updated' | 'linked';
  message: string;
}

interface ErpnextWebhookPayload {
  name: string;
  patient_name: string;
  first_name?: string;
  sex?: string;
  dob?: string;
  mobile?: string;
  email?: string;
  custom_abha_id?: string;
  custom_abha_address?: string;
  custom_caladrius_id?: string;
  custom_aadhaar_last4?: string;
}

// -----------------------------------------------------------------------------
// Helper: Map gender between systems
// -----------------------------------------------------------------------------

function mapGenderToErpnext(gender: string | null): string | undefined {
  if (!gender) return undefined;
  const normalized = gender.toLowerCase().trim();
  switch (normalized) {
    case 'male': return 'Male';
    case 'female': return 'Female';
    case 'other': return 'Other';
    default: return undefined;
  }
}

function mapGenderFromErpnext(sex: string | undefined): string | null {
  if (!sex) return null;
  const normalized = sex.toLowerCase().trim();
  switch (normalized) {
    case 'male': return 'male';
    case 'female': return 'female';
    case 'other': return 'other';
    default: return null;
  }
}

// -----------------------------------------------------------------------------
// Helper: Build patient_name from first_name and last_name
// -----------------------------------------------------------------------------

function buildPatientName(firstName: string, lastName: string): string {
  return [firstName, lastName].filter(Boolean).join(' ').trim() || 'Unknown';
}

// -----------------------------------------------------------------------------
// Helper: Parse patient_name into first_name and last_name
// -----------------------------------------------------------------------------

function parsePatientName(patientName: string): { firstName: string; lastName: string } {
  const parts = patientName.trim().split(/\s+/);
  const firstName = parts[0] || 'Unknown';
  const lastName = parts.slice(1).join(' ') || '';
  return { firstName, lastName };
}

// -----------------------------------------------------------------------------
// Helper: Fetch patient from FastAPI backend
// -----------------------------------------------------------------------------

async function fetchCaladirusPatient(patientId: string): Promise<CaladirusPatient | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/patients/${patientId}`);
    if (!response.ok) {
      logger.error(
        { status: response.status, patientId },
        'Failed to fetch patient from backend'
      );
      return null;
    }
    return await response.json() as CaladirusPatient;
  } catch (error) {
    logger.error({ error, patientId }, 'Error fetching patient from backend');
    return null;
  }
}

async function fetchCaladirusPatientByAbha(abhaId: string): Promise<CaladirusPatient | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/patients/by-abha/${encodeURIComponent(abhaId)}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      logger.error(
        { status: response.status, abhaId },
        'Failed to fetch patient by ABHA from backend'
      );
      return null;
    }
    return await response.json() as CaladirusPatient;
  } catch (error) {
    logger.error({ error, abhaId }, 'Error fetching patient by ABHA from backend');
    return null;
  }
}

async function fetchCaladirusPatientByErpnextId(erpnextId: string): Promise<CaladirusPatient | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/patients/by-erpnext/${encodeURIComponent(erpnextId)}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      logger.error(
        { status: response.status, erpnextId },
        'Failed to fetch patient by ERPNext ID from backend'
      );
      return null;
    }
    return await response.json() as CaladirusPatient;
  } catch (error) {
    logger.error({ error, erpnextId }, 'Error fetching patient by ERPNext ID from backend');
    return null;
  }
}

// -----------------------------------------------------------------------------
// Helper: Update patient in FastAPI backend
// -----------------------------------------------------------------------------

async function updateCaladirusPatient(
  patientId: string,
  data: Record<string, unknown>
): Promise<CaladirusPatient | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/patients/${patientId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      logger.error(
        { status: response.status, patientId, data },
        'Failed to update patient in backend'
      );
      return null;
    }
    return await response.json() as CaladirusPatient;
  } catch (error) {
    logger.error({ error, patientId }, 'Error updating patient in backend');
    return null;
  }
}

// -----------------------------------------------------------------------------
// Helper: Create patient in FastAPI backend
// -----------------------------------------------------------------------------

async function createCaladirusPatient(
  data: Record<string, unknown>
): Promise<CaladirusPatient | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/patients/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      logger.error(
        { status: response.status, data, errorBody },
        'Failed to create patient in backend'
      );
      return null;
    }
    return await response.json() as CaladirusPatient;
  } catch (error) {
    logger.error({ error, data }, 'Error creating patient in backend');
    return null;
  }
}

// -----------------------------------------------------------------------------
// Sync Patient TO ERPNext (Caladrius -> ERPNext)
// -----------------------------------------------------------------------------

export async function syncPatientToErpnext(caladriusPatientId: string): Promise<SyncResult> {
  logger.info({ caladriusPatientId }, 'Starting sync: Caladrius -> ERPNext');

  // 1. Fetch patient from FastAPI backend
  const patient = await fetchCaladirusPatient(caladriusPatientId);
  if (!patient) {
    return {
      success: false,
      caladriusPatientId,
      erpnextPatientId: null,
      action: 'created',
      message: 'Patient not found in Caladrius',
    };
  }

  // 2. Check if ERPNext patient already exists (by ABHA ID first, then by Caladrius ID)
  let existingFrappePatient: FrappePatient | null = null;

  if (patient.abha_id) {
    existingFrappePatient = await getFrappePatientByAbha(patient.abha_id);
  }

  if (!existingFrappePatient) {
    existingFrappePatient = await getFrappePatientByCaladirusId(patient.id);
  }

  // 3. Build ERPNext patient data
  const patientName = buildPatientName(patient.first_name, patient.last_name);
  const frappeData: FrappePatientData = {
    patient_name: patientName,
    first_name: patient.first_name || undefined,
    sex: mapGenderToErpnext(patient.gender),
    dob: patient.date_of_birth || undefined,
    mobile: patient.phone || undefined,
    email: patient.email || undefined,
    custom_abha_id: patient.abha_id || undefined,
    custom_abha_address: patient.abha_address || undefined,
    custom_caladrius_id: patient.id,
    custom_aadhaar_last4: patient.aadhaar_last4 || undefined,
  };

  let frappePatient: FrappePatient | null = null;
  let action: 'created' | 'updated' | 'linked';

  if (existingFrappePatient) {
    // 4a. Update existing ERPNext patient
    frappePatient = await updateFrappePatient(existingFrappePatient.name, frappeData);
    action = 'updated';
  } else {
    // 4b. Create new ERPNext patient
    frappePatient = await createFrappePatient(frappeData);
    action = 'created';
  }

  if (!frappePatient) {
    return {
      success: false,
      caladriusPatientId,
      erpnextPatientId: existingFrappePatient?.name || null,
      action,
      message: `Failed to ${action === 'created' ? 'create' : 'update'} patient in ERPNext`,
    };
  }

  // 5. Store ERPNext patient name back to PostgreSQL via FastAPI
  const updated = await updateCaladirusPatient(patient.id, {
    erpnext_patient_id: frappePatient.name,
    status: 'LINKED',
    last_synced_at: new Date().toISOString(),
  });

  if (!updated) {
    logger.warn(
      { caladriusPatientId, erpnextPatientId: frappePatient.name },
      'ERPNext patient synced but failed to update link in Caladrius'
    );
  }

  logger.info(
    { caladriusPatientId, erpnextPatientId: frappePatient.name, action },
    'Sync complete: Caladrius -> ERPNext'
  );

  return {
    success: true,
    caladriusPatientId: patient.id,
    erpnextPatientId: frappePatient.name,
    action,
    message: `Patient ${action} in ERPNext and linked`,
  };
}

// -----------------------------------------------------------------------------
// Sync Patient FROM ERPNext (ERPNext -> Caladrius)
// -----------------------------------------------------------------------------

export async function syncPatientFromErpnext(
  erpnextPatient: ErpnextWebhookPayload
): Promise<SyncResult> {
  const erpnextName = erpnextPatient.name;
  logger.info({ erpnextName }, 'Starting sync: ERPNext -> Caladrius');

  // 1. If this patient already has a caladrius_id, it came from us — skip to prevent loop
  if (erpnextPatient.custom_caladrius_id) {
    logger.info(
      { erpnextName, caladriusId: erpnextPatient.custom_caladrius_id },
      'Patient already has Caladrius ID, skipping reverse sync to prevent loop'
    );
    return {
      success: true,
      caladriusPatientId: erpnextPatient.custom_caladrius_id,
      erpnextPatientId: erpnextName,
      action: 'linked',
      message: 'Patient already linked, no action needed',
    };
  }

  // 2. Extract fields from ERPNext patient
  const { firstName, lastName } = parsePatientName(erpnextPatient.patient_name);
  const patientData: Record<string, unknown> = {
    first_name: erpnextPatient.first_name || firstName,
    last_name: lastName,
    date_of_birth: erpnextPatient.dob || null,
    gender: mapGenderFromErpnext(erpnextPatient.sex),
    phone: erpnextPatient.mobile || null,
    email: erpnextPatient.email || null,
    abha_id: erpnextPatient.custom_abha_id || null,
    abha_address: erpnextPatient.custom_abha_address || null,
    aadhaar_last4: erpnextPatient.custom_aadhaar_last4 || null,
    erpnext_patient_id: erpnextName,
    sync_source: 'erpnext',
    status: 'LINKED',
    last_synced_at: new Date().toISOString(),
  };

  // 3. Check if patient already exists in Caladrius (by ABHA ID, then by ERPNext ID)
  let existingPatient: CaladirusPatient | null = null;

  if (erpnextPatient.custom_abha_id) {
    existingPatient = await fetchCaladirusPatientByAbha(erpnextPatient.custom_abha_id);
  }

  if (!existingPatient) {
    existingPatient = await fetchCaladirusPatientByErpnextId(erpnextName);
  }

  let caladriusPatient: CaladirusPatient | null = null;
  let action: 'created' | 'updated' | 'linked';

  if (existingPatient) {
    // 4a. Update existing patient
    caladriusPatient = await updateCaladirusPatient(existingPatient.id, patientData);
    action = 'updated';
  } else {
    // 4b. Create new patient
    caladriusPatient = await createCaladirusPatient(patientData);
    action = 'created';
  }

  if (!caladriusPatient) {
    return {
      success: false,
      caladriusPatientId: existingPatient?.id || '',
      erpnextPatientId: erpnextName,
      action: action!,
      message: `Failed to ${action! === 'created' ? 'create' : 'update'} patient in Caladrius`,
    };
  }

  // 5. Write back custom_caladrius_id to ERPNext
  const writeBack = await updateFrappePatient(erpnextName, {
    custom_caladrius_id: caladriusPatient.id,
  });

  if (!writeBack) {
    logger.warn(
      { erpnextName, caladriusPatientId: caladriusPatient.id },
      'Patient synced to Caladrius but failed to write Caladrius ID back to ERPNext'
    );
  }

  logger.info(
    { caladriusPatientId: caladriusPatient.id, erpnextPatientId: erpnextName, action },
    'Sync complete: ERPNext -> Caladrius'
  );

  return {
    success: true,
    caladriusPatientId: caladriusPatient.id,
    erpnextPatientId: erpnextName,
    action,
    message: `Patient ${action} in Caladrius and linked`,
  };
}
