import asyncio
from datetime import datetime

from sqlalchemy import delete, select

from app.core.security import get_password_hash
from app.db.session import AsyncSessionLocal
from app.models import SysDept, SysMenu, SysRole, SysRoleMenu, SysUser, SysUserRole


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        exists = await db.scalar(select(SysUser.user_id).where(SysUser.user_name == "admin"))
        if exists:
            print("已跳过初始化：admin 用户已存在")
            return

        now = datetime.now()
        dept = SysDept(
            dept_id=100,
            parent_id=0,
            ancestors="0",
            dept_name="若依科技",
            order_num=0,
            status="0",
            del_flag="0",
            create_by="admin",
            create_time=now,
        )
        admin_role = SysRole(
            role_id=1,
            role_name="超级管理员",
            role_key="admin",
            role_sort=1,
            data_scope="1",
            status="0",
            del_flag="0",
            create_by="admin",
            create_time=now,
            remark="超级管理员",
        )
        common_role = SysRole(
            role_id=2,
            role_name="普通角色",
            role_key="common",
            role_sort=2,
            data_scope="2",
            status="0",
            del_flag="0",
            create_by="admin",
            create_time=now,
            remark="普通角色",
        )
        admin = SysUser(
            user_id=1,
            dept_id=100,
            user_name="admin",
            nick_name="管理员",
            email="admin@example.com",
            phonenumber="15888888888",
            sex="1",
            password=get_password_hash("admin123"),
            status="0",
            del_flag="0",
            create_by="admin",
            create_time=now,
            remark="管理员",
        )
        menus = [
            SysMenu(menu_id=1, menu_name="系统管理", parent_id=0, order_num=1, path="system", component=None, is_frame=1, is_cache=0, menu_type="M", visible="0", status="0", perms="", icon="system", create_by="admin", create_time=now),
            SysMenu(menu_id=100, menu_name="用户管理", parent_id=1, order_num=1, path="user", component="system/user/index", is_frame=1, is_cache=0, menu_type="C", visible="0", status="0", perms="system:user:list", icon="user", create_by="admin", create_time=now),
            SysMenu(menu_id=101, menu_name="角色管理", parent_id=1, order_num=2, path="role", component="system/role/index", is_frame=1, is_cache=0, menu_type="C", visible="0", status="0", perms="system:role:list", icon="peoples", create_by="admin", create_time=now),
            SysMenu(menu_id=102, menu_name="菜单管理", parent_id=1, order_num=3, path="menu", component="system/menu/index", is_frame=1, is_cache=0, menu_type="C", visible="0", status="0", perms="system:menu:list", icon="tree-table", create_by="admin", create_time=now),
            SysMenu(menu_id=103, menu_name="部门管理", parent_id=1, order_num=4, path="dept", component="system/dept/index", is_frame=1, is_cache=0, menu_type="C", visible="0", status="0", perms="system:dept:list", icon="tree", create_by="admin", create_time=now),
            SysMenu(menu_id=104, menu_name="岗位管理", parent_id=1, order_num=5, path="post", component="system/post/index", is_frame=1, is_cache=0, menu_type="C", visible="0", status="0", perms="system:post:list", icon="post", create_by="admin", create_time=now),
            SysMenu(menu_id=105, menu_name="字典管理", parent_id=1, order_num=6, path="dict", component="system/dict/index", is_frame=1, is_cache=0, menu_type="C", visible="0", status="0", perms="system:dict:list", icon="dict", create_by="admin", create_time=now),
            SysMenu(menu_id=106, menu_name="参数设置", parent_id=1, order_num=7, path="config", component="system/config/index", is_frame=1, is_cache=0, menu_type="C", visible="0", status="0", perms="system:config:list", icon="edit", create_by="admin", create_time=now),
            SysMenu(menu_id=108, menu_name="日志管理", parent_id=1, order_num=8, path="log", component="", is_frame=1, is_cache=0, menu_type="M", visible="0", status="0", perms="", icon="log", create_by="admin", create_time=now),
            SysMenu(menu_id=500, menu_name="操作日志", parent_id=108, order_num=1, path="operlog", component="monitor/operlog/index", is_frame=1, is_cache=0, menu_type="C", visible="0", status="0", perms="monitor:operlog:list", icon="form", create_by="admin", create_time=now),
            SysMenu(menu_id=501, menu_name="登录日志", parent_id=108, order_num=2, path="logininfor", component="monitor/logininfor/index", is_frame=1, is_cache=0, menu_type="C", visible="0", status="0", perms="monitor:logininfor:list", icon="logininfor", create_by="admin", create_time=now),
        ]
        button_defs = [
            ("system:user:query", "用户查询"), ("system:user:add", "用户新增"), ("system:user:edit", "用户修改"), ("system:user:remove", "用户删除"), ("system:user:resetPwd", "重置密码"),
            ("system:role:query", "角色查询"), ("system:role:add", "角色新增"), ("system:role:edit", "角色修改"), ("system:role:remove", "角色删除"),
            ("system:menu:query", "菜单查询"), ("system:menu:add", "菜单新增"), ("system:menu:edit", "菜单修改"), ("system:menu:remove", "菜单删除"),
            ("system:dept:query", "部门查询"), ("system:dept:add", "部门新增"), ("system:dept:edit", "部门修改"), ("system:dept:remove", "部门删除"),
            ("system:post:query", "岗位查询"), ("system:post:add", "岗位新增"), ("system:post:edit", "岗位修改"), ("system:post:remove", "岗位删除"),
            ("system:dict:query", "字典查询"), ("system:dict:add", "字典新增"), ("system:dict:edit", "字典修改"), ("system:dict:remove", "字典删除"),
            ("system:config:query", "参数查询"), ("system:config:add", "参数新增"), ("system:config:edit", "参数修改"), ("system:config:remove", "参数删除"),
            ("monitor:operlog:query", "操作日志查询"), ("monitor:operlog:remove", "操作日志删除"), ("monitor:operlog:export", "操作日志导出"),
            ("monitor:logininfor:query", "登录日志查询"), ("monitor:logininfor:remove", "登录日志删除"), ("monitor:logininfor:export", "登录日志导出"), ("monitor:logininfor:unlock", "解锁用户"),
        ]
        for idx, (perm, name) in enumerate(button_defs, start=1000):
            parent_id = {
                "user": 100,
                "role": 101,
                "menu": 102,
                "dept": 103,
                "post": 104,
                "dict": 105,
                "config": 106,
                "operlog": 500,
                "logininfor": 501,
            }[perm.split(":")[1]]
            menus.append(
                SysMenu(
                    menu_id=idx,
                    menu_name=name,
                    parent_id=parent_id,
                    order_num=idx,
                    path="",
                    component="",
                    is_frame=1,
                    is_cache=0,
                    menu_type="F",
                    visible="0",
                    status="0",
                    perms=perm,
                    icon="#",
                    create_by="admin",
                    create_time=now,
                )
            )

        db.add_all([dept, admin_role, common_role, admin, SysUserRole(user_id=1, role_id=1), *menus])
        db.add_all([SysRoleMenu(role_id=2, menu_id=menu.menu_id) for menu in menus])
        await db.commit()
        print("初始化完成，默认账号：admin / admin123")


if __name__ == "__main__":
    asyncio.run(seed())
