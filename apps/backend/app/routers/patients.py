from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from uuid import UUID
import structlog

from app.config.database import get_postgres_session

router = APIRouter()
logger = structlog.get_logger()


class PatientCreate(BaseModel):
    medical_record_number: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    blood_type: Optional[str] = None
    allergies: Optional[List[str]] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    abha_id: Optional[str] = None
    abha_address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    status: Optional[str] = "NOT_LINKED"
    erpnext_patient_id: Optional[str] = None
    sync_source: Optional[str] = "caladrius"
    last_synced_at: Optional[datetime] = None


class PatientResponse(BaseModel):
    id: UUID
    user_id: Optional[UUID]
    medical_record_number: Optional[str]
    date_of_birth: Optional[date]
    gender: Optional[str]
    blood_type: Optional[str]
    allergies: Optional[List[str]]
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    abha_id: Optional[str] = None
    abha_address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    status: Optional[str] = None
    erpnext_patient_id: Optional[str] = None
    sync_source: Optional[str] = None
    last_synced_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@router.get("/", response_model=List[PatientResponse])
async def list_patients(
    skip: int = 0,
    limit: int = 100,
    x_user_id: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_postgres_session)
):
    """List all patients (paginated)."""
    result = await session.execute(
        text("SELECT * FROM patients ORDER BY created_at DESC LIMIT :limit OFFSET :skip"),
        {"limit": limit, "skip": skip}
    )
    patients = result.mappings().all()
    return patients


@router.get("/by-abha/{abha_id}", response_model=PatientResponse)
async def get_patient_by_abha(
    abha_id: str,
    session: AsyncSession = Depends(get_postgres_session)
):
    """Get a patient by ABHA ID."""
    result = await session.execute(
        text("SELECT * FROM patients WHERE abha_id = :abha_id"),
        {"abha_id": abha_id}
    )
    patient = result.mappings().first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    return patient


@router.get("/by-erpnext/{erpnext_id}", response_model=PatientResponse)
async def get_patient_by_erpnext(
    erpnext_id: str,
    session: AsyncSession = Depends(get_postgres_session)
):
    """Get a patient by ERPNext patient ID."""
    result = await session.execute(
        text("SELECT * FROM patients WHERE erpnext_patient_id = :erpnext_id"),
        {"erpnext_id": erpnext_id}
    )
    patient = result.mappings().first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    return patient


@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient(
    patient_id: UUID,
    session: AsyncSession = Depends(get_postgres_session)
):
    """Get a specific patient by ID."""
    result = await session.execute(
        text("SELECT * FROM patients WHERE id = :id"),
        {"id": str(patient_id)}
    )
    patient = result.mappings().first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    return patient


@router.post("/", response_model=PatientResponse, status_code=201)
async def create_patient(
    patient: PatientCreate,
    x_user_id: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_postgres_session)
):
    """Create a new patient record."""
    result = await session.execute(
        text("""
            INSERT INTO patients (
                user_id, medical_record_number, date_of_birth, gender, blood_type, allergies,
                first_name, last_name, abha_id, abha_address, phone, email,
                status, erpnext_patient_id, sync_source
            )
            VALUES (
                :user_id, :mrn, :dob, :gender, :blood_type, :allergies,
                :first_name, :last_name, :abha_id, :abha_address, :phone, :email,
                :status, :erpnext_patient_id, :sync_source
            )
            RETURNING *
        """),
        {
            "user_id": x_user_id,
            "mrn": patient.medical_record_number,
            "dob": patient.date_of_birth,
            "gender": patient.gender,
            "blood_type": patient.blood_type,
            "allergies": patient.allergies,
            "first_name": patient.first_name,
            "last_name": patient.last_name,
            "abha_id": patient.abha_id,
            "abha_address": patient.abha_address,
            "phone": patient.phone,
            "email": patient.email,
            "status": patient.status,
            "erpnext_patient_id": patient.erpnext_patient_id,
            "sync_source": patient.sync_source,
        }
    )
    await session.commit()
    new_patient = result.mappings().first()

    logger.info("Patient created", patient_id=str(new_patient["id"]))
    return new_patient


@router.put("/{patient_id}", response_model=PatientResponse)
async def update_patient(
    patient_id: UUID,
    patient: PatientCreate,
    session: AsyncSession = Depends(get_postgres_session)
):
    """Update a patient record."""
    result = await session.execute(
        text("""
            UPDATE patients
            SET medical_record_number = COALESCE(:mrn, medical_record_number),
                date_of_birth = COALESCE(:dob, date_of_birth),
                gender = COALESCE(:gender, gender),
                blood_type = COALESCE(:blood_type, blood_type),
                allergies = COALESCE(:allergies, allergies),
                first_name = COALESCE(:first_name, first_name),
                last_name = COALESCE(:last_name, last_name),
                abha_id = COALESCE(:abha_id, abha_id),
                abha_address = COALESCE(:abha_address, abha_address),
                phone = COALESCE(:phone, phone),
                email = COALESCE(:email, email),
                status = COALESCE(:status, status),
                erpnext_patient_id = COALESCE(:erpnext_patient_id, erpnext_patient_id),
                sync_source = COALESCE(:sync_source, sync_source),
                last_synced_at = COALESCE(:last_synced_at, last_synced_at)
            WHERE id = :id
            RETURNING *
        """),
        {
            "id": str(patient_id),
            "mrn": patient.medical_record_number,
            "dob": patient.date_of_birth,
            "gender": patient.gender,
            "blood_type": patient.blood_type,
            "allergies": patient.allergies,
            "first_name": patient.first_name,
            "last_name": patient.last_name,
            "abha_id": patient.abha_id,
            "abha_address": patient.abha_address,
            "phone": patient.phone,
            "email": patient.email,
            "status": patient.status,
            "erpnext_patient_id": patient.erpnext_patient_id,
            "sync_source": patient.sync_source,
            "last_synced_at": patient.last_synced_at,
        }
    )
    await session.commit()
    updated_patient = result.mappings().first()

    if not updated_patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    logger.info("Patient updated", patient_id=str(patient_id))
    return updated_patient


@router.delete("/{patient_id}", status_code=204)
async def delete_patient(
    patient_id: UUID,
    session: AsyncSession = Depends(get_postgres_session)
):
    """Delete a patient record."""
    result = await session.execute(
        text("DELETE FROM patients WHERE id = :id RETURNING id"),
        {"id": str(patient_id)}
    )
    await session.commit()

    if not result.scalar():
        raise HTTPException(status_code=404, detail="Patient not found")

    logger.info("Patient deleted", patient_id=str(patient_id))
