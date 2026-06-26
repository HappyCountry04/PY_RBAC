from dataclasses import dataclass

from sqlalchemy import Select, and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.redis import redis_client
from app.models import SysDept, SysMenu, SysRole, SysRoleDept, SysRoleMenu, SysUser, SysUserRole

ALL_PERMISSION = "*:*:*"
SUPER_ADMIN = "admin"


@dataclass
class LoginUser:
    user: SysUser
    permissions: set[str]
    roles: set[str]
    token_id: str | None = None


async def get_user_by_username(db: AsyncSession, username: str) -> SysUser | None:
    result = await db.execute(
        select(SysUser)
        .options(selectinload(SysUser.roles), selectinload(SysUser.dept))
        .where(SysUser.user_name == username, SysUser.del_flag == "0")
    )
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: int) -> SysUser | None:
    result = await db.execute(
        select(SysUser)
        .options(selectinload(SysUser.roles), selectinload(SysUser.dept))
        .where(SysUser.user_id == user_id, SysUser.del_flag == "0")
    )
    return result.scalar_one_or_none()


async def get_role_keys(user: SysUser) -> set[str]:
    if user.is_admin:
        return {SUPER_ADMIN}
    return {role.role_key for role in user.roles if role.status == "0" and role.del_flag == "0"}


async def get_menu_permissions(db: AsyncSession, user: SysUser) -> set[str]:
    if user.is_admin:
        return {ALL_PERMISSION}
    role_ids = [role.role_id for role in user.roles if role.status == "0" and role.del_flag == "0"]
    if not role_ids:
        return set()
    result = await db.execute(
        select(SysMenu.perms)
        .join(SysRoleMenu, SysRoleMenu.menu_id == SysMenu.menu_id)
        .where(
            SysRoleMenu.role_id.in_(role_ids),
            SysMenu.status == "0",
            SysMenu.perms.is_not(None),
            SysMenu.perms != "",
        )
    )
    permissions: set[str] = set()
    for perms in result.scalars():
        permissions.update(item.strip() for item in perms.split(",") if item.strip())
    return permissions


def has_permission(login_user: LoginUser, permission: str) -> bool:
    return ALL_PERMISSION in login_user.permissions or permission in login_user.permissions


def has_role(login_user: LoginUser, role_key: str) -> bool:
    return SUPER_ADMIN in login_user.roles or role_key in login_user.roles


async def menu_tree_for_user(db: AsyncSession, user: SysUser) -> list[SysMenu]:
    stmt = (
        select(SysMenu)
        .where(SysMenu.status == "0", SysMenu.menu_type.in_(["M", "C"]))
        .order_by(SysMenu.parent_id, SysMenu.order_num)
    )
    if not user.is_admin:
        role_ids = [role.role_id for role in user.roles if role.status == "0" and role.del_flag == "0"]
        if not role_ids:
            return []
        stmt = stmt.join(SysRoleMenu, SysRoleMenu.menu_id == SysMenu.menu_id).where(
            SysRoleMenu.role_id.in_(role_ids)
        )
    result = await db.execute(stmt)
    return build_tree(list(result.scalars().unique()), 0)


def build_tree(menus: list[SysMenu], parent_id: int = 0) -> list[SysMenu]:
    nodes = [m for m in menus if m.parent_id == parent_id]
    for node in nodes:
        setattr(node, "children", build_tree(menus, node.menu_id))
    return nodes


def build_routers(menus: list[SysMenu]) -> list[dict]:
    routers: list[dict] = []
    for menu in menus:
        router = {
            "hidden": menu.visible == "1",
            "name": route_name(menu),
            "path": router_path(menu),
            "component": component(menu),
            "query": menu.query,
            "meta": {
                "title": menu.menu_name,
                "icon": menu.icon,
                "noCache": str(menu.is_cache) == "1",
                "link": menu.path if is_inner_link(menu) else None,
            },
        }
        children = getattr(menu, "children", [])
        if children and menu.menu_type == "M":
            router["alwaysShow"] = True
            router["redirect"] = "noRedirect"
            router["children"] = build_routers(children)
        elif is_menu_frame(menu):
            router["meta"] = None
            router["children"] = [
                {
                    "path": menu.path,
                    "component": menu.component,
                    "name": route_name(menu),
                    "meta": {
                        "title": menu.menu_name,
                        "icon": menu.icon,
                        "noCache": str(menu.is_cache) == "1",
                        "link": menu.path if is_inner_link(menu) else None,
                    },
                    "query": menu.query,
                }
            ]
        routers.append(router)
    return routers


def route_name(menu: SysMenu) -> str:
    name = menu.route_name or menu.path or ""
    return name[:1].upper() + name[1:]


def router_path(menu: SysMenu) -> str:
    if menu.parent_id == 0 and menu.menu_type == "M" and menu.is_frame == 1:
        return f"/{menu.path}"
    if is_menu_frame(menu):
        return "/"
    if menu.parent_id != 0 and is_inner_link(menu):
        return inner_link_path(menu.path)
    return menu.path


def component(menu: SysMenu) -> str:
    if menu.component and not is_menu_frame(menu):
        return menu.component
    if menu.parent_id != 0 and is_inner_link(menu):
        return "InnerLink"
    if menu.parent_id != 0 and menu.menu_type == "M":
        return "ParentView"
    return "Layout"


def is_menu_frame(menu: SysMenu) -> bool:
    return menu.parent_id == 0 and menu.menu_type == "C" and menu.is_frame == 1


def is_inner_link(menu: SysMenu) -> bool:
    return menu.is_frame == 0 and menu.path.startswith(("http://", "https://"))


def inner_link_path(path: str) -> str:
    return (
        path.replace("http://", "")
        .replace("https://", "")
        .replace("www.", "")
        .replace(".", "/")
        .replace(":", "/")
    )


async def apply_data_scope(
    db: AsyncSession,
    stmt: Select,
    login_user: LoginUser,
    dept_column,
    user_column=None,
) -> Select:
    user = login_user.user
    if user.is_admin:
        return stmt

    role_ids = [role.role_id for role in user.roles if role.status == "0" and role.del_flag == "0"]
    if not role_ids:
        return stmt.where(False)

    predicates = []
    for role in user.roles:
        if role.status != "0" or role.del_flag != "0":
            continue
        if role.data_scope == "1":
            return stmt
        if role.data_scope == "2":
            subq = select(SysRoleDept.dept_id).where(SysRoleDept.role_id == role.role_id)
            predicates.append(dept_column.in_(subq))
        elif role.data_scope == "3" and user.dept_id is not None:
            predicates.append(dept_column == user.dept_id)
        elif role.data_scope == "4" and user.dept_id is not None:
            child_depts = select(SysDept.dept_id).where(
                or_(
                    SysDept.dept_id == user.dept_id,
                    func.concat(",", SysDept.ancestors, ",").like(f"%,{user.dept_id},%"),
                )
            )
            predicates.append(dept_column.in_(child_depts))
        elif role.data_scope == "5" and user_column is not None:
            predicates.append(user_column == user.user_id)

    return stmt.where(or_(*predicates)) if predicates else stmt.where(False)


async def invalidate_tokens_for_role(db: AsyncSession, role_id: int) -> int:
    """撤销拥有指定角色的所有用户的登录 token，返回失效的 token 数量"""
    user_ids = list(
        (await db.execute(select(SysUserRole.user_id).where(SysUserRole.role_id == role_id))).scalars()
    )
    if not user_ids:
        return 0

    deleted = 0
    async for key in redis_client.scan_iter(match="login_tokens:*"):
        user_id_str = await redis_client.get(key)
        if user_id_str and int(user_id_str) in user_ids:
            await redis_client.delete(key)
            deleted += 1
    return deleted
