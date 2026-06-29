# 若依 FastAPI + Next 迁移进度

本文档记录当前若依前后端分离项目迁移到 FastAPI、PostgreSQL、Next.js 的完成情况和后续待办。

## 项目位置

- 原始若依项目：`RuoYi-Vue-master`
- Python 后端：`ruoyi-fastapi-backend`
- Next 前端：`ruoyi-next-admin`

## 当前运行信息

- 前端地址：`http://127.0.0.1:3000`
- 后端地址：`http://127.0.0.1:8000`
- 默认账号：`admin / admin123`
- PostgreSQL 容器：`pgsql`
- PostgreSQL 端口：`5433 -> 5432`
- 数据库：`ruoyi_fastapi`
- Redis 容器：`myredis`
- Redis 端口：`9379 -> 6379`

## 已完成

### 后端基础能力

- FastAPI 项目骨架，uvicorn 热重载。
- PostgreSQL 异步数据库连接（asyncpg）。
- Redis 异步客户端。
- SQLAlchemy 异步 ORM 模型。
- 若依核心 `sys_*` 表结构迁移。
- PostgreSQL 初始化 SQL：`sql/init_postgres.sql`。
- 默认管理员 + 核心菜单种子数据。
- **代码模块化**：models/ routes/ services/ core/ db/ 分层清晰。
- **全部配置提取到 .env**：数据库/Redis/Token/密码策略/验证码/上传/限流/防重复提交。

### 登录与认证

- `POST /login` 登录（bcrypt 密码校验）。
- `POST /logout` 退出（Redis token 失效）。
- `GET /getInfo` 用户信息（含角色、权限字符）。
- `GET /getRouters` 动态菜单路由（树形 + hidden 标记）。
- JWT token 签发，HS256 签名。
- Redis token 会话（`login_tokens:`）。
- **滑动过期**：剩余不足 20 分钟自动续期，30 分钟无操作过期。
- 权限字符校验 `system:user:list`。
- 超级管理员 `*:*:*` 通配权限。

### 系统管理接口

- 用户管理完整 CRUD + 重置密码 + 状态切换 + 导入导出 + 分配角色。
- 角色管理完整 CRUD + 状态切换 + 菜单权限 + 数据权限部门 + 分配/取消用户。
- 菜单管理完整 CRUD + 树形展示 + 排序。
- 部门管理完整 CRUD + 树形展示 + 排序。
- 岗位管理完整 CRUD + 导出。
- 字典类型 + 字典数据完整 CRUD + 缓存刷新。
- 参数配置完整 CRUD + 按 key 读取 + 缓存刷新。

### Redis 缓存（7 大域全部实现）

| # | 缓存域 | Key 前缀 | 说明 |
|---|--------|----------|------|
| 1 | 登录会话 | `login_tokens:` | Token 会话 + 滑动过期 |
| 2 | 验证码 | `captcha:` | 算术/字符验证码 |
| 3 | 系统参数 | `sys_config:` | 读穿缓存，CRUD 自动刷新 |
| 4 | 数据字典 | `sys_dict:` | 读穿缓存，CRUD 自动刷新 |
| 5 | 密码错误次数 | `pwd_err_cnt:` | 5 次锁定 10 分钟 |
| 6 | 防重复提交 | `repeat_submit:` | 5 秒内禁止重复 |
| 7 | API 限流 | `rate_limit:` | Lua 原子计数器 |

### 监控日志

- 操作日志：列表/删除/清空/导出/详情，异步中间件自动记录。
- 登录日志：列表/删除/清空/导出/解锁，记录 browser/os。

### 前端基础能力

- Next.js 15 App Router 管理端项目。
- 登录页：账号/密码/验证码/自动恢复会话。
- Token localStorage 持久化。
- 动态菜单：根据 `/getRouters` 生成层级树形侧边栏（展开/折叠/隐藏过滤）。
- 路由精确映射（routeMap）+ 动态路由拼接（新增菜单自动展示）。
- 全站三断点响应式自适应（1024px / 820px / 480px）。
- 移动端抽屉式侧边栏 + 遮罩层。

### 前端组件/页面

- 所有管理页面：用户/角色/菜单/部门/岗位/字典/参数/操作日志/登录日志。
- 通用 CRUD：分页、搜索、排序、批量删除、导出。
- 通用 Modal：modalConfirm / modalAlert。
- Pagination 分页组件。
- TableSkeleton 骨架屏。
- SvgIcon 组件（88 个原若依 SVG 图标）。
- DictTag 彩色字典标签组件。
- ThemePicker 主题色切换（8 色）。
- Fullscreen 全屏切换。
- FileUpload / ImageUpload 文件上传组件。
- TreeSelect 树形选择器。
- TreeCheck 树形复选框。
- useClipboard 剪贴板 hook。
- 404 页面（原若依素材）。
- 个人中心：信息查看/修改/头像上传/密码修改。
- 顶部栏：面包屑、全屏、主题色、角色标签、退出。

## 最近更新（2026-06-29）

### 侧边栏重构
- 从扁平列表重构为递归树形菜单（目录 + 子菜单）。
- 选中叶子项高亮（浅蓝背景），父目录仅文字图标变色。
- 隐藏菜单过滤（菜单管理设置隐藏后侧边栏不显示）。
- 新增菜单动态路由展示（无需改前端代码，菜单管理新增后自动出现）。
- 折叠按钮移至底部居中。
- 宽度调整为展开 200px / 收起 68px。

### 全站响应式
- ≤1024px：仪表盘/工具栏自适应。
- ≤820px：侧边栏自动折叠，顶栏竖排，表格/搜索栏紧凑，弹窗缩小，表单标签上置。
- ≤480px：侧边栏变抽屉式（左划弹出 + 遮罩），汉堡菜单按钮，弹窗全屏。

### 认证体验优化
- 刷新页面不再闪现登录页（loading 统一管理，页面组件移除过早跳转）。
- Token 30 分钟过期 + 20 分钟自动续期（滑动过期，与原始若依一致）。
- 密码错误 5 次锁定 10 分钟。

### 后端架构重构
- `models.py` → `models/` 包（8 个领域文件：user/role/menu/dept/post/dict/config/log）。
- `system.py`（2250行）→ `routes/system/` 包（10 个文件：common/user/role/menu/dept/post/config/dict/log）。
- `deps.py` → `deps/` 包（auth.py + interceptors.py）。
- `cache.py` 统一管理 5 种 Redis 缓存服务。
- `.env` 配置 14 项，全部带中文注释。
- 清理死代码和构建产物。

## 待做，中优先级

- 通知公告 `sys_notice` 前后端。
- 在线用户列表 / 强退。
- 服务监控 / 缓存监控。
- 用户导入页面完善。
- 角色分配用户 / 菜单半选逻辑。
- 数据权限严格模式。
- 部门树筛选用户。

## 暂不建议迁移

- 代码生成、Quartz 定时任务、Druid 监控（Java 技术栈绑定太深）。
