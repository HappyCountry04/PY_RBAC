from sqlalchemy import BigInteger, Boolean, ForeignKey, Identity, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.base import AuditMixin


class SysRole(Base, AuditMixin):
    """角色表"""
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

    users = relationship("SysUser", secondary="sys_user_role", back_populates="roles", lazy="selectin")
    menus = relationship("SysMenu", secondary="sys_role_menu", lazy="selectin")
    depts = relationship("SysDept", secondary="sys_role_dept", lazy="selectin")

    @property
    def is_admin(self) -> bool:
        return self.role_id == 1 or self.role_key == "admin"


class SysRoleMenu(Base):
    """角色-菜单关联表"""
    __tablename__ = "sys_role_menu"
    role_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("sys_role.role_id"), primary_key=True)
    menu_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("sys_menu.menu_id"), primary_key=True)


class SysRoleDept(Base):
    """角色-部门关联表"""
    __tablename__ = "sys_role_dept"
    role_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("sys_role.role_id"), primary_key=True)
    dept_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("sys_dept.dept_id"), primary_key=True)
