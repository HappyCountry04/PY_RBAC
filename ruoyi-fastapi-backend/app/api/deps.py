from typing import Annotated

from fastapi import Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

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
    if token_id and await redis_client.exists(f"login_tokens:{token_id}") == 0:
        raise HTTPException(status_code=401, detail="登录状态已失效")
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
