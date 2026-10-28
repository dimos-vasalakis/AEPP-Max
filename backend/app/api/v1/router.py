from fastapi import APIRouter

from app.api.v1.endpoints import account, agent, billing, contact, health, programs, run

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(run.router)
api_router.include_router(programs.router)
api_router.include_router(agent.router)
api_router.include_router(account.router)
api_router.include_router(billing.router)
api_router.include_router(contact.router)
