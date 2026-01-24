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


class PractitionerCreate(BaseModel):
    license_number: Optional[str] = None
    specialty: Optional[str] = None
    department: Optional[str] = None


class PractitionerResponse(BaseModel):
    id: UUID
    user_id: Optional[UUID]
    license_number: Optional[str]
    specialty: Optional[str]
    department: Optional[str]


@router.get("/", response_model=List[PractitionerResponse])
async def list_practitioners(
    skip: int = 0,
    limit: int = 100,
    specialty: Optional[str] = None,
    session: AsyncSession = Depends(get_postgres_session)
):
    """List all practitioners (paginated)."""
    if specialty:
        result = await session.execute(
            text("SELECT * FROM practitioners WHERE specialty = :specialty ORDER BY created_at DESC LIMIT :limit OFFSET :skip"),
            {"specialty": specialty, "limit": limit, "skip": skip}
        )
    else:
        result = await session.execute(
            text("SELECT * FROM practitioners ORDER BY created_at DESC LIMIT :limit OFFSET :skip"),
            {"limit": limit, "skip": skip}
        )
    return result.mappings().all()


@router.get("/{practitioner_id}", response_model=PractitionerResponse)
async def get_practitioner(
    practitioner_id: UUID,
    session: AsyncSession = Depends(get_postgres_session)
):
    """Get a specific practitioner by ID."""
    result = await session.execute(
        text("SELECT * FROM practitioners WHERE id = :id"),
        {"id": str(practitioner_id)}
    )
    practitioner = result.mappings().first()

    if not practitioner:
        raise HTTPException(status_code=404, detail="Practitioner not found")

    return practitioner


@router.post("/", response_model=PractitionerResponse, status_code=201)
async def create_practitioner(
    practitioner: PractitionerCreate,
    session: AsyncSession = Depends(get_postgres_session)
):
    """Create a new practitioner record."""
    result = await session.execute(
        text("""
            INSERT INTO practitioners (license_number, specialty, department)
            VALUES (:license_number, :specialty, :department)
            RETURNING *
        """),
        {
            "license_number": practitioner.license_number,
            "specialty": practitioner.specialty,
            "department": practitioner.department,
        }
    )
    await session.commit()
    new_practitioner = result.mappings().first()

    logger.info("Practitioner created", practitioner_id=str(new_practitioner["id"]))
    return new_practitioner
