from typing import Annotated, Any

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_perm
from app.api.routes.system.common import (
    apply_time_range,
    current_name,
    data_scope_label_str,
    ensure_exists,
    ensure_unique,
    field,
    has_field,
    page_params,
    page_query,
    replace_rows,
    serialize_role,
    serialize_user,
    xlsx_export,
)
from app.core.response import success, table
from app.db.session import get_db
from app.models import (
    SysDept,
    SysRole,
    SysRoleDept,
    SysRoleMenu,
    SysUser,
    SysUserRole,
)
from app.services.rbac import LoginUser, invalidate_tokens_for_role

router = APIRouter()


async def sync_role_menus(db: AsyncSession, role_id: int, menu_ids: list[int] | None) -> None:
    await replace_rows(
        db,
        SysRoleMenu,
        SysRoleMenu.role_id == role_id,
        [SysRoleMenu(role_id=role_id, menu_id=int(menu_id)) for menu_id in menu_ids or []],
    )


async def sync_role_depts(db: AsyncSession, role_id: int, dept_ids: list[int] | None) -> None:
    await replace_rows(
        db,
        SysRoleDept,
        SysRoleDept.role_id == role_id,
        [SysRoleDept(role_id=role_id, dept_id=int(dept_id)) for dept_id in dept_ids or []],
    )


def build_dept_tree(depts: list[SysDept], parent_id: int = 0) -> list[SysDept]:
    nodes = [dept for dept in depts if dept.parent_id == parent_id]
    for node in nodes:
        setattr(node, "children", build_dept_tree(depts, node.dept_id))
    return nodes


def dept_tree(dept: SysDept) -> dict:
    return {
        "id": dept.dept_id,
        "label": dept.dept_name,
        "children": [dept_tree(child) for child in getattr(dept, "children", [])],
    }


@router.get("/role/list")
async def role_list(
    db: Annotated[AsyncSession, Depends(get_db)],
    _login_user: Annotated[LoginUser, Depends(require_perm("system:role:list"))],
    pages: Annotated[tuple[int, int], Depends(page_params)],
    role_name: str | None = Query(None, alias="roleName"),
    role_key: str | None = Query(None, alias="roleKey"),
    status: str | None = None,
    begin_time: str | None = Query(None, alias="beginTime"),
    end_time: str | None = Query(None, alias="endTime"),
):
    stmt = select(SysRole).where(SysRole.del_flag == "0").order_by(SysRole.role_sort)
    if role_name:
        stmt = stmt.where(SysRole.role_name.ilike(f"%{role_name}%"))
    if role_key:
        stmt = stmt.where(SysRole.role_key.ilike(f"%{role_key}%"))
    if status:
        stmt = stmt.where(SysRole.status == status)
    stmt = apply_time_range(stmt, SysRole.create_time, begin_time, end_time)
    rows, total = await page_query(db, stmt, *pages)
    return table([serialize_role(row) for row in rows], total)


@router.post("/role")
async def role_add(
    body: dict[str, Any],
    db: Annotated[AsyncSession, Depends(get_db)],
    login_user: Annotated[LoginUser, Depends(require_perm("system:role:add"))],
):
    await ensure_unique(db, SysRole, SysRole.role_name, field(body, "roleName"), "角色名称已存在")
    await ensure_unique(db, SysRole, SysRole.role_key, field(body, "roleKey"), "权限字符已存在")
    role = SysRole(
        role_name=field(body, "roleName"),
        role_key=field(body, "roleKey"),
        role_sort=int(field(body, "roleSort", 0)),
        data_scope=field(body, "dataScope", "1"),
        menu_check_strictly=bool(field(body, "menuCheckStrictly", True)),
        dept_check_strictly=bool(field(body, "deptCheckStrictly", True)),
        status=field(body, "status", "0"),
        remark=field(body, "remark"),
        create_by=current_name(login_user),
        create_time=datetime.now(),
    )
    db.add(role)
    await db.flush()
    if has_field(body, "menuIds"):
        await sync_role_menus(db, role.role_id, field(body, "menuIds", []))
    await db.commit()
    return success()


@router.put("/role")
async def role_edit(
    body: dict[str, Any],
    db: Annotated[AsyncSession, Depends(get_db)],
    login_user: Annotated[LoginUser, Depends(require_perm("system:role:edit"))],
):
    role = await ensure_exists(db, SysRole, int(field(body, "roleId")))
    await ensure_unique(db, SysRole, SysRole.role_name, field(body, "roleName"), "角色名称已存在", SysRole.role_id, role.role_id)
    await ensure_unique(db, SysRole, SysRole.role_key, field(body, "roleKey"), "权限字符已存在", SysRole.role_id, role.role_id)
    if role.is_admin:
        raise HTTPException(status_code=400, detail="不能修改超级管理员角色")
    for attr, key in [
        ("role_name", "roleName"),
        ("role_key", "roleKey"),
        ("role_sort", "roleSort"),
        ("data_scope", "dataScope"),
        ("menu_check_strictly", "menuCheckStrictly"),
        ("dept_check_strictly", "deptCheckStrictly"),
        ("status", "status"),
        ("remark", "remark"),
    ]:
        value = field(body, key)
        if value is not None:
            setattr(role, attr, value)
    role.update_by = current_name(login_user)
    role.update_time = datetime.now()
    if has_field(body, "menuIds"):
        await sync_role_menus(db, role.role_id, field(body, "menuIds", []))
    await db.commit()
    await invalidate_tokens_for_role(db, role.role_id)
    return success()


@router.put("/role/dataScope")
async def role_data_scope(
    body: dict[str, Any],
    db: Annotated[AsyncSession, Depends(get_db)],
    login_user: Annotated[LoginUser, Depends(require_perm("system:role:edit"))],
):
    role = await ensure_exists(db, SysRole, int(field(body, "roleId")))
    if role.is_admin:
        raise HTTPException(status_code=400, detail="不能修改超级管理员角色")
    role.data_scope = str(field(body, "dataScope", role.data_scope))
    role.update_by = current_name(login_user)
    role.update_time = datetime.now()
    await sync_role_depts(db, role.role_id, field(body, "deptIds", []))
    await db.commit()
    await invalidate_tokens_for_role(db, role.role_id)
    return success()


@router.put("/role/changeStatus")
async def role_change_status(
    body: dict[str, Any],
    db: Annotated[AsyncSession, Depends(get_db)],
    login_user: Annotated[LoginUser, Depends(require_perm("system:role:edit"))],
):
    role = await ensure_exists(db, SysRole, int(field(body, "roleId")))
    if role.is_admin:
        raise HTTPException(status_code=400, detail="不能停用超级管理员角色")
    role.status = str(field(body, "status", role.status))
    role.update_by = current_name(login_user)
    role.update_time = datetime.now()
    await db.commit()
    await invalidate_tokens_for_role(db, role.role_id)
    return success()


@router.delete("/role/{role_ids}")
async def role_remove(
    role_ids: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _login_user: Annotated[LoginUser, Depends(require_perm("system:role:remove"))],
):
    ids = [int(item) for item in role_ids.split(",") if item]
    if 1 in ids:
        raise HTTPException(status_code=400, detail="不能删除超级管理员角色")
    for role_id in ids:
        await invalidate_tokens_for_role(db, role_id)
    rows = (await db.execute(select(SysRole).where(SysRole.role_id.in_(ids)))).scalars()
    for role in rows:
        role.del_flag = "2"
    await db.commit()
    return success()


@router.get("/role/optionselect")
async def role_optionselect(
    db: Annotated[AsyncSession, Depends(get_db)],
    _login_user: Annotated[LoginUser, Depends(require_perm("system:role:query"))],
):
    rows = list((await db.execute(select(SysRole).where(SysRole.del_flag == "0"))).scalars())
    return success([serialize_role(row) for row in rows])


@router.get("/role/deptTree/{role_id}")
async def role_dept_tree(
    role_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _login_user: Annotated[LoginUser, Depends(require_perm("system:role:query"))],
):
    depts = list(
        (await db.execute(select(SysDept).where(SysDept.del_flag == "0").order_by(SysDept.order_num))).scalars()
    )
    checked = list(
        (await db.execute(select(SysRoleDept.dept_id).where(SysRoleDept.role_id == role_id))).scalars()
    )
    return success(depts=[dept_tree(node) for node in build_dept_tree(depts, 0)], checkedKeys=checked)


@router.get("/role/authUser/allocatedList")
async def role_allocated_users(
    role_id: int = Query(..., alias="roleId"),
    db: AsyncSession = Depends(get_db),
    pages: tuple[int, int] = Depends(page_params),
    user_name: str | None = Query(None, alias="userName"),
    phonenumber: str | None = None,
    _login_user: LoginUser = Depends(require_perm("system:role:query")),
):
    stmt = (
        select(SysUser)
        .join(SysUserRole, SysUser.user_id == SysUserRole.user_id)
        .where(SysUser.del_flag == "0", SysUserRole.role_id == role_id)
        .order_by(SysUser.user_id)
    )
    if user_name:
        stmt = stmt.where(SysUser.user_name.ilike(f"%{user_name}%"))
    if phonenumber:
        stmt = stmt.where(SysUser.phonenumber.ilike(f"%{phonenumber}%"))
    rows, total = await page_query(db, stmt, *pages)
    return table([serialize_user(row) for row in rows], total)


@router.get("/role/authUser/unallocatedList")
async def role_unallocated_users(
    role_id: int = Query(..., alias="roleId"),
    db: AsyncSession = Depends(get_db),
    pages: tuple[int, int] = Depends(page_params),
    user_name: str | None = Query(None, alias="userName"),
    phonenumber: str | None = None,
    _login_user: LoginUser = Depends(require_perm("system:role:query")),
):
    subquery = select(SysUserRole.user_id).where(SysUserRole.role_id == role_id)
    stmt = (
        select(SysUser)
        .where(SysUser.del_flag == "0", SysUser.user_id.not_in(subquery))
        .order_by(SysUser.user_id)
    )
    if user_name:
        stmt = stmt.where(SysUser.user_name.ilike(f"%{user_name}%"))
    if phonenumber:
        stmt = stmt.where(SysUser.phonenumber.ilike(f"%{phonenumber}%"))
    rows, total = await page_query(db, stmt, *pages)
    return table([serialize_user(row) for row in rows], total)


@router.put("/role/authUser/selectAll")
async def role_auth_user_select_all(
    role_id: int = Query(..., alias="roleId"),
    user_ids: str = Query("", alias="userIds"),
    db: AsyncSession = Depends(get_db),
    _login_user: LoginUser = Depends(require_perm("system:role:edit")),
):
    ids = [int(item) for item in user_ids.split(",") if item]
    existing = set(
        (
            await db.execute(
                select(SysUserRole.user_id).where(
                    SysUserRole.role_id == role_id,
                    SysUserRole.user_id.in_(ids),
                )
            )
        ).scalars()
    )
    db.add_all(
        [SysUserRole(user_id=user_id, role_id=role_id) for user_id in ids if user_id not in existing]
    )
    await db.commit()
    return success()


@router.delete("/role/authUser/cancelAll")
async def role_auth_user_cancel_all(
    role_id: int = Query(..., alias="roleId"),
    user_ids: str = Query("", alias="userIds"),
    db: AsyncSession = Depends(get_db),
    _login_user: LoginUser = Depends(require_perm("system:role:edit")),
):
    ids = [int(item) for item in user_ids.split(",") if item]
    await db.execute(
        delete(SysUserRole).where(
            SysUserRole.role_id == role_id,
            SysUserRole.user_id.in_(ids),
        )
    )
    await db.commit()
    return success()


@router.get("/role/{role_id}")
async def role_detail(
    role_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _login_user: Annotated[LoginUser, Depends(require_perm("system:role:query"))],
):
    role = await ensure_exists(db, SysRole, role_id)
    menu_ids = list(
        (await db.execute(select(SysRoleMenu.menu_id).where(SysRoleMenu.role_id == role_id))).scalars()
    )
    dept_ids = list(
        (await db.execute(select(SysRoleDept.dept_id).where(SysRoleDept.role_id == role_id))).scalars()
    )
    return success(data=serialize_role(role), menuIds=menu_ids, deptIds=dept_ids)


@router.get("/role/export")
async def role_export(
    db: Annotated[AsyncSession, Depends(get_db)],
    _login_user: Annotated[LoginUser, Depends(require_perm("system:role:query"))],
    role_name: str | None = Query(None, alias="roleName"),
    role_key: str | None = Query(None, alias="roleKey"),
    status: str | None = None,
    begin_time: str | None = Query(None, alias="beginTime"),
    end_time: str | None = Query(None, alias="endTime"),
):
    stmt = select(SysRole).where(SysRole.del_flag == "0").order_by(SysRole.role_sort)
    if role_name:
        stmt = stmt.where(SysRole.role_name.ilike(f"%{role_name}%"))
    if role_key:
        stmt = stmt.where(SysRole.role_key.ilike(f"%{role_key}%"))
    if status:
        stmt = stmt.where(SysRole.status == status)
    stmt = apply_time_range(stmt, SysRole.create_time, begin_time, end_time)
    rows = list((await db.execute(stmt)).scalars())
    data = [
        [
            str(r.role_id), r.role_name, r.role_key, str(r.role_sort),
            data_scope_label_str(r.data_scope),
            "正常" if r.status == "0" else "停用",
            str(r.create_time or ""), r.remark or ""
        ]
        for r in rows
    ]
    return await xlsx_export(
        "role_export.xlsx",
        ["角色ID", "角色名称", "权限字符", "排序", "数据范围", "状态", "创建时间", "备注"],
        data,
    )
