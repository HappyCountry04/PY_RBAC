from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Identity, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.base import AuditMixin


class SysPost(Base, AuditMixin):
    """岗位表"""
    __tablename__ = "sys_post"
    post_id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    post_code: Mapped[str] = mapped_column(String(64))
    post_name: Mapped[str] = mapped_column(String(50))
    post_sort: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(1))
    remark: Mapped[str | None] = mapped_column(String(500))


class SysUserPost(Base):
    """用户-岗位关联表"""
    __tablename__ = "sys_user_post"
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("sys_user.user_id"), primary_key=True)
    post_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("sys_post.post_id"), primary_key=True)
