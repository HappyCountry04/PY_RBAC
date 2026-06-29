import re
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
from app.services.cache import is_password_locked, pwd_err_clear, pwd_err_get, pwd_err_increment
from app.services.rbac import LoginUser, build_routers, get_menu_permissions, get_role_keys, get_user_by_username, menu_tree_for_user

router = APIRouter(tags=["auth"])


class LoginBody(BaseModel):
    username: str
    password: str
    code: str | None = None
    uuid: str | None = None


def parse_ua_browser(user_agent: str) -> str:
    if not user_agent:
        return ""
    ua = user_agent.lower()
    if "micromessenger/" in ua:
        m = re.search(r"micromessenger/([\d.]+)", ua)
        return f"微信 {m.group(1)}" if m else "微信"
    if "edg/" in ua:
        m = re.search(r"edg/([\d.]+)", ua)
        return f"Edge {m.group(1)}" if m else "Edge"
    if "firefox/" in ua:
        m = re.search(r"firefox/([\d.]+)", ua)
        return f"Firefox {m.group(1)}" if m else "Firefox"
    if "chrome/" in ua and "safari/" in ua:
        m = re.search(r"chrome/([\d.]+)", ua)
        return f"Chrome {m.group(1)}" if m else "Chrome"
    if "safari/" in ua and "chrome/" not in ua:
        m = re.search(r"version/([\d.]+)", ua)
        return f"Safari {m.group(1)}" if m else "Safari"
    if "msie " in ua or "trident/" in ua:
        return "IE"
    m = re.search(r"\)\s+(\S+?)/([\d.]+)", user_agent)
    if m:
        return f"{m.group(1)} {m.group(2)}"
    return user_agent[:50]


def parse_ua_os(user_agent: str) -> str:
    if not user_agent:
        return ""
    ua = user_agent.lower()
    if "windows nt 10" in ua:
        return "Windows 10"
    if "windows nt 6.3" in ua:
        return "Windows 8.1"
    if "windows nt 6.2" in ua:
        return "Windows 8"
    if "windows nt 6.1" in ua:
        return "Windows 7"
    if "windows" in ua:
        return "Windows"
    if "mac os x" in ua or "macintosh" in ua:
        return "Mac OS X"
    if "linux" in ua and "android" in ua:
        m = re.search(r"android\s+([\d.]+)", ua)
        return f"Android {m.group(1)}" if m else "Android"
    if "linux" in ua:
        return "Linux"
    if "iphone" in ua or "ipad" in ua:
        return "iOS"
    return ""


@router.post("/login")
async def login(body: LoginBody, request: Request, db: Annotated[AsyncSession, Depends(get_db)]):
    if body.code and body.uuid:
        stored = await redis_client.get(f"captcha:{body.uuid}")
        if stored is None or str(stored) != body.code.strip():
            raise HTTPException(status_code=400, detail="验证码错误")

    # 检查密码错误次数是否被锁定
    retry_count = await pwd_err_get(body.username)
    if is_password_locked(retry_count):
        raise HTTPException(status_code=400, detail=f"密码错误次数已达上限（{retry_count}次），账户已锁定")

    user = await get_user_by_username(db, body.username)
    ok = bool(user and user.status == "0" and verify_password(body.password, user.password))
    ua = request.headers.get("User-Agent", "")
    db.add(
        SysLogininfor(
            user_name=body.username,
            ipaddr=request.client.host if request.client else "",
            status="0" if ok else "1",
            msg="登录成功" if ok else "用户名或密码错误",
            login_time=datetime.now(timezone.utc).replace(tzinfo=None),
            browser=parse_ua_browser(ua),
            os=parse_ua_os(ua),
        )
    )
    await db.commit()
    if not ok or user is None:
        await pwd_err_increment(body.username)
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    await pwd_err_clear(body.username)
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
