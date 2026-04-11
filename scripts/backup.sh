#!/usr/bin/env bash
# 备份 SQLite 数据库到 ./backups/ 目录
# 用法:
#   bash scripts/backup.sh         # 立即备份一次
#   crontab -e                     # 每天凌晨 3 点自动备份:
#     0 3 * * * /root/survey-app/scripts/backup.sh >> /var/log/survey_backup.log 2>&1
set -euo pipefail

cd "$(dirname "$0")/.."

mkdir -p backups
TS=$(date +%Y%m%d_%H%M%S)
DEST="backups/survey_${TS}.db"

# 在线一致性快照（用 Python 自带的 sqlite3 backup API，并发安全，无需额外依赖）
docker compose exec -T app python -c "
import sqlite3
src = sqlite3.connect('/data/survey.db')
dst = sqlite3.connect('/data/snapshot.db')
with dst:
    src.backup(dst)
src.close(); dst.close()
"
docker compose cp app:/data/snapshot.db "${DEST}"
docker compose exec -T app rm /data/snapshot.db

# 只保留最近 48 份（每小时备份 × 2 天）
ls -1t backups/survey_*.db 2>/dev/null | tail -n +49 | xargs -r rm --

SIZE=$(du -h "${DEST}" | cut -f1)
echo "[backup] ${DEST} (${SIZE}) ✓"
