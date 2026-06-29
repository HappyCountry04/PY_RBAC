import os
import time

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

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

        resp_body = None
        try:
            resp_chunks = []
            async for chunk in response.body_iterator:
                resp_chunks.append(chunk)
            resp_body = b"".join(resp_chunks).decode("utf-8", errors="replace")[:2000]
            response = Response(
                content=b"".join(resp_chunks),
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.media_type,
            )
        except Exception:
            pass

        asyncio.ensure_future(
            write_oper_log(
                method=request.method,
                url=url,
                client_ip=client_ip,
                request_body=body_raw,
                response_status=response.status_code,
                response_body=resp_body,
                authorization=auth,
                cost_time=cost_ms,
            )
        )

    return response


app.include_router(api_router)

# Serve uploaded files
uploads_dir = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
