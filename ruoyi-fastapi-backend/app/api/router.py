from fastapi import APIRouter

from app.api.routes import auth, captcha
from app.api.routes.system import monitor_router, router as system_router

api_router = APIRouter()
api_router.include_router(captcha.router)
api_router.include_router(auth.router)
api_router.include_router(system_router)
api_router.include_router(monitor_router)
