from sqlalchemy import BigInteger, Identity, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.base import AuditMixin


class SysDictType(Base, AuditMixin):
    """字典类型表"""
    __tablename__ = "sys_dict_type"
    dict_id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    dict_name: Mapped[str | None] = mapped_column(String(100), default="")
    dict_type: Mapped[str] = mapped_column(String(100), unique=True)
    status: Mapped[str] = mapped_column(String(1), default="0")
    remark: Mapped[str | None] = mapped_column(String(500))


class SysDictData(Base, AuditMixin):
    """字典数据表"""
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
