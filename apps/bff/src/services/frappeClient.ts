import { config } from '../config/env';
import { logger } from '../config/logger';

// =============================================================================
// Frappe REST API Client
// =============================================================================

const FRAPPE_BASE_URL = config.frappe.internalUrl;

function getFrappeHeaders(): Record<string, string> {
  return {
    'Authorization': `token ${config.frappe.apiKey}:${config.frappe.apiSecret}`,
    'Content-Type': 'application/json',
    'X-Frappe-Site-Name': 'erpnext.localhost',
  };
}

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface FrappePatientData {
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

export interface FrappePatient extends FrappePatientData {
  name: string;
  creation: string;
  modified: string;
  owner: string;
}

interface FrappeResponse<T> {
  data: T;
}

interface FrappeListResponse<T> {
  data: T[];
}

// -----------------------------------------------------------------------------
// Helper: handle Frappe API errors
// -----------------------------------------------------------------------------

async function handleFrappeResponse<T>(
  response: Response,
  context: string
): Promise<T | null> {
  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'Unable to read response body');
    logger.error(
      { status: response.status, body: errorBody, context },
      `Frappe API error: ${context}`
    );
    return null;
  }

  const json = await response.json() as T;
  return json;
}

// -----------------------------------------------------------------------------
// Create a Patient in ERPNext
// -----------------------------------------------------------------------------

export async function createFrappePatient(
  data: FrappePatientData
): Promise<FrappePatient | null> {
  try {
    logger.info({ patientName: data.patient_name }, 'Creating patient in ERPNext');

    const response = await fetch(`${FRAPPE_BASE_URL}/api/resource/Patient`, {
      method: 'POST',
      headers: getFrappeHeaders(),
      body: JSON.stringify(data),
    });

    const result = await handleFrappeResponse<FrappeResponse<FrappePatient>>(
      response,
      'createFrappePatient'
    );

    if (!result) {
      return null;
    }

    logger.info(
      { erpnextName: result.data.name, patientName: result.data.patient_name },
      'Patient created in ERPNext'
    );

    return result.data;
  } catch (error) {
    logger.error({ error, data }, 'Failed to create patient in ERPNext');
    return null;
  }
}

// -----------------------------------------------------------------------------
// Update a Patient in ERPNext
// -----------------------------------------------------------------------------

export async function updateFrappePatient(
  name: string,
  data: Partial<FrappePatientData>
): Promise<FrappePatient | null> {
  try {
    logger.info({ erpnextName: name }, 'Updating patient in ERPNext');

    const response = await fetch(
      `${FRAPPE_BASE_URL}/api/resource/Patient/${encodeURIComponent(name)}`,
      {
        method: 'PUT',
        headers: getFrappeHeaders(),
        body: JSON.stringify(data),
      }
    );

    const result = await handleFrappeResponse<FrappeResponse<FrappePatient>>(
      response,
      'updateFrappePatient'
    );

    if (!result) {
      return null;
    }

    logger.info(
      { erpnextName: result.data.name },
      'Patient updated in ERPNext'
    );

    return result.data;
  } catch (error) {
    logger.error({ error, name, data }, 'Failed to update patient in ERPNext');
    return null;
  }
}

// -----------------------------------------------------------------------------
// Get Patient by ABHA ID
// -----------------------------------------------------------------------------

export async function getFrappePatientByAbha(
  abhaId: string
): Promise<FrappePatient | null> {
  try {
    const filters = JSON.stringify([['custom_abha_id', '=', abhaId]]);
    const fields = JSON.stringify(['*']);
    const url = `${FRAPPE_BASE_URL}/api/resource/Patient?filters=${encodeURIComponent(filters)}&fields=${encodeURIComponent(fields)}&limit_page_length=1`;

    logger.debug({ abhaId }, 'Looking up ERPNext patient by ABHA ID');

    const response = await fetch(url, {
      method: 'GET',
      headers: getFrappeHeaders(),
    });

    const result = await handleFrappeResponse<FrappeListResponse<FrappePatient>>(
      response,
      'getFrappePatientByAbha'
    );

    if (!result || result.data.length === 0) {
      logger.debug({ abhaId }, 'No ERPNext patient found for ABHA ID');
      return null;
    }

    return result.data[0];
  } catch (error) {
    logger.error({ error, abhaId }, 'Failed to look up ERPNext patient by ABHA ID');
    return null;
  }
}

// -----------------------------------------------------------------------------
// Get Patient by Caladrius ID
// -----------------------------------------------------------------------------

export async function getFrappePatientByCaladirusId(
  id: string
): Promise<FrappePatient | null> {
  try {
    const filters = JSON.stringify([['custom_caladrius_id', '=', id]]);
    const fields = JSON.stringify(['*']);
    const url = `${FRAPPE_BASE_URL}/api/resource/Patient?filters=${encodeURIComponent(filters)}&fields=${encodeURIComponent(fields)}&limit_page_length=1`;

    logger.debug({ caladriusId: id }, 'Looking up ERPNext patient by Caladrius ID');

    const response = await fetch(url, {
      method: 'GET',
      headers: getFrappeHeaders(),
    });

    const result = await handleFrappeResponse<FrappeListResponse<FrappePatient>>(
      response,
      'getFrappePatientByCaladirusId'
    );

    if (!result || result.data.length === 0) {
      logger.debug({ caladriusId: id }, 'No ERPNext patient found for Caladrius ID');
      return null;
    }

    return result.data[0];
  } catch (error) {
    logger.error({ error, caladriusId: id }, 'Failed to look up ERPNext patient by Caladrius ID');
    return null;
  }
}
