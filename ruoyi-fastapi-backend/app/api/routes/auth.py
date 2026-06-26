from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.response import success
from app.core.security import create_access_token, verify_password
from app.db.redis import redis_client
from app.db.session import get_db
from app.models import SysLogininfor
from app.services.rbac import LoginUser, build_routers, get_menu_permissions, get_role_keys, get_user_by_username, menu_tree_for_user

router = APIRouter(tags=["auth"])


class LoginBody(BaseModel):
    username: str
    password: str
    code: str | None = None
    uuid: str | None = None


@router.post("/login")
async def login(body: LoginBody, request: Request, db: Annotated[AsyncSession, Depends(get_db)]):
    user = await get_user_by_username(db, body.username)
    ok = bool(user and user.status == "0" and verify_password(body.password, user.password))
    db.add(
        SysLogininfor(
            user_name=body.username,
            ipaddr=request.client.host if request.client else "",
            status="0" if ok else "1",
            msg="登录成功" if ok else "用户名或密码错误",
            login_time=datetime.now(timezone.utc).replace(tzinfo=None),
        )
    )
    await db.commit()
    if not ok or user is None:
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    token, token_id, expire = create_access_token(user.user_id, user.user_name)
    await redis_client.setex(
        f"login_tokens:{token_id}",
        int((expire - datetime.now(timezone.utc)).total_seconds()),
        str(user.user_id),
    )
    return success(token=token)


@router.post("/logout")
async def logout(login_user: Annotated[LoginUser, Depends(get_current_user)]):
    if login_user.token_id:
        await redis_client.delete(f"login_tokens:{login_user.token_id}")
    return success()


@router.get("/getInfo")
async def get_info(
    login_user: Annotated[LoginUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    user = login_user.user
    return success(
        user=serialize_user(user),
        roles=sorted(await get_role_keys(user)),
        permissions=sorted(await get_menu_permissions(db, user)),
        pwdChrtype="0",
        isDefaultModifyPwd=user.pwd_update_date is None,
        isPasswordExpired=False,
    )


@router.get("/getRouters")
async def get_routers(
    login_user: Annotated[LoginUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    menus = await menu_tree_for_user(db, login_user.user)
    return success(build_routers(menus))


def serialize_user(user) -> dict:
    return {
        "userId": user.user_id,
        "deptId": user.dept_id,
        "userName": user.user_name,
        "nickName": user.nick_name,
        "email": user.email,
        "phonenumber": user.phonenumber,
        "sex": user.sex,
        "avatar": user.avatar,
        "status": user.status,
        "remark": user.remark,
        "dept": {"deptId": user.dept.dept_id, "deptName": user.dept.dept_name} if user.dept else None,
    }
