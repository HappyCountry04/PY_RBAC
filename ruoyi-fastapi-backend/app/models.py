from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Identity, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class AuditMixin:
    create_by: Mapped[str | None] = mapped_column(String(64), default="")
    create_time: Mapped[datetime | None] = mapped_column(DateTime)
    update_by: Mapped[str | None] = mapped_column(String(64), default="")
    update_time: Mapped[datetime | None] = mapped_column(DateTime)


class SysDept(Base, AuditMixin):
    __tablename__ = "sys_dept"

    dept_id: Mapped[int] = mapped_column(BigInteger, Identity(start=200), primary_key=True)
    parent_id: Mapped[int] = mapped_column(BigInteger, default=0)
    ancestors: Mapped[str] = mapped_column(String(200), default="")
    dept_name: Mapped[str] = mapped_column(String(30), default="")
    order_num: Mapped[int] = mapped_column(Integer, default=0)
    leader: Mapped[str | None] = mapped_column(String(20))
    phone: Mapped[str | None] = mapped_column(String(11))
    email: Mapped[str | None] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(1), default="0")
    del_flag: Mapped[str] = mapped_column(String(1), default="0")


class SysUser(Base, AuditMixin):
    __tablename__ = "sys_user"

    user_id: Mapped[int] = mapped_column(BigInteger, Identity(start=100), primary_key=True)
    dept_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("sys_dept.dept_id"))
    user_name: Mapped[str] = mapped_column(String(30), unique=True)
    nick_name: Mapped[str] = mapped_column(String(30))
    user_type: Mapped[str] = mapped_column(String(2), default="00")
    email: Mapped[str] = mapped_column(String(50), default="")
    phonenumber: Mapped[str] = mapped_column(String(11), default="")
    sex: Mapped[str] = mapped_column(String(1), default="0")
    avatar: Mapped[str] = mapped_column(String(100), default="")
    password: Mapped[str] = mapped_column(String(100), default="")
    status: Mapped[str] = mapped_column(String(1), default="0")
    del_flag: Mapped[str] = mapped_column(String(1), default="0")
    login_ip: Mapped[str] = mapped_column(String(128), default="")
    login_date: Mapped[datetime | None] = mapped_column(DateTime)
    pwd_update_date: Mapped[datetime | None] = mapped_column(DateTime)
    remark: Mapped[str | None] = mapped_column(String(500))

    dept: Mapped[SysDept | None] = relationship(lazy="selectin")
    roles: Mapped[list["SysRole"]] = relationship(
        secondary="sys_user_role", back_populates="users", lazy="selectin"
    )
    posts: Mapped[list["SysPost"]] = relationship(secondary="sys_user_post", lazy="selectin")

    @property
    def is_admin(self) -> bool:
        return self.user_id == 1


class SysRole(Base, AuditMixin):
    __tablename__ = "sys_role"

    role_id: Mapped[int] = mapped_column(BigInteger, Identity(start=100), primary_key=True)
    role_name: Mapped[str] = mapped_column(String(30))
    role_key: Mapped[str] = mapped_column(String(100), unique=True)
    role_sort: Mapped[int] = mapped_column(Integer)
    data_scope: Mapped[str] = mapped_column(String(1), default="1")
    menu_check_strictly: Mapped[bool] = mapped_column(Boolean, default=True)
    dept_check_strictly: Mapped[bool] = mapped_column(Boolean, default=True)
    status: Mapped[str] = mapped_column(String(1), default="0")
    del_flag: Mapped[str] = mapped_column(String(1), default="0")
    remark: Mapped[str | None] = mapped_column(String(500))

    users: Mapped[list[SysUser]] = relationship(
        secondary="sys_user_role", back_populates="roles", lazy="selectin"
    )
    menus: Mapped[list["SysMenu"]] = relationship(secondary="sys_role_menu", lazy="selectin")
    depts: Mapped[list[SysDept]] = relationship(secondary="sys_role_dept", lazy="selectin")

    @property
    def is_admin(self) -> bool:
        return self.role_id == 1 or self.role_key == "admin"


class SysMenu(Base, AuditMixin):
    __tablename__ = "sys_menu"

    menu_id: Mapped[int] = mapped_column(BigInteger, Identity(start=2000), primary_key=True)
    menu_name: Mapped[str] = mapped_column(String(50))
    parent_id: Mapped[int] = mapped_column(BigInteger, default=0)
    order_num: Mapped[int] = mapped_column(Integer, default=0)
    path: Mapped[str] = mapped_column(String(200), default="")
    component: Mapped[str | None] = mapped_column(String(255))
    query: Mapped[str | None] = mapped_column(String(255))
    route_name: Mapped[str | None] = mapped_column(String(50), default="")
    is_frame: Mapped[int] = mapped_column(Integer, default=1)
    is_cache: Mapped[int] = mapped_column(Integer, default=0)
    menu_type: Mapped[str] = mapped_column(String(1), default="")
    visible: Mapped[str] = mapped_column(String(1), default="0")
    status: Mapped[str] = mapped_column(String(1), default="0")
    perms: Mapped[str | None] = mapped_column(String(100))
    icon: Mapped[str | None] = mapped_column(String(100), default="#")
    remark: Mapped[str | None] = mapped_column(String(500), default="")


class SysUserRole(Base):
    __tablename__ = "sys_user_role"
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("sys_user.user_id"), primary_key=True)
    role_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("sys_role.role_id"), primary_key=True)


class SysRoleMenu(Base):
    __tablename__ = "sys_role_menu"
    role_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("sys_role.role_id"), primary_key=True)
    menu_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("sys_menu.menu_id"), primary_key=True)


class SysRoleDept(Base):
    __tablename__ = "sys_role_dept"
    role_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("sys_role.role_id"), primary_key=True)
    dept_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("sys_dept.dept_id"), primary_key=True)


class SysPost(Base, AuditMixin):
    __tablename__ = "sys_post"
    post_id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    post_code: Mapped[str] = mapped_column(String(64))
    post_name: Mapped[str] = mapped_column(String(50))
    post_sort: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(1))
    remark: Mapped[str | None] = mapped_column(String(500))


class SysUserPost(Base):
    __tablename__ = "sys_user_post"
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("sys_user.user_id"), primary_key=True)
    post_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("sys_post.post_id"), primary_key=True)


class SysConfig(Base, AuditMixin):
    __tablename__ = "sys_config"
    config_id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    config_name: Mapped[str | None] = mapped_column(String(100), default="")
    config_key: Mapped[str] = mapped_column(String(100), unique=True)
    config_value: Mapped[str | None] = mapped_column(String(500), default="")
    config_type: Mapped[str | None] = mapped_column(String(1), default="N")
    remark: Mapped[str | None] = mapped_column(String(500))


class SysDictType(Base, AuditMixin):
    __tablename__ = "sys_dict_type"
    dict_id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    dict_name: Mapped[str | None] = mapped_column(String(100), default="")
    dict_type: Mapped[str] = mapped_column(String(100), unique=True)
    status: Mapped[str] = mapped_column(String(1), default="0")
    remark: Mapped[str | None] = mapped_column(String(500))


class SysDictData(Base, AuditMixin):
    __tablename__ = "sys_dict_data"
    dict_code: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    dict_sort: Mapped[int] = mapped_column(Integer, default=0)
    dict_label: Mapped[str | None] = mapped_column(String(100), default="")
    dict_value: Mapped[str | None] = mapped_column(String(100), default="")
    dict_type: Mapped[str | None] = mapped_column(String(100), default="")
    css_class: Mapped[str | None] = mapped_column(String(100))
    list_class: Mapped[str | None] = mapped_column(String(100))
    is_default: Mapped[str | None] = mapped_column(String(1), default="N")
    status: Mapped[str] = mapped_column(String(1), default="0")
    remark: Mapped[str | None] = mapped_column(String(500))


class SysOperLog(Base):
    __tablename__ = "sys_oper_log"
    oper_id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    title: Mapped[str | None] = mapped_column(String(50), default="")
    business_type: Mapped[int | None] = mapped_column(Integer, default=0)
    method: Mapped[str | None] = mapped_column(String(200), default="")
    request_method: Mapped[str | None] = mapped_column(String(10), default="")
    oper_name: Mapped[str | None] = mapped_column(String(50), default="")
    oper_url: Mapped[str | None] = mapped_column(String(255), default="")
    oper_ip: Mapped[str | None] = mapped_column(String(128), default="")
    oper_param: Mapped[str | None] = mapped_column(String(2000), default="")
    json_result: Mapped[str | None] = mapped_column(String(2000), default="")
    status: Mapped[int | None] = mapped_column(Integer, default=0)
    error_msg: Mapped[str | None] = mapped_column(String(2000), default="")
    oper_time: Mapped[datetime | None] = mapped_column(DateTime)
    cost_time: Mapped[int | None] = mapped_column(BigInteger, default=0)


class SysLogininfor(Base):
    __tablename__ = "sys_logininfor"
    info_id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    user_name: Mapped[str | None] = mapped_column(String(50), default="")
    ipaddr: Mapped[str | None] = mapped_column(String(128), default="")
    login_location: Mapped[str | None] = mapped_column(String(255), default="")
    browser: Mapped[str | None] = mapped_column(String(50), default="")
    os: Mapped[str | None] = mapped_column(String(50), default="")
    status: Mapped[str | None] = mapped_column(String(1), default="0")
    msg: Mapped[str | None] = mapped_column(String(255), default="")
    login_time: Mapped[datetime | None] = mapped_column(DateTime)
