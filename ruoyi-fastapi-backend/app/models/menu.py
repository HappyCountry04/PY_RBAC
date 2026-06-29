from sqlalchemy import BigInteger, Identity, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.base import AuditMixin


class SysMenu(Base, AuditMixin):
    """菜单表"""
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
