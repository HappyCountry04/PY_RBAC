from typing import Annotated, Any

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_perm
from app.core.response import success, table
from app.db.session import get_db
from app.models import SysDictData, SysDictType
from app.services.cache import (
    dict_cache_clear,
    dict_cache_get,
    dict_cache_load_all,
    dict_cache_remove,
    dict_cache_set,
)
from app.services.rbac import LoginUser
from app.api.routes.system.common import (
    _refresh_dict_cache,
    apply_time_range,
    current_name,
    ensure_exists,
    ensure_unique,
    field,
    page_params,
    page_query,
    serialize_dict_data,
    serialize_dict_type,
)

router = APIRouter(prefix="/system/dict", tags=["system"])


@router.get("/type/list")
async def dict_type_list(
    db: Annotated[AsyncSession, Depends(get_db)],
    _login_user: Annotated[LoginUser, Depends(require_perm("system:dict:list"))],
    pages: Annotated[tuple[int, int], Depends(page_params)],
    dict_name: str | None = Query(None, alias="dictName"),
    dict_type: str | None = Query(None, alias="dictType"),
    status: str | None = None,
    begin_time: str | None = Query(None, alias="beginTime"),
    end_time: str | None = Query(None, alias="endTime"),
):
    stmt = select(SysDictType).order_by(SysDictType.dict_id)
    if dict_name:
        stmt = stmt.where(SysDictType.dict_name.ilike(f"%{dict_name}%"))
    if dict_type:
        stmt = stmt.where(SysDictType.dict_type.ilike(f"%{dict_type}%"))
    if status:
        stmt = stmt.where(SysDictType.status == status)
    stmt = apply_time_range(stmt, SysDictType.create_time, begin_time, end_time)
    rows, total = await page_query(db, stmt, *pages)
    return table([serialize_dict_type(row) for row in rows], total)


@router.get("/type/optionselect")
async def dict_type_optionselect(
    db: Annotated[AsyncSession, Depends(get_db)],
    _login_user: Annotated[LoginUser, Depends(require_perm("system:dict:list"))],
):
    rows = list((await db.execute(select(SysDictType).order_by(SysDictType.dict_id))).scalars())
    return success(data=[serialize_dict_type(row) for row in rows])


@router.delete("/type/refreshCache")
async def dict_type_refresh_cache(
    db: Annotated[AsyncSession, Depends(get_db)],
    _login_user: Annotated[LoginUser, Depends(require_perm("system:dict:remove"))],
):
    await dict_cache_clear()
    await dict_cache_load_all(db)
    return success(msg="字典缓存刷新成功")


@router.get("/type/{dict_id}")
async def dict_type_detail(
    dict_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _login_user: Annotated[LoginUser, Depends(require_perm("system:dict:query"))],
):
    return success(data=serialize_dict_type(await ensure_exists(db, SysDictType, dict_id)))


@router.post("/type")
async def dict_type_add(
    body: dict[str, Any],
    db: Annotated[AsyncSession, Depends(get_db)],
    login_user: Annotated[LoginUser, Depends(require_perm("system:dict:add"))],
):
    await ensure_unique(db, SysDictType, SysDictType.dict_type, field(body, "dictType"), "字典类型已存在")
    item = SysDictType(
        dict_name=field(body, "dictName", ""),
        dict_type=field(body, "dictType"),
        status=field(body, "status", "0"),
        remark=field(body, "remark"),
        create_by=current_name(login_user),
        create_time=datetime.now(),
    )
    db.add(item)
    await db.commit()
    return success()


@router.put("/type")
async def dict_type_edit(
    body: dict[str, Any],
    db: Annotated[AsyncSession, Depends(get_db)],
    login_user: Annotated[LoginUser, Depends(require_perm("system:dict:edit"))],
):
    item = await ensure_exists(db, SysDictType, int(field(body, "dictId")))
    await ensure_unique(db, SysDictType, SysDictType.dict_type, field(body, "dictType"), "字典类型已存在", SysDictType.dict_id, item.dict_id)
    for attr, key in [
        ("dict_name", "dictName"),
        ("dict_type", "dictType"),
        ("status", "status"),
        ("remark", "remark"),
    ]:
        value = field(body, key)
        if value is not None:
            setattr(item, attr, value)
    item.update_by = current_name(login_user)
    item.update_time = datetime.now()
    await db.commit()
    return success()


@router.delete("/type/{dict_ids}")
async def dict_type_remove(
    dict_ids: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _login_user: Annotated[LoginUser, Depends(require_perm("system:dict:remove"))],
):
    ids = [int(item) for item in dict_ids.split(",") if item]
    rows = list((await db.execute(select(SysDictType).where(SysDictType.dict_id.in_(ids)))).scalars())
    for row in rows:
        await dict_cache_remove(row.dict_type)
    await db.execute(delete(SysDictType).where(SysDictType.dict_id.in_(ids)))
    await db.commit()
    return success()


@router.get("/data/list")
async def dict_data_list(
    db: Annotated[AsyncSession, Depends(get_db)],
    _login_user: Annotated[LoginUser, Depends(require_perm("system:dict:list"))],
    pages: Annotated[tuple[int, int], Depends(page_params)],
    dict_type: str | None = Query(None, alias="dictType"),
    dict_label: str | None = Query(None, alias="dictLabel"),
    status: str | None = None,
    begin_time: str | None = Query(None, alias="beginTime"),
    end_time: str | None = Query(None, alias="endTime"),
):
    stmt = select(SysDictData).order_by(SysDictData.dict_sort)
    if dict_type:
        stmt = stmt.where(SysDictData.dict_type == dict_type)
    if dict_label:
        stmt = stmt.where(SysDictData.dict_label.ilike(f"%{dict_label}%"))
    if status:
        stmt = stmt.where(SysDictData.status == status)
    stmt = apply_time_range(stmt, SysDictData.create_time, begin_time, end_time)
    rows, total = await page_query(db, stmt, *pages)
    return table([serialize_dict_data(row) for row in rows], total)


@router.get("/data/type/{dict_type}")
async def dict_data_by_type(dict_type: str, db: Annotated[AsyncSession, Depends(get_db)]):
    # Read-through cache: try Redis first, fall back to DB
    cached = await dict_cache_get(dict_type)
    if cached is not None:
        return success(cached)
    rows = list(
        (
            await db.execute(
                select(SysDictData)
                .where(SysDictData.dict_type == dict_type, SysDictData.status == "0")
                .order_by(SysDictData.dict_sort)
            )
        ).scalars()
    )
    data = [serialize_dict_data(row) for row in rows]
    await dict_cache_set(dict_type, data)
    return success(data)


@router.get("/data/{dict_code}")
async def dict_data_detail(
    dict_code: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _login_user: Annotated[LoginUser, Depends(require_perm("system:dict:query"))],
):
    return success(data=serialize_dict_data(await ensure_exists(db, SysDictData, dict_code)))


@router.post("/data")
async def dict_data_add(
    body: dict[str, Any],
    db: Annotated[AsyncSession, Depends(get_db)],
    login_user: Annotated[LoginUser, Depends(require_perm("system:dict:add"))],
):
    item = SysDictData(
        dict_sort=int(field(body, "dictSort", 0)),
        dict_label=field(body, "dictLabel", ""),
        dict_value=field(body, "dictValue", ""),
        dict_type=field(body, "dictType", ""),
        css_class=field(body, "cssClass"),
        list_class=field(body, "listClass"),
        is_default=field(body, "isDefault", "N"),
        status=field(body, "status", "0"),
        remark=field(body, "remark"),
        create_by=current_name(login_user),
        create_time=datetime.now(),
    )
    db.add(item)
    await db.commit()
    await _refresh_dict_cache(db, item.dict_type)
    return success()


@router.put("/data")
async def dict_data_edit(
    body: dict[str, Any],
    db: Annotated[AsyncSession, Depends(get_db)],
    login_user: Annotated[LoginUser, Depends(require_perm("system:dict:edit"))],
):
    item = await ensure_exists(db, SysDictData, int(field(body, "dictCode")))
    old_type = item.dict_type
    for attr, key in [
        ("dict_sort", "dictSort"),
        ("dict_label", "dictLabel"),
        ("dict_value", "dictValue"),
        ("dict_type", "dictType"),
        ("css_class", "cssClass"),
        ("list_class", "listClass"),
        ("is_default", "isDefault"),
        ("status", "status"),
        ("remark", "remark"),
    ]:
        value = field(body, key)
        if value is not None:
            setattr(item, attr, value)
    item.update_by = current_name(login_user)
    item.update_time = datetime.now()
    await db.commit()
    if old_type != item.dict_type:
        await _refresh_dict_cache(db, old_type)
    await _refresh_dict_cache(db, item.dict_type)
    return success()


@router.delete("/data/{dict_codes}")
async def dict_data_remove(
    dict_codes: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _login_user: Annotated[LoginUser, Depends(require_perm("system:dict:remove"))],
):
    ids = [int(item) for item in dict_codes.split(",") if item]
    rows = list((await db.execute(select(SysDictData).where(SysDictData.dict_code.in_(ids)))).scalars())
    await db.execute(delete(SysDictData).where(SysDictData.dict_code.in_(ids)))
    await db.commit()
    for row in rows:
        await _refresh_dict_cache(db, row.dict_type)
    return success()
