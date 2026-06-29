from typing import Annotated, Any

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_perm
from app.api.routes.system.common import (
    apply_time_range,
    current_name,
    ensure_exists,
    ensure_unique,
    field,
    page_params,
    page_query,
    serialize_post,
    xlsx_export,
)
from app.core.response import success, table
from app.db.session import get_db
from app.models import SysPost
from app.services.rbac import LoginUser

router = APIRouter(prefix="/system", tags=["system"])


@router.get("/post/export")
async def post_export(
    db: Annotated[AsyncSession, Depends(get_db)],
    _login_user: Annotated[LoginUser, Depends(require_perm("system:post:query"))],
    post_code: str | None = Query(None, alias="postCode"),
    post_name: str | None = Query(None, alias="postName"),
    status: str | None = None,
    begin_time: str | None = Query(None, alias="beginTime"),
    end_time: str | None = Query(None, alias="endTime"),
):
    stmt = select(SysPost).order_by(SysPost.post_sort)
    if post_code:
        stmt = stmt.where(SysPost.post_code.ilike(f"%{post_code}%"))
    if post_name:
        stmt = stmt.where(SysPost.post_name.ilike(f"%{post_name}%"))
    if status:
        stmt = stmt.where(SysPost.status == status)
    stmt = apply_time_range(stmt, SysPost.create_time, begin_time, end_time)
    rows = list((await db.execute(stmt)).scalars())
    data = [
        [str(p.post_id), p.post_code, p.post_name, str(p.post_sort),
         "正常" if p.status == "0" else "停用",
         str(p.create_time or ""), p.remark or ""]
        for p in rows
    ]
    return await xlsx_export(
        "post_export.xlsx",
        ["岗位ID", "岗位编码", "岗位名称", "排序", "状态", "创建时间", "备注"],
        data,
    )


@router.get("/post/list")
async def post_list(
    db: Annotated[AsyncSession, Depends(get_db)],
    _login_user: Annotated[LoginUser, Depends(require_perm("system:post:list"))],
    pages: Annotated[tuple[int, int], Depends(page_params)],
    post_code: str | None = Query(None, alias="postCode"),
    post_name: str | None = Query(None, alias="postName"),
    status: str | None = None,
    begin_time: str | None = Query(None, alias="beginTime"),
    end_time: str | None = Query(None, alias="endTime"),
):
    stmt = select(SysPost).order_by(SysPost.post_sort)
    if post_code:
        stmt = stmt.where(SysPost.post_code.ilike(f"%{post_code}%"))
    if post_name:
        stmt = stmt.where(SysPost.post_name.ilike(f"%{post_name}%"))
    if status:
        stmt = stmt.where(SysPost.status == status)
    stmt = apply_time_range(stmt, SysPost.create_time, begin_time, end_time)
    rows, total = await page_query(db, stmt, *pages)
    return table([serialize_post(row) for row in rows], total)


@router.get("/post/{post_id}")
async def post_detail(
    post_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _login_user: Annotated[LoginUser, Depends(require_perm("system:post:query"))],
):
    return success(data=serialize_post(await ensure_exists(db, SysPost, post_id)))


@router.post("/post")
async def post_add(
    body: dict[str, Any],
    db: Annotated[AsyncSession, Depends(get_db)],
    login_user: Annotated[LoginUser, Depends(require_perm("system:post:add"))],
):
    await ensure_unique(db, SysPost, SysPost.post_code, field(body, "postCode"), "岗位编码已存在")
    await ensure_unique(db, SysPost, SysPost.post_name, field(body, "postName"), "岗位名称已存在")
    post = SysPost(
        post_code=field(body, "postCode"),
        post_name=field(body, "postName"),
        post_sort=int(field(body, "postSort", 0)),
        status=field(body, "status", "0"),
        remark=field(body, "remark"),
        create_by=current_name(login_user),
        create_time=datetime.now(),
    )
    db.add(post)
    await db.commit()
    return success()


@router.put("/post")
async def post_edit(
    body: dict[str, Any],
    db: Annotated[AsyncSession, Depends(get_db)],
    login_user: Annotated[LoginUser, Depends(require_perm("system:post:edit"))],
):
    post = await ensure_exists(db, SysPost, int(field(body, "postId")))
    await ensure_unique(db, SysPost, SysPost.post_code, field(body, "postCode"), "岗位编码已存在", SysPost.post_id, post.post_id)
    await ensure_unique(db, SysPost, SysPost.post_name, field(body, "postName"), "岗位名称已存在", SysPost.post_id, post.post_id)
    for attr, key in [
        ("post_code", "postCode"),
        ("post_name", "postName"),
        ("post_sort", "postSort"),
        ("status", "status"),
        ("remark", "remark"),
    ]:
        value = field(body, key)
        if value is not None:
            setattr(post, attr, value)
    post.update_by = current_name(login_user)
    post.update_time = datetime.now()
    await db.commit()
    return success()


@router.delete("/post/{post_ids}")
async def post_remove(
    post_ids: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _login_user: Annotated[LoginUser, Depends(require_perm("system:post:remove"))],
):
    ids = [int(item) for item in post_ids.split(",") if item]
    await db.execute(delete(SysPost).where(SysPost.post_id.in_(ids)))
    await db.commit()
    return success()
