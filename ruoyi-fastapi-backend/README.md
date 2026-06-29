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

## 项目结构

```
ruoyi-fastapi-backend/
├── .env                    # 环境变量配置（含中文注释说明）
├── .env.example            # 配置示例文件
├── alembic.ini             # 数据库迁移配置
├── pyproject.toml          # Python 项目依赖管理
│
├── app/                    # 应用主目录
│   ├── main.py             # FastAPI 入口，中间件注册
│   ├── models.py           # 数据模型（向后兼容入口 → 推荐从 models/ 导入）
│   ├── seed.py             # 数据库初始化种子数据
│   │
│   ├── models/             # 📦 数据模型层（按领域拆分）
│   │   ├── base.py         #   审计混入类 AuditMixin
│   │   ├── user.py         #   用户模型 SysUser / SysUserRole
│   │   ├── role.py         #   角色模型 SysRole / SysRoleMenu / SysRoleDept
│   │   ├── menu.py         #   菜单模型 SysMenu
│   │   ├── dept.py         #   部门模型 SysDept
│   │   ├── post.py         #   岗位模型 SysPost / SysUserPost
│   │   ├── dict.py         #   字典模型 SysDictType / SysDictData
│   │   ├── config.py       #   参数配置模型 SysConfig
│   │   └── log.py          #   日志模型 SysOperLog / SysLogininfor
│   │
│   ├── api/                # 🌐 API 接口层
│   │   ├── router.py       #   主路由汇总（注册所有子路由）
│   │   ├── deps.py         #   依赖注入（向后兼容入口）
│   │   ├── deps/           #   依赖注入模块
│   │   │   ├── auth.py     #     JWT 认证 + RBAC 权限校验
│   │   │   └── interceptors.py  #  防重复提交 + API 限流
│   │   └── routes/         #   路由端点
│   │       ├── auth.py     #     /login /logout /getInfo /getRouters
│   │       ├── captcha.py  #     /captchaImage 验证码
│   │       ├── system.py   #     系统路由（向后兼容入口）
│   │       └── system/     #     系统管理路由（按领域拆分）
│   │           ├── common.py    #  公共工具：分页、序列化、导出、树构建
│   │           ├── user.py      #  用户管理 /system/user/*
│   │           ├── role.py      #  角色管理 /system/role/*
│   │           ├── menu.py      #  菜单管理 /system/menu/*
│   │           ├── dept.py      #  部门管理 /system/dept/*
│   │           ├── post.py      #  岗位管理 /system/post/*
│   │           ├── config.py    #  参数配置 /system/config/*
│   │           ├── dict.py      #  字典管理 /system/dict/*
│   │           └── log.py       #  监控日志 /monitor/operlog/* /monitor/logininfor/*
│   │
│   ├── core/               # ⚙️ 核心基础设施
│   │   ├── config.py       #   配置管理（Pydantic Settings，读取 .env）
│   │   ├── security.py     #   JWT 令牌 + bcrypt 密码哈希
│   │   ├── response.py     #   统一响应格式 success() / table()
│   │   └── operlog.py      #   操作日志异步写入
│   │
│   ├── db/                 # 🗄️ 数据库层
│   │   ├── base.py         #   SQLAlchemy 声明基类
│   │   ├── session.py      #   异步数据库会话工厂
│   │   └── redis.py        #   Redis 连接客户端
│   │
│   └── services/           # 📊 业务逻辑层
│       ├── rbac.py         #   RBAC 权限服务：菜单树、角色校验、数据权限
│       └── cache.py        #   Redis 缓存服务：字典、参数、密码、限流、防重复
│
├── migrations/             # Alembic 数据库迁移
├── sql/                    # SQL 初始化脚本
├── logs/                   # 运行日志
└── uploads/                # 文件上传目录
```

### 分层架构

```
┌──────────────────────────────────────────┐
│  api/routes/   ← 路由层（HTTP 端点）       │
├──────────────────────────────────────────┤
│  services/     ← 业务逻辑层（RBAC / 缓存） │
├──────────────────────────────────────────┤
│  models/       ← 数据模型层（ORM）         │
├──────────────────────────────────────────┤
│  db/           ← 数据库层（连接/会话）      │
├──────────────────────────────────────────┤
│  core/         ← 基础设施（配置/安全/响应） │
└──────────────────────────────────────────┘
```

### 配置说明

所有可配置项集中在 `.env` 文件中，支持环境变量覆盖：

| 分类 | 配置项 | 默认值 | 说明 |
|------|--------|--------|------|
| 基础 | `DATABASE_URL` | postgresql+asyncpg://... | PostgreSQL 连接 |
| 基础 | `REDIS_URL` | redis://localhost:6379/0 | Redis 连接 |
| 安全 | `SECRET_KEY` | change-me | JWT 签名密钥 |
| 安全 | `ACCESS_TOKEN_EXPIRE_MINUTES` | 720 | Token 有效期（分钟） |
| 安全 | `CORS_ORIGINS` | http://localhost:3000 | 跨域白名单 |
| 验证码 | `CAPTCHA_ENABLED` | true | 开关 |
| 验证码 | `CAPTCHA_TYPE` | math | math=算术 / char=字符 |
| 密码 | `PASSWORD_MAX_RETRY_COUNT` | 5 | 最大错误次数 |
| 密码 | `PASSWORD_LOCK_TIME_MINUTES` | 10 | 锁定时间（分钟） |
| 上传 | `UPLOAD_PATH` | uploads | 文件上传路径 |
| 防重复 | `REPEAT_SUBMIT_INTERVAL_MS` | 5000 | 重复提交间隔（毫秒） |
| 限流 | `RATE_LIMIT_COUNT` | 100 | 周期内最大请求数 |
| 限流 | `RATE_LIMIT_TIME_SECONDS` | 60 | 限流周期（秒） |

### Redis 缓存说明

| 缓存域 | Key 前缀 | 数据类型 | 过期策略 |
|--------|----------|----------|----------|
| 登录会话 | `login_tokens:` | String(user_id) | Token 有效期 |
| 验证码 | `captcha:` | String | 按需过期 |
| 系统参数 | `sys_config:` | String(config_value) | 读穿缓存，永久 |
| 数据字典 | `sys_dict:` | JSON Array | 读穿缓存，永久 |
| 密码错误 | `pwd_err_cnt:` | Integer 计数 | 锁定时间 |
| 防重复提交 | `repeat_submit:` | Flag | 5秒（可配） |
| API 限流 | `rate_limit:` | Lua 原子计数 | 60秒（可配） |

### 扩展指南

添加新领域模块只需三步：

1. **创建模型**：在 `app/models/` 新建文件，继承 `Base` 和 `AuditMixin`
2. **创建路由**：在 `app/api/routes/` 新建文件，定义 `router = APIRouter()` 和端点
3. **注册路由**：在 `app/api/router.py` 中 `api_router.include_router(xxx.router)`
