#!/usr/bin/env bash
# 一键升级：拉最新代码 + 重新构建并启动
# 用法: bash scripts/update.sh
set -euo pipefail

cd "$(dirname "$0")/.."

echo "[update] 拉取最新代码..."
git pull --ff-only

echo "[update] 构建并启动..."
docker compose up -d --build

echo "[update] 等待健康检查..."
sleep 10
docker compose ps

echo "[update] 完成 ✓"
