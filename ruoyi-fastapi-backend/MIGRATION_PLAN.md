# 若依核心迁移计划

## 第一阶段：后端核心契约

当前脚手架已完成：

- FastAPI 项目结构
- PostgreSQL + SQLAlchemy 的核心 `sys_*` 表模型
- Alembic 初始迁移
- JWT 登录/退出
- Redis token 失效处理
- 若依风格响应结构
- `GET /getInfo`
- `GET /getRouters`
- 权限依赖：`require_perm("system:user:list")`
- SQLAlchemy 数据权限过滤辅助函数
- 基础列表接口：
  - `/system/user/list`
  - `/system/role/list`
  - `/system/menu/list`
  - `/system/menu/treeselect`
  - `/system/dept/list`
  - `/system/post/list`
  - `/system/config/list`
  - `/system/dict/type/list`
  - `/system/dict/data/list`
  - `/monitor/operlog/list`
  - `/monitor/logininfor/list`
- 用户、角色、菜单、部门、岗位、参数、字典、日志的基础增删改查
- 最小初始化数据：`admin / admin123`

## 第二阶段：管理接口完善

后续需要继续补齐和打磨：

- 字段唯一性校验，例如用户名、手机号、邮箱、角色标识、参数键名
- 更完整的错误提示
- 操作日志自动记录
- 角色变更后的在线用户权限刷新
- 数据权限在更多业务查询中的统一应用
- 删除保护和停用保护的边界用例

需要保留的关键行为：

- 超级管理员用户不能被普通接口删除或停用。
- 超级管理员角色不能被普通接口修改。
- 角色权限变化后，应让在线用户权限及时刷新或重新登录。
- 用户、角色、部门查询必须应用数据权限。

## 第三阶段：Next 前端契约

Next.js 前端优先消费以下接口：

- `POST /login`
- `POST /logout`
- `GET /getInfo`
- `GET /getRouters`

按钮权限继续使用若依权限字符，前端可封装类似工具：

```ts
hasPermi(["system:user:add"])
hasRole(["admin"])
```

## 第四阶段：暂缓模块

这些模块可以暂时不迁移：

- 代码生成
- Quartz 定时任务
- Druid 监控
- 服务监控
- 缓存监控页面
- 在线用户强退页面
- Excel 导入导出

## PostgreSQL 数据权限说明

原若依数据权限依赖 MySQL 的 `find_in_set`。FastAPI 版本应使用 SQLAlchemy 过滤条件，并保持 PostgreSQL 友好。

当前辅助函数支持：

- 全部数据：不追加额外条件
- 自定义数据：查询 `sys_role_dept`
- 本部门数据：`dept_id = 当前用户部门ID`
- 本部门及以下数据：匹配部门 `ancestors`
- 仅本人数据：`user_id = 当前用户ID`
