"""认证依赖 — get_current_user + require_perm"""
from app.api.deps import interceptors  # noqa: F401

from app.api.deps.auth import get_current_user, require_perm  # noqa: F401
