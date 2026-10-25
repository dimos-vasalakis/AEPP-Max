import uuid

from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import func, select

from app.core.db import DbSession
from app.core.security import CurrentUser, CurrentUserDep
from app.models import Program
from app.schemas.program import ProgramCreate, ProgramOut, ProgramSummary, ProgramUpdate

router = APIRouter(prefix="/programs", tags=["programs"])


async def owned_program(db: DbSession, user: CurrentUser, program_id: uuid.UUID) -> Program:
    # The app connects as postgres (RLS bypassed): always filter by user_id.
    program = await db.scalar(
        select(Program).where(Program.id == program_id, Program.user_id == user.id)
    )
    if program is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Program not found")
    return program


@router.get("", response_model=list[ProgramSummary])
async def list_programs(user: CurrentUserDep, db: DbSession) -> list[Program]:
    rows = await db.scalars(
        select(Program).where(Program.user_id == user.id).order_by(Program.updated_at.desc())
    )
    return list(rows)


@router.post("", response_model=ProgramOut, status_code=status.HTTP_201_CREATED)
async def create_program(body: ProgramCreate, user: CurrentUserDep, db: DbSession) -> Program:
    program = Program(user_id=user.id, title=body.title, code=body.code)
    db.add(program)
    await db.commit()
    await db.refresh(program)
    return program


@router.get("/{program_id}", response_model=ProgramOut)
async def get_program(program_id: uuid.UUID, user: CurrentUserDep, db: DbSession) -> Program:
    return await owned_program(db, user, program_id)


@router.patch("/{program_id}", response_model=ProgramOut)
async def update_program(
    program_id: uuid.UUID, body: ProgramUpdate, user: CurrentUserDep, db: DbSession
) -> Program:
    program = await owned_program(db, user, program_id)
    for field, value in body.model_dump(exclude_unset=True, exclude_none=True).items():
        setattr(program, field, value)
    program.updated_at = func.now()
    await db.commit()
    await db.refresh(program)
    return program


@router.delete("/{program_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_program(program_id: uuid.UUID, user: CurrentUserDep, db: DbSession) -> Response:
    await db.delete(await owned_program(db, user, program_id))
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
