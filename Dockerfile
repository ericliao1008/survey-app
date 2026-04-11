# ============================================================
# 多阶段构建：Node 构建前端 → Python 运行后端（同时托管前端）
# ============================================================

# --------- Stage 1: 构建前端 ---------
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# 先拷贝依赖清单，利用 Docker 层缓存
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

# 拷贝源码并构建
COPY frontend/ ./
# 一体化部署：前端请求走相对路径 /api
ENV VITE_API_BASE=/api
RUN npm run build


# --------- Stage 2: Python 运行时 ---------
FROM python:3.12-slim AS runtime

# 防止 Python 写 .pyc + 无缓冲日志
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# 系统依赖（最小化）
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# 拷贝 Python 依赖
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install -r backend/requirements.txt

# 拷贝后端源码和问卷定义
COPY backend/ ./backend/

# 拷贝前端构建产物到 backend/static，由 FastAPI 托管
COPY --from=frontend-builder /app/frontend/dist/ ./backend/static/

# 持久化目录（挂载 volume 到这里）
RUN mkdir -p /data
VOLUME ["/data"]

# 默认生产配置（可在平台覆盖）
ENV DEBUG=false \
    DATABASE_URL=sqlite:////data/survey.db \
    PORT=8000

WORKDIR /app/backend

EXPOSE 8000

# 健康检查：用 health 端点
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -fsS http://localhost:${PORT:-8000}/api/health || exit 1

# 启动：用 shell 形式以便展开 $PORT（Zeabur 会注入 PORT 环境变量）
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips='*'
