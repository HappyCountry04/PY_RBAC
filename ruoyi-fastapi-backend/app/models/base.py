from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column


class AuditMixin:
    """审计字段混入类：创建人、创建时间、更新人、更新时间"""
    create_by: Mapped[str | None] = mapped_column(String(64), default="")
    create_time: Mapped[datetime | None] = mapped_column(DateTime)
    update_by: Mapped[str | None] = mapped_column(String(64), default="")
    update_time: Mapped[datetime | None] = mapped_column(DateTime)
