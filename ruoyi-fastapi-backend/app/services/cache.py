"""
Redis 缓存服务层 — 对应原若依 Java 的 DictUtils / RedisCache / 各类拦截器
"""
import asyncio
import json
import time
from datetime import UTC, datetime, timedelta
from typing import Any

from redis.asyncio import Redis

from app.core.config import settings
from app.db.redis import redis_client

# ── 数据字典缓存 ──────────────────────────────────────────────
DICT_KEY_PREFIX = "sys_dict:"


async def dict_cache_get(dict_type: str) -> list[dict[str, Any]] | None:
    """从 Redis 读取字典数据，未命中返回 None"""
    raw = await redis_client.get(f"{DICT_KEY_PREFIX}{dict_type}")
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return None


async def dict_cache_set(dict_type: str, data: list[dict[str, Any]]) -> None:
    """将字典数据写入 Redis（无 TTL，永久有效）"""
    await redis_client.set(f"{DICT_KEY_PREFIX}{dict_type}", json.dumps(data, ensure_ascii=False, default=str))


async def dict_cache_remove(dict_type: str) -> None:
    """删除单个字典类型的缓存"""
    await redis_client.delete(f"{DICT_KEY_PREFIX}{dict_type}")


async def dict_cache_load_all(db_session) -> None:
    """启动时或刷新时从数据库加载全部字典到 Redis"""
    from sqlalchemy import select

    from app.models import SysDictData

    rows = list((await db_session.execute(select(SysDictData).where(SysDictData.status == "0").order_by(SysDictData.dict_sort))).scalars())
    grouped: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        grouped.setdefault(row.dict_type, []).append(_serialize_dict_data(row))
    for dt, data in grouped.items():
        await dict_cache_set(dt, data)


async def dict_cache_clear() -> None:
    """清除所有字典缓存"""
    keys = [key async for key in redis_client.scan_iter(match=f"{DICT_KEY_PREFIX}*")]
    if keys:
        await redis_client.delete(*keys)


# ── 系统参数缓存 ──────────────────────────────────────────────
CONFIG_KEY_PREFIX = "sys_config:"


async def config_cache_get(config_key: str) -> str | None:
    """读穿缓存：先查 Redis，未命中则查 DB 并回写"""
    raw = await redis_client.get(f"{CONFIG_KEY_PREFIX}{config_key}")
    if raw is not None:
        return raw
    # cache miss → read from DB
    from sqlalchemy import select

    from app.db.session import async_session_factory
    from app.models import SysConfig

    async with async_session_factory() as db:
        item = await db.scalar(select(SysConfig).where(SysConfig.config_key == config_key))
        if item:
            await config_cache_set(config_key, item.config_value)
            return item.config_value
    return None


async def config_cache_set(config_key: str, config_value: str) -> None:
    await redis_client.set(f"{CONFIG_KEY_PREFIX}{config_key}", config_value)


async def config_cache_remove(config_key: str) -> None:
    await redis_client.delete(f"{CONFIG_KEY_PREFIX}{config_key}")


async def config_cache_load_all(db_session) -> None:
    """启动时从数据库加载全部系统参数到 Redis"""
    from sqlalchemy import select

    from app.models import SysConfig

    rows = list((await db_session.execute(select(SysConfig))).scalars())
    for row in rows:
        await config_cache_set(row.config_key, row.config_value)


async def config_cache_clear() -> None:
    """清除所有参数缓存"""
    keys = [key async for key in redis_client.scan_iter(match=f"{CONFIG_KEY_PREFIX}*")]
    if keys:
        await redis_client.delete(*keys)


# ── 密码错误次数缓存 ───────────────────────────────────────────
PWD_ERR_PREFIX = "pwd_err_cnt:"


async def pwd_err_get(username: str) -> int:
    raw = await redis_client.get(f"{PWD_ERR_PREFIX}{username}")
    return int(raw) if raw is not None else 0


async def pwd_err_increment(username: str) -> int:
    """递增密码错误次数并设置过期时间"""
    key = f"{PWD_ERR_PREFIX}{username}"
    current = await redis_client.incr(key)
    lock_minutes = settings.password_lock_time_minutes
    if current == 1:
        await redis_client.expire(key, lock_minutes * 60)
    else:
        ttl = await redis_client.ttl(key)
        if ttl < 0:
            await redis_client.expire(key, lock_minutes * 60)
    return current


async def pwd_err_clear(username: str) -> None:
    """密码验证成功后清除错误计数"""
    await redis_client.delete(f"{PWD_ERR_PREFIX}{username}")


def is_password_locked(retry_count: int) -> bool:
    return retry_count >= settings.password_max_retry_count


# ── 防重复提交 ────────────────────────────────────────────────
REPEAT_SUBMIT_PREFIX = "repeat_submit:"


async def repeat_submit_check(session_id: str, url: str, submit_key: str = "") -> bool:
    """
    检查是否重复提交。
    Returns True 表示重复，False 表示首次提交。
    """
    key = f"{REPEAT_SUBMIT_PREFIX}{session_id}:{url}:{submit_key}"
    exists = await redis_client.exists(key)
    if exists:
        return True
    interval = settings.repeat_submit_interval_ms // 1000 or 5
    await redis_client.setex(key, interval, "1")
    return False


# ── API 限流 (Lua 脚本实现原子计数) ────────────────────────────
RATE_LIMIT_PREFIX = "rate_limit:"

# Lua 脚本：原子 INCR + 首次设置 TTL
_RATE_LIMIT_LUA = """
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])
local current = redis.call('get', key)
if current and tonumber(current) >= limit then
    return 1
end
current = redis.call('incr', key)
if tonumber(current) == 1 then
    redis.call('expire', key, ttl)
end
return 0
"""


async def rate_limit_check(key_suffix: str, count: int | None = None, time_sec: int | None = None) -> bool:
    """
    限流检查。返回 True 表示通过（未超限），False 表示被限流。
    """
    limit = count or settings.rate_limit_count
    ttl = time_sec or settings.rate_limit_time_seconds
    key = f"{RATE_LIMIT_PREFIX}{key_suffix}"
    result = await redis_client.eval(_RATE_LIMIT_LUA, 1, key, limit, ttl)
    return result == 0


# ── 辅助序列化 ────────────────────────────────────────────────


def _serialize_dict_data(row) -> dict[str, Any]:
    return {
        "dictCode": row.dict_code,
        "dictSort": row.dict_sort,
        "dictLabel": row.dict_label,
        "dictValue": row.dict_value,
        "dictType": row.dict_type,
        "cssClass": row.css_class,
        "listClass": row.list_class,
        "isDefault": row.is_default,
        "status": row.status,
        "remark": row.remark,
        "createBy": row.create_by,
        "createTime": str(row.create_time) if row.create_time else None,
        "updateBy": row.update_by,
        "updateTime": str(row.update_time) if row.update_time else None,
    }
