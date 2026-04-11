from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

from app.core.config import settings, BASE_DIR
from app.core.limiter import limiter
from app.db.init_db import init_db
from app.api import surveys, admin


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时初始化数据库 + 加载问卷
    init_db()
    # 生产环境必须设置 admin_token，否则拒绝启动
    if not settings.debug and not settings.admin_token:
        raise RuntimeError(
            "ADMIN_TOKEN 未设置。生产环境必须通过环境变量 ADMIN_TOKEN 设置强密码。"
        )
    yield


app = FastAPI(
    title=settings.app_name,
    debug=settings.debug,
    lifespan=lifespan,
    # 生产隐藏文档（可选）
    docs_url="/docs" if settings.debug else None,
    redoc_url=None,
    openapi_url="/openapi.json" if settings.debug else None,
)

# slowapi 限流器
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS：一体化部署（前后端同域）不需要跨域，但保留给自定义域名场景
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(surveys.router)
app.include_router(admin.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "app": settings.app_name}


# ======================================================================
# 静态前端托管：一体化部署，前端 dist 在构建时拷贝到 backend/static
# ======================================================================
STATIC_DIR: Path = BASE_DIR / "static"

if STATIC_DIR.is_dir():
    # /assets 等静态资源走 StaticFiles
    app.mount(
        "/assets",
        StaticFiles(directory=STATIC_DIR / "assets"),
        name="assets",
    )

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        # 保护 /api/* 路径：如果未匹配到 API 路由，返回 404 而不是 index.html
        if full_path.startswith("api/") or full_path.startswith("docs") or full_path == "openapi.json":
            raise HTTPException(status_code=404, detail="Not Found")

        # 具体静态文件（favicon / 字体 / 图标等）
        candidate = STATIC_DIR / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)

        # SPA fallback
        index_file = STATIC_DIR / "index.html"
        if not index_file.is_file():
            raise HTTPException(status_code=404, detail="Frontend not built")
        return FileResponse(index_file)
