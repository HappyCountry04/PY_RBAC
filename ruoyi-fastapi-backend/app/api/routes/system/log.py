from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_perm
from app.core.response import success, table
from app.db.session import get_db
from app.models import SysLogininfor, SysOperLog, SysUser
from app.services.rbac import LoginUser
from app.api.routes.system.common import (
    apply_time_range,
    business_type_label_str,
    model_dict,
    page_params,
    page_query,
    xlsx_export,
)

monitor_router = APIRouter(prefix="/monitor", tags=["monitor"])


_operlog_sort_map = {
    "operName": SysOperLog.oper_name,
    "operTime": SysOperLog.oper_time,
    "costTime": SysOperLog.cost_time,
}


@monitor_router.get("/operlog/list")
async def operlog_list(
    db: Annotated[AsyncSession, Depends(get_db)],
    _login_user: Annotated[LoginUser, Depends(require_perm("monitor:operlog:list"))],
    pages: Annotated[tuple[int, int], Depends(page_params)],
    title: str | None = None,
    oper_name: str | None = Query(None, alias="operName"),
    oper_ip: str | None = Query(None, alias="operIp"),
    business_type: int | None = Query(None, alias="businessType"),
    status: int | None = None,
    begin_time: str | None = Query(None, alias="beginTime"),
    end_time: str | None = Query(None, alias="endTime"),
    order_by_column: str | None = Query(None, alias="orderByColumn"),
    is_asc: str | None = Query(None, alias="isAsc"),
):
    sort_col = _operlog_sort_map.get(order_by_column) if order_by_column else None
    if sort_col is not None and is_asc == "asc":
        stmt = select(SysOperLog).order_by(sort_col.asc())
    elif sort_col is not None:
        stmt = select(SysOperLog).order_by(sort_col.desc())
    else:
        stmt = select(SysOperLog).order_by(SysOperLog.oper_id.desc())
    if title:
        stmt = stmt.where(SysOperLog.title.ilike(f"%{title}%"))
    if oper_name:
        stmt = stmt.where(SysOperLog.oper_name.ilike(f"%{oper_name}%"))
    if oper_ip:
        stmt = stmt.where(SysOperLog.oper_ip.ilike(f"%{oper_ip}%"))
    if business_type is not None:
        stmt = stmt.where(SysOperLog.business_type == business_type)
    if status is not None:
        stmt = stmt.where(SysOperLog.status == status)
    stmt = apply_time_range(stmt, SysOperLog.oper_time, begin_time, end_time)
    rows, total = await page_query(db, stmt, *pages)
    return table([model_dict(row) for row in rows], total)


@monitor_router.delete("/operlog/clean")
async def operlog_clean(
    db: Annotated[AsyncSession, Depends(get_db)],
    _login_user: Annotated[LoginUser, Depends(require_perm("monitor:operlog:remove"))],
):
    await db.execute(delete(SysOperLog))
    await db.commit()
    return success()


@monitor_router.delete("/operlog/{oper_ids}")
async def operlog_remove(
    oper_ids: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _login_user: Annotated[LoginUser, Depends(require_perm("monitor:operlog:remove"))],
):
    ids = [int(item) for item in oper_ids.split(",") if item]
    await db.execute(delete(SysOperLog).where(SysOperLog.oper_id.in_(ids)))
    await db.commit()
    return success()


_logininfor_sort_map = {
    "userName": SysLogininfor.user_name,
    "loginTime": SysLogininfor.login_time,
}


@monitor_router.get("/logininfor/list")
async def logininfor_list(
    db: Annotated[AsyncSession, Depends(get_db)],
    _login_user: Annotated[LoginUser, Depends(require_perm("monitor:logininfor:list"))],
    pages: Annotated[tuple[int, int], Depends(page_params)],
    user_name: str | None = Query(None, alias="userName"),
    ipaddr: str | None = None,
    status: str | None = None,
    begin_time: str | None = Query(None, alias="beginTime"),
    end_time: str | None = Query(None, alias="endTime"),
    order_by_column: str | None = Query(None, alias="orderByColumn"),
    is_asc: str | None = Query(None, alias="isAsc"),
):
    sort_col = _logininfor_sort_map.get(order_by_column) if order_by_column else None
    if sort_col is not None and is_asc == "asc":
        stmt = select(SysLogininfor).order_by(sort_col.asc())
    elif sort_col is not None:
        stmt = select(SysLogininfor).order_by(sort_col.desc())
    else:
        stmt = select(SysLogininfor).order_by(SysLogininfor.info_id.desc())
    if user_name:
        stmt = stmt.where(SysLogininfor.user_name.ilike(f"%{user_name}%"))
    if ipaddr:
        stmt = stmt.where(SysLogininfor.ipaddr.ilike(f"%{ipaddr}%"))
    if status:
        stmt = stmt.where(SysLogininfor.status == status)
    stmt = apply_time_range(stmt, SysLogininfor.login_time, begin_time, end_time)
    rows, total = await page_query(db, stmt, *pages)
    return table([model_dict(row) for row in rows], total)


@monitor_router.delete("/logininfor/clean")
async def logininfor_clean(
    db: Annotated[AsyncSession, Depends(get_db)],
    _login_user: Annotated[LoginUser, Depends(require_perm("monitor:logininfor:remove"))],
):
    await db.execute(delete(SysLogininfor))
    await db.commit()
    return success()


@monitor_router.delete("/logininfor/{info_ids}")
async def logininfor_remove(
    info_ids: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _login_user: Annotated[LoginUser, Depends(require_perm("monitor:logininfor:remove"))],
):
    ids = [int(item) for item in info_ids.split(",") if item]
    await db.execute(delete(SysLogininfor).where(SysLogininfor.info_id.in_(ids)))
    await db.commit()
    return success()


@monitor_router.get("/logininfor/unlock/{user_name}")
async def logininfor_unlock(
    user_name: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _login_user: Annotated[LoginUser, Depends(require_perm("monitor:logininfor:unlock"))],
):
    user = await db.scalar(select(SysUser).where(SysUser.user_name == user_name))
    if user is None:
        raise HTTPException(status_code=404, detail=f"用户 {user_name} 不存在")
    return success(msg=f"用户 {user_name} 解锁成功")


@monitor_router.get("/operlog/export")
async def operlog_export(
    db: Annotated[AsyncSession, Depends(get_db)],
    _login_user: Annotated[LoginUser, Depends(require_perm("monitor:operlog:list"))],
    title: str | None = None,
    oper_name: str | None = Query(None, alias="operName"),
    business_type: int | None = Query(None, alias="businessType"),
    status: int | None = None,
    begin_time: str | None = Query(None, alias="beginTime"),
    end_time: str | None = Query(None, alias="endTime"),
):
    stmt = select(SysOperLog).order_by(SysOperLog.oper_id.desc())
    if title:
        stmt = stmt.where(SysOperLog.title.ilike(f"%{title}%"))
    if oper_name:
        stmt = stmt.where(SysOperLog.oper_name.ilike(f"%{oper_name}%"))
    if business_type is not None:
        stmt = stmt.where(SysOperLog.business_type == business_type)
    if status is not None:
        stmt = stmt.where(SysOperLog.status == status)
    stmt = apply_time_range(stmt, SysOperLog.oper_time, begin_time, end_time)
    rows = list((await db.execute(stmt)).scalars())
    data = [
        [str(o.oper_id), o.title or "", business_type_label_str(o.business_type or 0),
         o.request_method or "", o.oper_name or "", o.oper_url or "",
         o.oper_ip or "", str(o.oper_time or ""), str(o.cost_time or 0),
         "成功" if o.status == 0 else "失败", o.error_msg or ""]
        for o in rows
    ]
    return await xlsx_export(
        "operlog_export.xlsx",
        ["日志编号", "操作模块", "业务类型", "请求方式", "操作人员", "请求URL", "IP地址", "操作时间", "耗时(ms)", "状态", "错误信息"],
        data,
    )


@monitor_router.get("/logininfor/export")
async def logininfor_export(
    db: Annotated[AsyncSession, Depends(get_db)],
    _login_user: Annotated[LoginUser, Depends(require_perm("monitor:logininfor:list"))],
    user_name: str | None = Query(None, alias="userName"),
    ipaddr: str | None = None,
    status: str | None = None,
    begin_time: str | None = Query(None, alias="beginTime"),
    end_time: str | None = Query(None, alias="endTime"),
):
    stmt = select(SysLogininfor).order_by(SysLogininfor.info_id.desc())
    if user_name:
        stmt = stmt.where(SysLogininfor.user_name.ilike(f"%{user_name}%"))
    if ipaddr:
        stmt = stmt.where(SysLogininfor.ipaddr.ilike(f"%{ipaddr}%"))
    if status:
        stmt = stmt.where(SysLogininfor.status == status)
    stmt = apply_time_range(stmt, SysLogininfor.login_time, begin_time, end_time)
    rows = list((await db.execute(stmt)).scalars())
    data = [
        [str(l.info_id), l.user_name or "", l.ipaddr or "", l.login_location or "",
         l.browser or "", l.os or "", "成功" if l.status == "0" else "失败",
         l.msg or "", str(l.login_time or "")]
        for l in rows
    ]
    return await xlsx_export(
        "logininfor_export.xlsx",
        ["访问编号", "用户账号", "IP地址", "登录地点", "浏览器", "操作系统", "状态", "提示消息", "登录时间"],
        data,
    )
