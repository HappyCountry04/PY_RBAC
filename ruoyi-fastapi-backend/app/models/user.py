from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Identity, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.base import AuditMixin


class SysUser(Base, AuditMixin):
    """用户表"""
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

    dept = relationship("SysDept", lazy="selectin")
    roles = relationship("SysRole", secondary="sys_user_role", back_populates="users", lazy="selectin")
    posts = relationship("SysPost", secondary="sys_user_post", lazy="selectin")

    @property
    def is_admin(self) -> bool:
        return self.user_id == 1


class SysUserRole(Base):
    """用户-角色关联表"""
    __tablename__ = "sys_user_role"
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("sys_user.user_id"), primary_key=True)
    role_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("sys_role.role_id"), primary_key=True)
