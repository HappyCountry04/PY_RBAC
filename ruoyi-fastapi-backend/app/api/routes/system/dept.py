from typing import Annotated, Any

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_perm
from app.api.routes.system.common import (
    apply_data_scope,
    build_dept_tree,
    collect_child_dept_ids,
    current_name,
    dept_tree,
    ensure_exists,
    field,
    serialize_dept,
)
from app.core.response import success
from app.db.session import get_db
from app.models import SysDept
from app.services.rbac import LoginUser

router = APIRouter(prefix="/system", tags=["system"])


async def next_ancestors(db: AsyncSession, parent_id: int) -> str:
    if parent_id == 0:
        return "0"
    parent = await db.get(SysDept, parent_id)
    if parent is None:
        return "0"
    return f"{parent.ancestors},{parent.dept_id}"


@router.get("/dept/list")
async def dept_list(
    db: Annotated[AsyncSession, Depends(get_db)],
    login_user: Annotated[LoginUser, Depends(require_perm("system:dept:list"))],
    dept_name: str | None = Query(None, alias="deptName"),
    status: str | None = None,
):
    stmt = select(SysDept).where(SysDept.del_flag == "0").order_by(SysDept.parent_id, SysDept.order_num)
    stmt = await apply_data_scope(db, stmt, login_user, SysDept.dept_id)
    if dept_name:
        stmt = stmt.where(SysDept.dept_name.ilike(f"%{dept_name}%"))
    if status:
        stmt = stmt.where(SysDept.status == status)
    rows = list((await db.execute(stmt)).scalars())
    return success([serialize_dept(row) for row in rows])


@router.get("/dept/treeselect")
async def dept_tree_select(
    db: Annotated[AsyncSession, Depends(get_db)],
    _login_user: Annotated[LoginUser, Depends(require_perm("system:dept:query"))],
):
    rows = list((await db.execute(select(SysDept).where(SysDept.del_flag == "0").order_by(SysDept.parent_id, SysDept.order_num))).scalars())
    tree = build_dept_tree(rows, 0)
    return success([dept_tree(node) for node in tree])


@router.get("/dept/list/exclude/{dept_id}")
async def dept_list_exclude_child(
    dept_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _login_user: Annotated[LoginUser, Depends(require_perm("system:dept:list"))],
):
    excluded = {dept_id, *(await collect_child_dept_ids(db, dept_id))}
    rows = list(
        (
            await db.execute(
                select(SysDept)
                .where(SysDept.del_flag == "0", SysDept.dept_id.not_in(excluded))
                .order_by(SysDept.parent_id, SysDept.order_num)
            )
        ).scalars()
    )
    return success([serialize_dept(row) for row in rows])


@router.get("/dept/{dept_id}")
async def dept_detail(
    dept_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _login_user: Annotated[LoginUser, Depends(require_perm("system:dept:query"))],
):
    dept = await ensure_exists(db, SysDept, dept_id)
    return success(data=serialize_dept(dept))


@router.post("/dept")
async def dept_add(
    body: dict[str, Any],
    db: Annotated[AsyncSession, Depends(get_db)],
    login_user: Annotated[LoginUser, Depends(require_perm("system:dept:add"))],
):
    parent_id = int(field(body, "parentId", 0))
    dept = SysDept(
        parent_id=parent_id,
        ancestors=await next_ancestors(db, parent_id),
        dept_name=field(body, "deptName"),
        order_num=int(field(body, "orderNum", 0)),
        leader=field(body, "leader"),
        phone=field(body, "phone"),
        email=field(body, "email"),
        status=field(body, "status", "0"),
        del_flag="0",
        create_by=current_name(login_user),
        create_time=datetime.now(),
    )
    db.add(dept)
    await db.commit()
    return success()


@router.put("/dept")
async def dept_edit(
    body: dict[str, Any],
    db: Annotated[AsyncSession, Depends(get_db)],
    login_user: Annotated[LoginUser, Depends(require_perm("system:dept:edit"))],
):
    dept = await ensure_exists(db, SysDept, int(field(body, "deptId")))
    parent_id = int(field(body, "parentId", dept.parent_id))
    dept.parent_id = parent_id
    dept.ancestors = await next_ancestors(db, parent_id)
    for attr, key in [
        ("dept_name", "deptName"),
        ("order_num", "orderNum"),
        ("leader", "leader"),
        ("phone", "phone"),
        ("email", "email"),
        ("status", "status"),
    ]:
        value = field(body, key)
        if value is not None:
            setattr(dept, attr, value)
    dept.update_by = current_name(login_user)
    dept.update_time = datetime.now()
    await db.commit()
    return success()


@router.put("/dept/updateSort")
async def dept_update_sort(
    body: dict[str, Any],
    db: Annotated[AsyncSession, Depends(get_db)],
    login_user: Annotated[LoginUser, Depends(require_perm("system:dept:edit"))],
):
    dept_ids = field(body, "deptIds", "")
    order_nums = field(body, "orderNums", "")
    if not dept_ids or not order_nums:
        raise HTTPException(status_code=400, detail="参数不能为空")
    id_list = [int(x) for x in str(dept_ids).split(",")]
    num_list = [int(x) for x in str(order_nums).split(",")]
    for dept_id, order_num in zip(id_list, num_list):
        dept = await db.get(SysDept, dept_id)
        if dept:
            dept.order_num = order_num
            dept.update_by = current_name(login_user)
            dept.update_time = datetime.now()
    await db.commit()
    return success()


@router.delete("/dept/{dept_ids}")
async def dept_remove(
    dept_ids: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _login_user: Annotated[LoginUser, Depends(require_perm("system:dept:remove"))],
):
    ids = [int(item) for item in dept_ids.split(",") if item]
    for dept_id in ids:
        children = await db.scalar(
            select(func.count()).select_from(SysDept).where(SysDept.parent_id == dept_id, SysDept.del_flag == "0")
        )
        if children:
            raise HTTPException(status_code=400, detail="存在子部门，不能删除")
    rows = (await db.execute(select(SysDept).where(SysDept.dept_id.in_(ids)))).scalars()
    for dept in rows:
        dept.del_flag = "2"
    await db.commit()
    return success()
