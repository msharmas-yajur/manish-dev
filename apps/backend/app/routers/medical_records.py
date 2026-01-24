from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
import structlog

from app.config.database import get_postgres_session

router = APIRouter()
logger = structlog.get_logger()


class MedicalRecordCreate(BaseModel):
    patient_id: UUID
    practitioner_id: Optional[UUID] = None
    appointment_id: Optional[UUID] = None
    record_type: str
    snomed_codes: Optional[List[str]] = None
    diagnosis: Optional[str] = None
    treatment_plan: Optional[str] = None
    notes: Optional[str] = None


class MedicalRecordResponse(BaseModel):
    id: UUID
    patient_id: UUID
    practitioner_id: Optional[UUID]
    appointment_id: Optional[UUID]
    record_type: str
    snomed_codes: Optional[List[str]]
    diagnosis: Optional[str]
    treatment_plan: Optional[str]
    notes: Optional[str]


@router.get("/", response_model=List[MedicalRecordResponse])
async def list_medical_records(
    skip: int = 0,
    limit: int = 100,
    patient_id: Optional[UUID] = None,
    record_type: Optional[str] = None,
    session: AsyncSession = Depends(get_postgres_session)
):
    """List medical records with optional filters."""
    query = "SELECT * FROM medical_records WHERE 1=1"
    params = {"limit": limit, "skip": skip}

    if patient_id:
        query += " AND patient_id = :patient_id"
        params["patient_id"] = str(patient_id)

    if record_type:
        query += " AND record_type = :record_type"
        params["record_type"] = record_type

    query += " ORDER BY created_at DESC LIMIT :limit OFFSET :skip"

    result = await session.execute(text(query), params)
    return result.mappings().all()


@router.get("/{record_id}", response_model=MedicalRecordResponse)
async def get_medical_record(
    record_id: UUID,
    session: AsyncSession = Depends(get_postgres_session)
):
    """Get a specific medical record by ID."""
    result = await session.execute(
        text("SELECT * FROM medical_records WHERE id = :id"),
        {"id": str(record_id)}
    )
    record = result.mappings().first()

    if not record:
        raise HTTPException(status_code=404, detail="Medical record not found")

    return record


@router.post("/", response_model=MedicalRecordResponse, status_code=201)
async def create_medical_record(
    record: MedicalRecordCreate,
    session: AsyncSession = Depends(get_postgres_session)
):
    """Create a new medical record."""
    result = await session.execute(
        text("""
            INSERT INTO medical_records (patient_id, practitioner_id, appointment_id, record_type, snomed_codes, diagnosis, treatment_plan, notes)
            VALUES (:patient_id, :practitioner_id, :appointment_id, :record_type, :snomed_codes, :diagnosis, :treatment_plan, :notes)
            RETURNING *
        """),
        {
            "patient_id": str(record.patient_id),
            "practitioner_id": str(record.practitioner_id) if record.practitioner_id else None,
            "appointment_id": str(record.appointment_id) if record.appointment_id else None,
            "record_type": record.record_type,
            "snomed_codes": record.snomed_codes,
            "diagnosis": record.diagnosis,
            "treatment_plan": record.treatment_plan,
            "notes": record.notes,
        }
    )
    await session.commit()
    new_record = result.mappings().first()

    logger.info("Medical record created", record_id=str(new_record["id"]))
    return new_record
