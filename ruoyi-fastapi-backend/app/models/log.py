from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Identity, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SysOperLog(Base):
    """操作日志表"""
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
    """登录日志表"""
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
