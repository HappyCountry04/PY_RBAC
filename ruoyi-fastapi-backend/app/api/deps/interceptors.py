"""防重复提交 & API限流 依赖注入"""
from typing import Annotated

from fastapi import Depends, HTTPException, Request

from app.services.cache import rate_limit_check, repeat_submit_check


async def check_repeat_submit(request: Request) -> None:
    """防重复提交检查 — 基于 session + URL """
    session_id = request.headers.get("Authorization", "")
    if not session_id:
        session_id = request.client.host if request.client else "unknown"
    url = request.url.path
    is_dup = await repeat_submit_check(session_id, url)
    if is_dup:
        raise HTTPException(status_code=400, detail="不允许重复提交，请稍候再试")


async def check_rate_limit(request: Request) -> None:
    """API 限流检查 — 基于请求路径"""
    key = request.url.path.replace("/", ":").lstrip(":")
    ok = await rate_limit_check(key)
    if not ok:
        raise HTTPException(status_code=429, detail="访问过于频繁，请稍后重试")


RepeatSubmitCheck = Annotated[None, Depends(check_repeat_submit)]
RateLimitCheck = Annotated[None, Depends(check_rate_limit)]
