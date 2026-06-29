from sqlalchemy import BigInteger, Identity, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.base import AuditMixin


class SysConfig(Base, AuditMixin):
    """系统参数配置表"""
    __tablename__ = "sys_config"
    config_id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    config_name: Mapped[str | None] = mapped_column(String(100), default="")
    config_key: Mapped[str] = mapped_column(String(100), unique=True)
    config_value: Mapped[str | None] = mapped_column(String(500), default="")
    config_type: Mapped[str | None] = mapped_column(String(1), default="N")
    remark: Mapped[str | None] = mapped_column(String(500))
