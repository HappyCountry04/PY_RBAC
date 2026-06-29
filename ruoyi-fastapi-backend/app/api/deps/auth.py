"""认证依赖：JWT 解析 + RBAC 权限校验 + 令牌滑动过期"""
from typing import Annotated

from fastapi import Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import decode_token
from app.db.redis import redis_client
from app.db.session import get_db
from app.services.rbac import (
    LoginUser,
    get_menu_permissions,
    get_role_keys,
    get_user_by_id,
    has_permission,
)


async def get_current_user(
    db: Annotated[AsyncSession, Depends(get_db)],
    authorization: Annotated[str | None, Header()] = None,
) -> LoginUser:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="未认证")
    token = authorization.split(" ", 1)[1]
    try:
        payload = decode_token(token)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="登录状态已过期") from exc
    token_id = payload.get("jti")
    token_key = f"login_tokens:{token_id}"
    if token_id and await redis_client.exists(token_key) == 0:
        raise HTTPException(status_code=401, detail="登录状态已失效")
    # 滑动过期：剩余时间不足阈值时自动续期
    if token_id:
        remaining = await redis_client.ttl(token_key)
        threshold = settings.token_refresh_threshold_minutes * 60
        if 0 < remaining < threshold:
            await redis_client.expire(token_key, settings.access_token_expire_minutes * 60)
    user = await get_user_by_id(db, int(payload["sub"]))
    if user is None or user.status != "0":
        raise HTTPException(status_code=401, detail="用户不存在或已停用")
    permissions = await get_menu_permissions(db, user)
    roles = await get_role_keys(user)
    return LoginUser(user=user, permissions=permissions, roles=roles, token_id=token_id)


def require_perm(permission: str):
    async def checker(login_user: Annotated[LoginUser, Depends(get_current_user)]) -> LoginUser:
        if not has_permission(login_user, permission):
            raise HTTPException(status_code=403, detail=f"缺少权限: {permission}")
        return login_user

    return checker
