from fastapi import APIRouter

from app.api.routes import auth, captcha, system

api_router = APIRouter()
api_router.include_router(captcha.router)
api_router.include_router(auth.router)
api_router.include_router(system.router)
api_router.include_router(system.monitor_router)
