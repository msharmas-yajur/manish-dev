-- Migration: Add patient sync fields for Caladrius <-> ERPNext integration
-- Date: 2026-02-08

ALTER TABLE patients ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS abha_id VARCHAR(50);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS abha_address VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'NOT_LINKED';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS erpnext_patient_id VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS sync_source VARCHAR(20) DEFAULT 'caladrius';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_abha_id ON patients(abha_id) WHERE abha_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_patients_erpnext_id ON patients(erpnext_patient_id);
CREATE INDEX IF NOT EXISTS idx_patients_status ON patients(status);
