# 若依 FastAPI 后端

这是一个基于 FastAPI 重构若依核心后台能力的后端项目。当前目标不是完整复刻若依生态，而是先迁移可运行、可扩展的权限后台核心。

当前保留的若依接口契约：

- `POST /login`
- `POST /logout`
- `GET /getInfo`
- `GET /getRouters`
- `GET /system/*/list`
- 若依风格权限字符，例如 `system:user:list`
- 与原若依接近的 `sys_*` 核心表结构

本阶段暂不迁移代码生成、Quartz 定时任务、Druid 监控和 Java 专属工具。

## 运行方式

推荐在上级目录使用一键启动脚本，同时启动 Docker 容器、后端和前端：

```powershell
cd E:\my\zhiren\RuoYi-Vue-master
.\start-ruoyi-fastapi-dev.ps1
```

也可以单独启动后端：

```powershell
cd ruoyi-fastapi-backend
python -m venv .venv
.\.venv\Scripts\pip install -e .
copy .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

如果使用 Docker 里的独立 PostgreSQL 容器 `pgsql`，当前连接信息是：

```text
主机: localhost
端口: 5433
数据库: ruoyi_fastapi
用户名: postgres
密码: 123456
```

## 初始化数据库

推荐直接执行 PostgreSQL 初始化 SQL：

```powershell
psql -U postgres -d ruoyi_fastapi -f .\sql\init_postgres.sql
```

也可以使用 Alembic 建表：

```powershell
alembic upgrade head
```

如果使用 Alembic 建表，还需要写入最小管理员和核心菜单数据：

```powershell
python -m app.seed
```

如果使用 `sql/init_postgres.sql`，不需要再执行 `python -m app.seed`，SQL 文件已经包含同样的最小初始化数据。

默认登录账号：

```text
admin / admin123
```

## 说明

- 密码校验直接使用 `bcrypt`，兼容若依原始 SQL 中的 `$2a$...` 密码哈希。
- Redis 用于登录 token 会话和退出登录失效处理；当前 `.env` 默认连接 `localhost:9379`。
- 数据权限没有照搬 MyBatis 的 `${params.dataScope}` 字符串拼接方式，而是用 SQLAlchemy 查询条件表达，便于 PostgreSQL 使用和后续维护。
- 当前版本是核心 RBAC 后端，不包含完整若依所有模块。
