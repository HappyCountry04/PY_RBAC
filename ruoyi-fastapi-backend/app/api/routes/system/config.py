from typing import Annotated, Any

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_perm
from app.core.response import success, table
from app.db.session import get_db
from app.models import SysConfig
from app.services.cache import (
    config_cache_clear,
    config_cache_get,
    config_cache_load_all,
    config_cache_remove,
    config_cache_set,
)
from app.services.rbac import LoginUser
from app.api.routes.system.common import (
    apply_time_range,
    current_name,
    ensure_exists,
    ensure_unique,
    field,
    page_params,
    page_query,
    serialize_config,
    xlsx_export,
)

router = APIRouter(prefix="/system/config", tags=["system"])


@router.get("/list")
async def config_list(
    db: Annotated[AsyncSession, Depends(get_db)],
    _login_user: Annotated[LoginUser, Depends(require_perm("system:config:list"))],
    pages: Annotated[tuple[int, int], Depends(page_params)],
    config_name: str | None = Query(None, alias="configName"),
    config_key: str | None = Query(None, alias="configKey"),
    config_type: str | None = Query(None, alias="configType"),
    begin_time: str | None = Query(None, alias="beginTime"),
    end_time: str | None = Query(None, alias="endTime"),
):
    stmt = select(SysConfig).order_by(SysConfig.config_id)
    if config_name:
        stmt = stmt.where(SysConfig.config_name.ilike(f"%{config_name}%"))
    if config_key:
        stmt = stmt.where(SysConfig.config_key.ilike(f"%{config_key}%"))
    if config_type:
        stmt = stmt.where(SysConfig.config_type == config_type)
    stmt = apply_time_range(stmt, SysConfig.create_time, begin_time, end_time)
    rows, total = await page_query(db, stmt, *pages)
    return table([serialize_config(row) for row in rows], total)


@router.get("/configKey/{config_key}")
async def config_by_key(
    config_key: str,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    value = await config_cache_get(config_key)
    if value is not None:
        return success(value)
    item = await db.scalar(select(SysConfig).where(SysConfig.config_key == config_key))
    return success(item.config_value if item else "")


@router.delete("/refreshCache")
async def config_refresh_cache(
    db: Annotated[AsyncSession, Depends(get_db)],
    _login_user: Annotated[LoginUser, Depends(require_perm("system:config:remove"))],
):
    await config_cache_clear()
    await config_cache_load_all(db)
    return success(msg="参数缓存刷新成功")


@router.get("/{config_id}")
async def config_detail(
    config_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _login_user: Annotated[LoginUser, Depends(require_perm("system:config:query"))],
):
    return success(data=serialize_config(await ensure_exists(db, SysConfig, config_id)))


@router.post("")
async def config_add(
    body: dict[str, Any],
    db: Annotated[AsyncSession, Depends(get_db)],
    login_user: Annotated[LoginUser, Depends(require_perm("system:config:add"))],
):
    await ensure_unique(db, SysConfig, SysConfig.config_key, field(body, "configKey"), "参数键名已存在")
    item = SysConfig(
        config_name=field(body, "configName", ""),
        config_key=field(body, "configKey"),
        config_value=field(body, "configValue", ""),
        config_type=field(body, "configType", "N"),
        remark=field(body, "remark"),
        create_by=current_name(login_user),
        create_time=datetime.now(),
    )
    db.add(item)
    await db.commit()
    await config_cache_set(item.config_key, item.config_value)
    return success()


@router.put("")
async def config_edit(
    body: dict[str, Any],
    db: Annotated[AsyncSession, Depends(get_db)],
    login_user: Annotated[LoginUser, Depends(require_perm("system:config:edit"))],
):
    item = await ensure_exists(db, SysConfig, int(field(body, "configId")))
    old_key = item.config_key
    await ensure_unique(db, SysConfig, SysConfig.config_key, field(body, "configKey"), "参数键名已存在", SysConfig.config_id, item.config_id)
    for attr, key in [
        ("config_name", "configName"),
        ("config_key", "configKey"),
        ("config_value", "configValue"),
        ("config_type", "configType"),
        ("remark", "remark"),
    ]:
        value = field(body, key)
        if value is not None:
            setattr(item, attr, value)
    item.update_by = current_name(login_user)
    item.update_time = datetime.now()
    await db.commit()
    if old_key != item.config_key:
        await config_cache_remove(old_key)
    await config_cache_set(item.config_key, item.config_value)
    return success()


@router.delete("/{config_ids}")
async def config_remove(
    config_ids: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _login_user: Annotated[LoginUser, Depends(require_perm("system:config:remove"))],
):
    ids = [int(item) for item in config_ids.split(",") if item]
    # Remove cache before deleting
    rows = list((await db.execute(select(SysConfig).where(SysConfig.config_id.in_(ids)))).scalars())
    for row in rows:
        await config_cache_remove(row.config_key)
    await db.execute(delete(SysConfig).where(SysConfig.config_id.in_(ids)))
    await db.commit()
    return success()


@router.get("/export")
async def config_export(
    db: Annotated[AsyncSession, Depends(get_db)],
    _login_user: Annotated[LoginUser, Depends(require_perm("system:config:query"))],
    config_name: str | None = Query(None, alias="configName"),
    config_key: str | None = Query(None, alias="configKey"),
    config_type: str | None = Query(None, alias="configType"),
    begin_time: str | None = Query(None, alias="beginTime"),
    end_time: str | None = Query(None, alias="endTime"),
):
    stmt = select(SysConfig).order_by(SysConfig.config_id)
    if config_name:
        stmt = stmt.where(SysConfig.config_name.ilike(f"%{config_name}%"))
    if config_key:
        stmt = stmt.where(SysConfig.config_key.ilike(f"%{config_key}%"))
    if config_type:
        stmt = stmt.where(SysConfig.config_type == config_type)
    stmt = apply_time_range(stmt, SysConfig.create_time, begin_time, end_time)
    rows = list((await db.execute(stmt)).scalars())
    data = [
        [str(c.config_id), c.config_name or "", c.config_key,
         c.config_value or "", "是" if c.config_type == "Y" else "否",
         str(c.create_time or ""), c.remark or ""]
        for c in rows
    ]
    return await xlsx_export(
        "config_export.xlsx",
        ["参数ID", "参数名称", "参数键名", "参数键值", "系统内置", "创建时间", "备注"],
        data,
    )
