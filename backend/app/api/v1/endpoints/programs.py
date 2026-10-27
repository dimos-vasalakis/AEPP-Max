import uuid

from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import func, select

from app.core.db import DbSession, has_migration
from app.core.plans import plan_for
from app.core.security import CurrentUser, CurrentUserDep
from app.models import Program
from app.schemas.program import ProgramCreate, ProgramOut, ProgramSummary, ProgramUpdate

router = APIRouter(prefix="/programs", tags=["programs"])


async def require_programs(db: DbSession) -> None:
    """The language column (migration 0004); migrations don't run on deploy."""
    if not await has_migration(db, "0004"):
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Programs need migration 0004")


async def owned_program(db: DbSession, user: CurrentUser, program_id: uuid.UUID) -> Program:
    await require_programs(db)
    # The app connects as postgres (RLS bypassed): always filter by user_id.
    program = await db.scalar(
        select(Program).where(Program.id == program_id, Program.user_id == user.id)
    )
    if program is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Program not found")
    return program


@router.get("", response_model=list[ProgramSummary])
async def list_programs(user: CurrentUserDep, db: DbSession) -> list[ProgramSummary]:
    await require_programs(db)
    # The summary's columns only: not every program's code.
    rows = await db.execute(
        select(Program.id, Program.title, Program.language, Program.updated_at)
        .where(Program.user_id == user.id)
        .order_by(Program.updated_at.desc())
    )
    return [ProgramSummary.model_validate(row) for row in rows]


@router.post("", response_model=ProgramOut, status_code=status.HTTP_201_CREATED)
async def create_program(body: ProgramCreate, user: CurrentUserDep, db: DbSession) -> Program:
    await require_programs(db)
    # One create per user at a time (two tabs, a save and a copy), so the count
    # below can't let both through at the plan's limit - 1. Released at commit.
    await db.execute(select(func.pg_advisory_xact_lock(func.hashtext(str(user.id)))))
    count = await db.scalar(
        select(func.count()).select_from(Program).where(Program.user_id == user.id)
    )
    # Programs and algorithms together (core/plans.py).
    if count is not None and count >= (await plan_for(db, user.id)).max_programs:
        raise HTTPException(status.HTTP_409_CONFLICT, "Program limit reached")
    program = Program(user_id=user.id, title=body.title, code=body.code, language=body.language)
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
