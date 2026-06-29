from typing import Annotated, Any

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_perm
from app.api.routes.system.common import (
    current_name,
    ensure_exists,
    field,
    serialize_menu,
    tree_select,
)
from app.core.response import success
from app.db.session import get_db
from app.models import SysMenu, SysRoleMenu
from app.services.rbac import LoginUser, build_tree

router = APIRouter(prefix="/system", tags=["system"])


@router.get("/menu/list")
async def menu_list(
    db: Annotated[AsyncSession, Depends(get_db)],
    _login_user: Annotated[LoginUser, Depends(require_perm("system:menu:list"))],
    menu_name: str | None = Query(None, alias="menuName"),
    status: str | None = None,
):
    stmt = select(SysMenu).order_by(SysMenu.parent_id, SysMenu.order_num)
    if menu_name:
        stmt = stmt.where(SysMenu.menu_name.ilike(f"%{menu_name}%"))
    if status:
        stmt = stmt.where(SysMenu.status == status)
    rows = list((await db.execute(stmt)).scalars().unique())
    return success([serialize_menu(row) for row in rows])


@router.get("/menu/treeselect")
async def menu_tree_select(
    db: Annotated[AsyncSession, Depends(get_db)],
    _login_user: Annotated[LoginUser, Depends(require_perm("system:menu:list"))],
):
    rows = list((await db.execute(select(SysMenu).order_by(SysMenu.parent_id, SysMenu.order_num))).scalars())
    return success([tree_select(node) for node in build_tree(rows, 0)])


@router.get("/menu/roleMenuTreeselect/{role_id}")
async def menu_role_treeselect(
    role_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _login_user: Annotated[LoginUser, Depends(require_perm("system:role:query"))],
):
    rows = list((await db.execute(select(SysMenu).order_by(SysMenu.parent_id, SysMenu.order_num))).scalars())
    role_menus = list(
        (await db.execute(select(SysRoleMenu.menu_id).where(SysRoleMenu.role_id == role_id))).scalars()
    )
    tree = [tree_select(node) for node in build_tree(rows, 0)]
    return success(checkedKeys=role_menus, menus=tree)


@router.get("/menu/{menu_id}")
async def menu_detail(
    menu_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _login_user: Annotated[LoginUser, Depends(require_perm("system:menu:query"))],
):
    menu = await ensure_exists(db, SysMenu, menu_id)
    return success(data=serialize_menu(menu))


@router.post("/menu")
async def menu_add(
    body: dict[str, Any],
    db: Annotated[AsyncSession, Depends(get_db)],
    login_user: Annotated[LoginUser, Depends(require_perm("system:menu:add"))],
):
    same_name = await db.scalar(
        select(func.count()).select_from(SysMenu).where(
            SysMenu.parent_id == int(field(body, "parentId", 0)),
            SysMenu.menu_name == field(body, "menuName"),
        )
    )
    if same_name:
        raise HTTPException(status_code=400, detail="同级菜单名称已存在")
    menu = SysMenu(
        menu_name=field(body, "menuName"),
        parent_id=int(field(body, "parentId", 0)),
        order_num=int(field(body, "orderNum", 0)),
        path=field(body, "path", ""),
        component=field(body, "component"),
        query=field(body, "query"),
        route_name=field(body, "routeName", ""),
        is_frame=int(field(body, "isFrame", 1)),
        is_cache=int(field(body, "isCache", 0)),
        menu_type=field(body, "menuType", ""),
        visible=field(body, "visible", "0"),
        status=field(body, "status", "0"),
        perms=field(body, "perms"),
        icon=field(body, "icon", "#"),
        remark=field(body, "remark", ""),
        create_by=current_name(login_user),
        create_time=datetime.now(),
    )
    db.add(menu)
    await db.commit()
    return success()


@router.put("/menu")
async def menu_edit(
    body: dict[str, Any],
    db: Annotated[AsyncSession, Depends(get_db)],
    login_user: Annotated[LoginUser, Depends(require_perm("system:menu:edit"))],
):
    menu = await ensure_exists(db, SysMenu, int(field(body, "menuId")))
    parent_id_value = int(field(body, "parentId", menu.parent_id))
    same_name = await db.scalar(
        select(func.count()).select_from(SysMenu).where(
            SysMenu.parent_id == parent_id_value,
            SysMenu.menu_name == field(body, "menuName"),
            SysMenu.menu_id != menu.menu_id,
        )
    )
    if same_name:
        raise HTTPException(status_code=400, detail="同级菜单名称已存在")
    for attr, key in [
        ("menu_name", "menuName"),
        ("parent_id", "parentId"),
        ("order_num", "orderNum"),
        ("path", "path"),
        ("component", "component"),
        ("query", "query"),
        ("route_name", "routeName"),
        ("is_frame", "isFrame"),
        ("is_cache", "isCache"),
        ("menu_type", "menuType"),
        ("visible", "visible"),
        ("status", "status"),
        ("perms", "perms"),
        ("icon", "icon"),
        ("remark", "remark"),
    ]:
        value = field(body, key)
        if value is not None:
            setattr(menu, attr, value)
    menu.update_by = current_name(login_user)
    menu.update_time = datetime.now()
    await db.commit()
    return success()


@router.delete("/menu/{menu_ids}")
async def menu_remove(
    menu_ids: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _login_user: Annotated[LoginUser, Depends(require_perm("system:menu:remove"))],
):
    ids = [int(item) for item in menu_ids.split(",") if item]
    for menu_id in ids:
        children = await db.scalar(select(func.count()).select_from(SysMenu).where(SysMenu.parent_id == menu_id))
        if children:
            raise HTTPException(status_code=400, detail="存在子菜单，不能删除")
    await db.execute(delete(SysMenu).where(SysMenu.menu_id.in_(ids)))
    await db.commit()
    return success()


@router.put("/menu/updateSort")
async def menu_update_sort(
    body: dict[str, Any],
    db: Annotated[AsyncSession, Depends(get_db)],
    login_user: Annotated[LoginUser, Depends(require_perm("system:menu:edit"))],
):
    menu_ids = field(body, "menuIds", "")
    order_nums = field(body, "orderNums", "")
    if not menu_ids or not order_nums:
        raise HTTPException(status_code=400, detail="参数不能为空")
    id_list = [int(x) for x in str(menu_ids).split(",")]
    num_list = [int(x) for x in str(order_nums).split(",")]
    for menu_id, order_num in zip(id_list, num_list):
        menu = await db.get(SysMenu, menu_id)
        if menu:
            menu.order_num = order_num
            menu.update_by = current_name(login_user)
            menu.update_time = datetime.now()
    await db.commit()
    return success()
