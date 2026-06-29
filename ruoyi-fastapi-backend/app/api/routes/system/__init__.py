"""系统管理 + 监控路由 — 按领域拆分后统一汇总"""
from fastapi import APIRouter

from app.api.routes.system.config import router as config_router
from app.api.routes.system.dept import router as dept_router
from app.api.routes.system.dict import router as dict_router
from app.api.routes.system.log import monitor_router
from app.api.routes.system.menu import router as menu_router
from app.api.routes.system.post import router as post_router
from app.api.routes.system.role import router as role_router
from app.api.routes.system.user import router as user_router

router = APIRouter()
router.include_router(user_router)
router.include_router(role_router)
router.include_router(menu_router)
router.include_router(dept_router)
router.include_router(post_router)
router.include_router(config_router)
router.include_router(dict_router)
