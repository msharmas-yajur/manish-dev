from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID
import structlog

from app.config.database import get_postgres_session

router = APIRouter()
logger = structlog.get_logger()


class AppointmentCreate(BaseModel):
    patient_id: UUID
    practitioner_id: UUID
    scheduled_at: datetime
    duration_minutes: int = 30
    appointment_type: Optional[str] = None
    notes: Optional[str] = None


class AppointmentUpdate(BaseModel):
    scheduled_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    status: Optional[str] = None
    appointment_type: Optional[str] = None
    notes: Optional[str] = None
    livekit_room_id: Optional[str] = None


class AppointmentResponse(BaseModel):
    id: UUID
    patient_id: UUID
    practitioner_id: UUID
    scheduled_at: datetime
    duration_minutes: int
    status: str
    appointment_type: Optional[str]
    notes: Optional[str]
    livekit_room_id: Optional[str]


@router.get("/", response_model=List[AppointmentResponse])
async def list_appointments(
    skip: int = 0,
    limit: int = 100,
    patient_id: Optional[UUID] = None,
    practitioner_id: Optional[UUID] = None,
    status: Optional[str] = None,
    session: AsyncSession = Depends(get_postgres_session)
):
    """List appointments with optional filters."""
    query = "SELECT * FROM appointments WHERE 1=1"
    params = {"limit": limit, "skip": skip}

    if patient_id:
        query += " AND patient_id = :patient_id"
        params["patient_id"] = str(patient_id)

    if practitioner_id:
        query += " AND practitioner_id = :practitioner_id"
        params["practitioner_id"] = str(practitioner_id)

    if status:
        query += " AND status = :status"
        params["status"] = status

    query += " ORDER BY scheduled_at DESC LIMIT :limit OFFSET :skip"

    result = await session.execute(text(query), params)
    return result.mappings().all()


@router.get("/{appointment_id}", response_model=AppointmentResponse)
async def get_appointment(
    appointment_id: UUID,
    session: AsyncSession = Depends(get_postgres_session)
):
    """Get a specific appointment by ID."""
    result = await session.execute(
        text("SELECT * FROM appointments WHERE id = :id"),
        {"id": str(appointment_id)}
    )
    appointment = result.mappings().first()

    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    return appointment


@router.post("/", response_model=AppointmentResponse, status_code=201)
async def create_appointment(
    appointment: AppointmentCreate,
    session: AsyncSession = Depends(get_postgres_session)
):
    """Create a new appointment."""
    result = await session.execute(
        text("""
            INSERT INTO appointments (patient_id, practitioner_id, scheduled_at, duration_minutes, appointment_type, notes)
            VALUES (:patient_id, :practitioner_id, :scheduled_at, :duration, :type, :notes)
            RETURNING *
        """),
        {
            "patient_id": str(appointment.patient_id),
            "practitioner_id": str(appointment.practitioner_id),
            "scheduled_at": appointment.scheduled_at,
            "duration": appointment.duration_minutes,
            "type": appointment.appointment_type,
            "notes": appointment.notes,
        }
    )
    await session.commit()
    new_appointment = result.mappings().first()

    logger.info("Appointment created", appointment_id=str(new_appointment["id"]))
    return new_appointment


@router.patch("/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(
    appointment_id: UUID,
    update: AppointmentUpdate,
    session: AsyncSession = Depends(get_postgres_session)
):
    """Update an appointment."""
    updates = []
    params = {"id": str(appointment_id)}

    if update.scheduled_at is not None:
        updates.append("scheduled_at = :scheduled_at")
        params["scheduled_at"] = update.scheduled_at

    if update.duration_minutes is not None:
        updates.append("duration_minutes = :duration")
        params["duration"] = update.duration_minutes

    if update.status is not None:
        updates.append("status = :status")
        params["status"] = update.status

    if update.appointment_type is not None:
        updates.append("appointment_type = :type")
        params["type"] = update.appointment_type

    if update.notes is not None:
        updates.append("notes = :notes")
        params["notes"] = update.notes

    if update.livekit_room_id is not None:
        updates.append("livekit_room_id = :room_id")
        params["room_id"] = update.livekit_room_id

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    query = f"UPDATE appointments SET {', '.join(updates)} WHERE id = :id RETURNING *"
    result = await session.execute(text(query), params)
    await session.commit()

    updated = result.mappings().first()
    if not updated:
        raise HTTPException(status_code=404, detail="Appointment not found")

    logger.info("Appointment updated", appointment_id=str(appointment_id))
    return updated
