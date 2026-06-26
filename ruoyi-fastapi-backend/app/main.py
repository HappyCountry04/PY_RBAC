import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.core.operlog import write_oper_log

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def oper_log_middleware(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    cost_ms = int((time.perf_counter() - start) * 1000)

    if request.method in ("POST", "PUT", "DELETE"):
        import asyncio

        url = request.url.path
        client_ip = request.client.host if request.client else ""
        auth = request.headers.get("Authorization", "")

        body_raw = None
        try:
            req_body = await request.body()
            if req_body:
                body_raw = req_body.decode("utf-8", errors="replace")[:2000]
        except Exception:
            pass

        asyncio.ensure_future(
            write_oper_log(
                method=request.method,
                url=url,
                client_ip=client_ip,
                request_body=body_raw,
                response_status=response.status_code,
                response_body=None,
                authorization=auth,
                cost_time=cost_ms,
            )
        )

    return response


app.include_router(api_router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
