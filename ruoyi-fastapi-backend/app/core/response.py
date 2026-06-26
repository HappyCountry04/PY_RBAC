from typing import Any


def success(data: Any = None, msg: str = "操作成功", **extra: Any) -> dict[str, Any]:
    body: dict[str, Any] = {"code": 200, "msg": msg}
    if data is not None:
        body["data"] = data
    body.update(extra)
    return body


def error(msg: str = "操作失败", code: int = 500, **extra: Any) -> dict[str, Any]:
    body: dict[str, Any] = {"code": code, "msg": msg}
    body.update(extra)
    return body


def table(rows: list[Any], total: int) -> dict[str, Any]:
    return {"code": 200, "msg": "查询成功", "rows": rows, "total": total}
