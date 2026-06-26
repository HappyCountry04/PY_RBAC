"""初始化若依核心系统表

迁移编号: 0001_initial
上一个迁移:
创建时间: 2026-06-25
"""
from alembic import op
import sqlalchemy as sa

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "sys_dept",
        sa.Column("dept_id", sa.BigInteger, sa.Identity(start=200), primary_key=True),
        sa.Column("parent_id", sa.BigInteger, nullable=False, server_default="0"),
        sa.Column("ancestors", sa.String(200), nullable=False, server_default=""),
        sa.Column("dept_name", sa.String(30), nullable=False, server_default=""),
        sa.Column("order_num", sa.Integer, nullable=False, server_default="0"),
        sa.Column("leader", sa.String(20)),
        sa.Column("phone", sa.String(11)),
        sa.Column("email", sa.String(50)),
        sa.Column("status", sa.String(1), nullable=False, server_default="0"),
        sa.Column("del_flag", sa.String(1), nullable=False, server_default="0"),
        sa.Column("create_by", sa.String(64), server_default=""),
        sa.Column("create_time", sa.DateTime),
        sa.Column("update_by", sa.String(64), server_default=""),
        sa.Column("update_time", sa.DateTime),
    )
    op.create_table(
        "sys_user",
        sa.Column("user_id", sa.BigInteger, sa.Identity(start=100), primary_key=True),
        sa.Column("dept_id", sa.BigInteger, sa.ForeignKey("sys_dept.dept_id")),
        sa.Column("user_name", sa.String(30), nullable=False, unique=True),
        sa.Column("nick_name", sa.String(30), nullable=False),
        sa.Column("user_type", sa.String(2), nullable=False, server_default="00"),
        sa.Column("email", sa.String(50), server_default=""),
        sa.Column("phonenumber", sa.String(11), server_default=""),
        sa.Column("sex", sa.String(1), server_default="0"),
        sa.Column("avatar", sa.String(100), server_default=""),
        sa.Column("password", sa.String(100), server_default=""),
        sa.Column("status", sa.String(1), nullable=False, server_default="0"),
        sa.Column("del_flag", sa.String(1), nullable=False, server_default="0"),
        sa.Column("login_ip", sa.String(128), server_default=""),
        sa.Column("login_date", sa.DateTime),
        sa.Column("pwd_update_date", sa.DateTime),
        sa.Column("create_by", sa.String(64), server_default=""),
        sa.Column("create_time", sa.DateTime),
        sa.Column("update_by", sa.String(64), server_default=""),
        sa.Column("update_time", sa.DateTime),
        sa.Column("remark", sa.String(500)),
    )
    op.create_table(
        "sys_role",
        sa.Column("role_id", sa.BigInteger, sa.Identity(start=100), primary_key=True),
        sa.Column("role_name", sa.String(30), nullable=False),
        sa.Column("role_key", sa.String(100), nullable=False, unique=True),
        sa.Column("role_sort", sa.Integer, nullable=False),
        sa.Column("data_scope", sa.String(1), nullable=False, server_default="1"),
        sa.Column("menu_check_strictly", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("dept_check_strictly", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("status", sa.String(1), nullable=False, server_default="0"),
        sa.Column("del_flag", sa.String(1), nullable=False, server_default="0"),
        sa.Column("create_by", sa.String(64), server_default=""),
        sa.Column("create_time", sa.DateTime),
        sa.Column("update_by", sa.String(64), server_default=""),
        sa.Column("update_time", sa.DateTime),
        sa.Column("remark", sa.String(500)),
    )
    op.create_table(
        "sys_menu",
        sa.Column("menu_id", sa.BigInteger, sa.Identity(start=2000), primary_key=True),
        sa.Column("menu_name", sa.String(50), nullable=False),
        sa.Column("parent_id", sa.BigInteger, nullable=False, server_default="0"),
        sa.Column("order_num", sa.Integer, nullable=False, server_default="0"),
        sa.Column("path", sa.String(200), nullable=False, server_default=""),
        sa.Column("component", sa.String(255)),
        sa.Column("query", sa.String(255)),
        sa.Column("route_name", sa.String(50), server_default=""),
        sa.Column("is_frame", sa.Integer, nullable=False, server_default="1"),
        sa.Column("is_cache", sa.Integer, nullable=False, server_default="0"),
        sa.Column("menu_type", sa.String(1), nullable=False, server_default=""),
        sa.Column("visible", sa.String(1), nullable=False, server_default="0"),
        sa.Column("status", sa.String(1), nullable=False, server_default="0"),
        sa.Column("perms", sa.String(100)),
        sa.Column("icon", sa.String(100), server_default="#"),
        sa.Column("create_by", sa.String(64), server_default=""),
        sa.Column("create_time", sa.DateTime),
        sa.Column("update_by", sa.String(64), server_default=""),
        sa.Column("update_time", sa.DateTime),
        sa.Column("remark", sa.String(500), server_default=""),
    )
    op.create_table("sys_user_role", sa.Column("user_id", sa.BigInteger, primary_key=True), sa.Column("role_id", sa.BigInteger, primary_key=True))
    op.create_table("sys_role_menu", sa.Column("role_id", sa.BigInteger, primary_key=True), sa.Column("menu_id", sa.BigInteger, primary_key=True))
    op.create_table("sys_role_dept", sa.Column("role_id", sa.BigInteger, primary_key=True), sa.Column("dept_id", sa.BigInteger, primary_key=True))
    op.create_table("sys_user_post", sa.Column("user_id", sa.BigInteger, primary_key=True), sa.Column("post_id", sa.BigInteger, primary_key=True))
    op.create_table(
        "sys_post",
        sa.Column("post_id", sa.BigInteger, sa.Identity(), primary_key=True),
        sa.Column("post_code", sa.String(64), nullable=False),
        sa.Column("post_name", sa.String(50), nullable=False),
        sa.Column("post_sort", sa.Integer, nullable=False),
        sa.Column("status", sa.String(1), nullable=False),
        sa.Column("create_by", sa.String(64), server_default=""),
        sa.Column("create_time", sa.DateTime),
        sa.Column("update_by", sa.String(64), server_default=""),
        sa.Column("update_time", sa.DateTime),
        sa.Column("remark", sa.String(500)),
    )
    op.create_table(
        "sys_config",
        sa.Column("config_id", sa.BigInteger, sa.Identity(), primary_key=True),
        sa.Column("config_name", sa.String(100), server_default=""),
        sa.Column("config_key", sa.String(100), nullable=False, unique=True),
        sa.Column("config_value", sa.String(500), server_default=""),
        sa.Column("config_type", sa.String(1), server_default="N"),
        sa.Column("create_by", sa.String(64), server_default=""),
        sa.Column("create_time", sa.DateTime),
        sa.Column("update_by", sa.String(64), server_default=""),
        sa.Column("update_time", sa.DateTime),
        sa.Column("remark", sa.String(500)),
    )
    op.create_table(
        "sys_dict_type",
        sa.Column("dict_id", sa.BigInteger, sa.Identity(), primary_key=True),
        sa.Column("dict_name", sa.String(100), server_default=""),
        sa.Column("dict_type", sa.String(100), nullable=False, unique=True),
        sa.Column("status", sa.String(1), nullable=False, server_default="0"),
        sa.Column("create_by", sa.String(64), server_default=""),
        sa.Column("create_time", sa.DateTime),
        sa.Column("update_by", sa.String(64), server_default=""),
        sa.Column("update_time", sa.DateTime),
        sa.Column("remark", sa.String(500)),
    )
    op.create_table(
        "sys_dict_data",
        sa.Column("dict_code", sa.BigInteger, sa.Identity(), primary_key=True),
        sa.Column("dict_sort", sa.Integer, nullable=False, server_default="0"),
        sa.Column("dict_label", sa.String(100), server_default=""),
        sa.Column("dict_value", sa.String(100), server_default=""),
        sa.Column("dict_type", sa.String(100), server_default=""),
        sa.Column("css_class", sa.String(100)),
        sa.Column("list_class", sa.String(100)),
        sa.Column("is_default", sa.String(1), server_default="N"),
        sa.Column("status", sa.String(1), nullable=False, server_default="0"),
        sa.Column("create_by", sa.String(64), server_default=""),
        sa.Column("create_time", sa.DateTime),
        sa.Column("update_by", sa.String(64), server_default=""),
        sa.Column("update_time", sa.DateTime),
        sa.Column("remark", sa.String(500)),
    )
    op.create_table(
        "sys_oper_log",
        sa.Column("oper_id", sa.BigInteger, sa.Identity(), primary_key=True),
        sa.Column("title", sa.String(50), server_default=""),
        sa.Column("business_type", sa.Integer, server_default="0"),
        sa.Column("method", sa.String(200), server_default=""),
        sa.Column("request_method", sa.String(10), server_default=""),
        sa.Column("oper_name", sa.String(50), server_default=""),
        sa.Column("oper_url", sa.String(255), server_default=""),
        sa.Column("oper_ip", sa.String(128), server_default=""),
        sa.Column("oper_param", sa.String(2000), server_default=""),
        sa.Column("json_result", sa.String(2000), server_default=""),
        sa.Column("status", sa.Integer, server_default="0"),
        sa.Column("error_msg", sa.String(2000), server_default=""),
        sa.Column("oper_time", sa.DateTime),
        sa.Column("cost_time", sa.BigInteger, server_default="0"),
    )
    op.create_table(
        "sys_logininfor",
        sa.Column("info_id", sa.BigInteger, sa.Identity(), primary_key=True),
        sa.Column("user_name", sa.String(50), server_default=""),
        sa.Column("ipaddr", sa.String(128), server_default=""),
        sa.Column("login_location", sa.String(255), server_default=""),
        sa.Column("browser", sa.String(50), server_default=""),
        sa.Column("os", sa.String(50), server_default=""),
        sa.Column("status", sa.String(1), server_default="0"),
        sa.Column("msg", sa.String(255), server_default=""),
        sa.Column("login_time", sa.DateTime),
    )


def downgrade() -> None:
    for table in [
        "sys_logininfor",
        "sys_oper_log",
        "sys_dict_data",
        "sys_dict_type",
        "sys_config",
        "sys_user_post",
        "sys_role_dept",
        "sys_role_menu",
        "sys_user_role",
        "sys_post",
        "sys_menu",
        "sys_role",
        "sys_user",
        "sys_dept",
    ]:
        op.drop_table(table)
