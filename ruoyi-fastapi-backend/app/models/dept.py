from sqlalchemy import BigInteger, Identity, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.base import AuditMixin


class SysDept(Base, AuditMixin):
    """部门表"""
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
