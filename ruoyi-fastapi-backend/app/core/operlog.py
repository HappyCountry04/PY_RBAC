import json
import time
from datetime import datetime

from sqlalchemy import select

from app.core.security import decode_token
from app.db.session import AsyncSessionLocal
from app.models import SysOperLog

BUSINESS_TYPES = {
    "POST": 1,
    "PUT": 2,
    "DELETE": 3,
}

URL_TITLES: dict[str, str] = {
    "/system/user": "用户管理",
    "/system/role": "角色管理",
    "/system/menu": "菜单管理",
    "/system/dept": "部门管理",
    "/system/post": "岗位管理",
    "/system/config": "参数设置",
    "/system/dict/type": "字典管理",
    "/system/dict/data": "字典数据",
    "/monitor/operlog": "操作日志",
    "/monitor/logininfor": "登录日志",
}


async def write_oper_log(
    method: str,
    url: str,
    client_ip: str,
    request_body: str | None,
    response_status: int,
    response_body: str | None,
    authorization: str | None,
    cost_time: int,
) -> None:
    business_type = BUSINESS_TYPES.get(method, 0)
    user_name = ""
    if authorization and authorization.lower().startswith("bearer "):
        try:
            payload = decode_token(authorization.split(" ", 1)[1])
            user_name = payload.get("username", "")
        except Exception:
            pass

    title = ""
    for path, label in URL_TITLES.items():
        if url.startswith(path):
            title = label
            break

    status = 0 if 200 <= response_status < 400 else 1
    error_msg = ""
    if status == 1:
        try:
            body = json.loads(response_body or "{}")
            error_msg = str(body.get("detail", body.get("msg", "")))[:2000]
        except Exception:
            error_msg = ""

    async with AsyncSessionLocal() as db:
        oper = SysOperLog(
            title=title,
            business_type=business_type,
            method="",
            request_method=method,
            oper_name=user_name,
            oper_url=url[:255],
            oper_ip=client_ip[:128],
            oper_param=(request_body or "")[:2000],
            json_result=(response_body or "")[:2000],
            status=status,
            error_msg=error_msg,
            oper_time=datetime.now(),
            cost_time=cost_time,
        )
        db.add(oper)
        await db.commit()
