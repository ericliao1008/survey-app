# 问卷系统运维手册

> 面向：**已部署到生产环境后**的日常使用与运维。
> 本地开发相关请看 `README.md`。

---

## 1. 部署拓扑

```
                    ┌──────────────────────────────────────┐
                    │  Aliyun 轻量应用服务器                 │
                    │  8.217.211.182 (香港)                 │
                    │  896 MiB RAM / 1 vCPU / 30 GB         │
                    │                                      │
  用户浏览器 ──HTTPS──▶│  Caddy (80/443)                      │
                    │   ├─ 自动 Let's Encrypt 证书          │
                    │   └─ 反向代理 → uvicorn:8000          │
                    │                                      │
                    │  Docker Compose                      │
                    │   ├─ app        (FastAPI + static)   │
                    │   └─ caddy      (反代 + TLS)          │
                    │                                      │
                    │  持久卷 /data/                        │
                    │   └─ survey.db   ← 真实数据唯一来源   │
                    │                                      │
                    │  /root/survey-app/backups/           │
                    │   └─ survey_*.db × 48 份              │
                    │      ↑ cron 每小时 0 分自动备份        │
                    └──────────────────────────────────────┘
                                    │
                                scp（按需）
                                    ▼
                    ┌──────────────────────────────────────┐
                    │  本地 Windows                         │
                    │  C:\Users\WIN10\Desktop\survey-      │
                    │     backups\   ← 异地冷备              │
                    └──────────────────────────────────────┘
```

**域名**：`https://survey.deeocem.online`
**仓库**：`https://github.com/ericliao1008/survey-app.git`（main 分支）
**服务器代码位置**：`/root/survey-app/`

---

## 2. 三层数据保险（关键概念）

| 层 | 位置 | 用途 | 更新节奏 |
|---|---|---|---|
| 主库（唯一真实数据源） | 服务器 `/data/survey.db`（docker volume） | 用户提交直接写这里，后台读这里 | 实时 |
| 服务器快照 | 服务器 `/root/survey-app/backups/` | 主库损坏时回滚 | cron 每小时整点 |
| 本地异地冷备 | Windows `Desktop\survey-backups\` | 机房灾难时恢复 | 按需 scp |

**除非你主动 `docker volume rm survey-app_survey_data`，否则主库永远不会丢失。**

---

## 3. 三个终端身份（粘贴命令前先看提示符）

| 提示符 | 是什么 | 能跑什么 |
|---|---|---|
| `PS C:\Users\WIN10>` | 本地 Windows PowerShell | `scp`、`Get-ChildItem`、`New-Item` |
| `PS F:\问卷程序>` | 本地项目目录 PowerShell | `git`、`npm`、`python`（本地开发） |
| `[root@iZj6... survey-app]#` | 服务器 SSH bash | `docker compose`、`curl`、`bash scripts/*` |

**最常见事故**：把 PowerShell 命令贴进服务器 bash，或反之。**贴之前先看提示符**。

---

## 4. 日常使用场景手册

### 场景 A：查看已收到多少份答卷

**浏览器**打开：
```
https://survey.deeocem.online/admin/yuyuan/stats
```
第一次会要求输入 admin token（填一次后存 localStorage，以后自动带）。

### 场景 B：导出所有答卷为 CSV

在场景 A 的页面里点"导出 CSV"按钮 → 浏览器直接下载 UTF-8-BOM 编码文件 → Excel 可直接打开。

### 场景 C：手动拉一份服务器 .db 备份到本地

**本地 PowerShell**：
```powershell
scp "root@8.217.211.182:/root/survey-app/backups/*.db" "$env:USERPROFILE\Desktop\survey-backups\"
```
提示输入服务器 root 密码，传输完成后不会有特别提示，直接回到 `PS>`。

**建议频率**：收集中每 3-7 天一次；收集结束时最后一次。

### 场景 D：修改问卷内容（增减题目 / 改文案 / 换 slug）

1. **本地**编辑 `backend/surveys/yuyuan.json`
2. （如果改了 `slug`）同步改 `frontend/src/App.tsx:12` 的 `DEFAULT_SLUG`
3. `git add -A && git commit -m "update survey" && git push`
4. **服务器 SSH**：
   ```bash
   cd /root/survey-app && git pull --ff-only && bash scripts/update.sh
   ```
5. **重要**：JSON 导入是"幂等覆盖"——同 slug 会覆盖题目定义，**但不会删除已收到的答卷**。

### 场景 E：修改问卷后已有的答卷怎么办？

- 如果**题目顺序/题型没变**，只是改了文案 → 不用处理，CSV 导出仍然正确
- 如果**题目结构大变**（加减题、改 type） → 旧答卷的列会对不上，建议：
  1. 先导出旧 CSV 存档
  2. 然后 `docker compose down && docker volume rm survey-app_survey_data && bash scripts/update.sh` 清库重开
  3. **警告**：这会永久删除所有历史答卷，确认前务必先导 CSV

### 场景 F：收集结束，停掉服务释放资源

**服务器 SSH**：
```bash
cd /root/survey-app && docker compose down
```
数据不会丢（保留在 docker volume）。下次要用再 `docker compose up -d`。

### 场景 G：彻底清空数据重新开始收集

**先导出 CSV 存档**，然后**服务器 SSH**：
```bash
cd /root/survey-app && docker compose down && docker volume rm survey-app_survey_data && bash scripts/update.sh
```
**警告**：这是不可逆操作。

### 场景 H：后台 token 忘了 / 怀疑泄漏需要轮换

**服务器 SSH**：
```bash
cd /root/survey-app
NEW=$(openssl rand -base64 30 | tr -d '+/=' | cut -c1-40)
sed -i "s/^ADMIN_TOKEN=.*/ADMIN_TOKEN=${NEW}/" .env
docker compose up -d
echo "新 token 已写入 .env，请从服务器读取（不要贴到聊天）："
grep ADMIN_TOKEN .env
```
**安全守则**：
- **永远不要把 token 贴到任何对话框**（包括和我的聊天）
- 用密码管理器（1Password / Bitwarden / KeePass）记录
- 只在后台登录时从密码管理器复制粘贴

---

## 5. 问卷 JSON 速查

完整 schema 见 `README.md`，这里给**最常用的 5 种题型模板**：

```json
{
  "slug": "yuyuan",
  "title": "标题",
  "description": "说明",
  "is_active": true,
  "questions": [
    {
      "type": "single_choice",
      "text": "单选题",
      "required": true,
      "options": [
        {"text": "选项A", "value": "a"},
        {"text": "选项B", "value": "b"}
      ]
    },
    {
      "type": "multiple_choice",
      "text": "多选题（可随机化选项）",
      "required": true,
      "config": {"randomize_options": true},
      "options": [
        {"text": "选项A", "value": "a"},
        {"text": "选项B", "value": "b"}
      ]
    },
    {
      "type": "likert_5",
      "text": "5 点量表",
      "required": true,
      "config": {"labels": ["非常不", "不", "一般", "满意", "非常满意"]}
    },
    {
      "type": "rating_10",
      "text": "0-10 分 NPS",
      "required": true
    },
    {
      "type": "text_short",
      "text": "条件显示题（仅 NPS 9-10 分显示）",
      "required": false,
      "config": {
        "placeholder": "提示文字",
        "show_if": {
          "question_order": 4,
          "operator": "gte",
          "value": 9
        }
      }
    },
    {
      "type": "text_long",
      "text": "长文本",
      "required": false,
      "config": {"placeholder": "请畅所欲言..."}
    }
  ]
}
```

**条件显示 `show_if`**：
- `question_order` 是 **0-indexed** 的问题序号
- `operator` 支持：`eq`、`ne`、`gt`、`gte`、`lt`、`lte`、`in`、`not_in`
- 仅对数字题（`rating_10` / `likert_5`）和选择题生效

---

## 6. 服务器关键路径速查

| 用途 | 路径 |
|---|---|
| 项目根（git 仓库） | `/root/survey-app/` |
| 环境变量（含 admin token） | `/root/survey-app/.env` |
| 备份脚本 | `/root/survey-app/scripts/backup.sh` |
| 更新脚本 | `/root/survey-app/scripts/update.sh` |
| 快照目录 | `/root/survey-app/backups/` |
| Caddy 配置 | `/root/survey-app/Caddyfile` |
| Docker Compose | `/root/survey-app/docker-compose.yml` |
| 主库（容器内） | `/data/survey.db` |
| 主库（宿主机 docker volume） | `/var/lib/docker/volumes/survey-app_survey_data/_data/survey.db` |
| cron 日志 | `/var/log/survey_backup.log` |

---

## 7. 常用运维命令

### 健康检查

```bash
# API 存活
curl -s -o /dev/null -w "code=%{http_code}\n" https://survey.deeocem.online/api/health

# 问卷定义可读
curl -s -o /dev/null -w "code=%{http_code}\n" https://survey.deeocem.online/api/surveys/yuyuan
```

### 查看实时提交数

```bash
docker compose exec -T app python -c "import sqlite3; c=sqlite3.connect('/data/survey.db'); print('responses:', c.execute('select count(*) from responses').fetchone()[0])"
```

### 查看容器状态

```bash
cd /root/survey-app && docker compose ps
```

### 查看应用日志（最后 100 行）

```bash
cd /root/survey-app && docker compose logs --tail=100 app
```

### 查看 cron 备份日志

```bash
tail -30 /var/log/survey_backup.log
```

### 查看 crontab 配置

```bash
crontab -l
```
预期输出：
```
0 * * * * bash /root/survey-app/scripts/backup.sh >> /var/log/survey_backup.log 2>&1
```

### 查看磁盘剩余

```bash
df -h /
```

### 手动立即备份一次

```bash
cd /root/survey-app && bash scripts/backup.sh
```

### 查看当前所有快照

```bash
ls -lht /root/survey-app/backups/
```

---

## 8. 当前已知技术配置

| 项 | 值 |
|---|---|
| uvicorn worker 数 | 1（单 worker，异步 IO） |
| slowapi 限流（提交答卷） | **30/minute per IP**（`backend/app/api/surveys.py:25`） |
| 默认问卷 slug | `yuyuan`（`frontend/src/App.tsx:12`） |
| SPA 路由白名单 | `/s/*`、`/admin/*`（`backend/app/main.py:75`） |
| cron 备份频率 | 每小时整点（`0 * * * *`） |
| 快照保留数 | 48 份（2 天历史） |
| 单份数据大小 | ~1-3 KB JSON |
| 容量上限（参考） | 8 万份/周轻松，瓶颈不在本机 |

---

## 9. 故障排查

### 9.1 浏览器打不开 / 502 Bad Gateway

```bash
cd /root/survey-app && docker compose ps
# 看两个容器状态是否都是 Up (healthy)

docker compose logs --tail=100 app
# 看有没有 Python 报错

docker compose restart app
# 简单重启通常能解决
```

### 9.2 用户报告提交失败（429 Too Many Requests）

说明 slowapi 把同一 NAT 出口 IP 限流了。短期解决：让用户换网络或等 1 分钟。长期解决：提高 `surveys.py:25` 的 `limiter.limit("N/minute")` 值。

### 9.3 `curl https://localhost` 返回 `tlsv1 alert internal error`

原因：Caddy 的站点块绑定了 `survey.deeocem.online`，SNI=localhost 没有匹配站点。**这不是故障**，是安全配置。要在服务器本地测可用：
```bash
curl -s --resolve survey.deeocem.online:443:127.0.0.1 https://survey.deeocem.online/api/health
```

### 9.4 `curl -I` 返回 405 Method Not Allowed

FastAPI 默认只注册 GET，不处理 HEAD。**改用 GET + 只看 headers**：
```bash
curl -sD - -o /dev/null https://survey.deeocem.online/api/surveys/yuyuan | head -1
```

### 9.5 git commit 报 `Author identity unknown`

一次性注入身份（不污染 config）：
```bash
git -c user.name="ericliao1008" -c user.email="94213036+ericliao1008@users.noreply.github.com" commit -m "..."
```

### 9.6 `docker compose up -d --build` 后代码没生效

常见原因：Docker 用了缓存层。强制重建：
```bash
cd /root/survey-app && docker compose build --no-cache app && docker compose up -d
```

### 9.7 数据看起来"消失了"

**先不要慌，先排查**：
1. `docker compose ps` 确认容器没在用旧 volume
2. `docker compose exec -T app python -c "import sqlite3; c=sqlite3.connect('/data/survey.db'); print(c.execute('select count(*) from responses').fetchone())"` 看主库计数
3. 如果主库确实空了 → 从最近一份 `backups/survey_*.db` 恢复：
   ```bash
   docker compose cp /root/survey-app/backups/survey_20260411_150001.db app:/data/survey.db
   docker compose restart app
   ```

---

## 10. 坑点清单（写给未来的我/Claude）

1. **PowerShell 粘贴有长度限制**：超过 ~100 字符的命令在 SSH 里粘贴会断行，导致 `for` 循环、`-w '%{http_code}'` 等被拆分。长命令拆成多行短命令粘贴。
2. **别用 `${VAR: -1}` 这类 bash 语法在 Alpine 容器里**：容器默认 `sh` 是 BusyBox，不支持 bash 扩展。
3. **admin token 绝不能贴到聊天**：包括"为了让 AI 诊断"也不行。每次都只告诉 AI "我输了 token 后失败"，让 AI 问你关键字（前 2 位、长度）就够了。
4. **`docker volume rm` 是不可逆的**：执行前必须已经导出了 CSV 或拉走了备份。
5. **改 `slug` 一定要两边同步**：`backend/surveys/*.json` 的 `"slug"` 和 `frontend/src/App.tsx` 的 `DEFAULT_SLUG` 必须一致。
6. **JSON 导入幂等但不删除答卷**：改题目结构后，旧答卷的列会对不上，必要时先导 CSV 再清库。
7. **Caddy 绑定域名后本地测试要用 `--resolve`**：`curl https://localhost` 会 TLS 内部错误。
8. **SPA fallback 是白名单不是黑名单**：新增路由前缀（如 `/dashboard/*`）要同步改 `main.py` 的 `_SPA_PATH_RE`。

---

## 11. 容量参考

| 收集规模 | 日均 | 时均峰值 | 当前配置是否够用 | 备注 |
|---|---|---|---|---|
| 100 份/周 | ~15 | ~5 | 够 | 不需要任何调整 |
| 800 份/周（当前目标） | ~115 | ~30-50 | 够 | 当前就是为这个量调的 |
| 2000 份/周 | ~290 | ~80-120 | 够 | 无需改 |
| 10000 份/周 | ~1430 | ~400 | 够 | 建议 uvicorn workers=2 |
| 50000 份/周 | ~7000 | ~1500 | 够 | workers=4，考虑切 PostgreSQL |
| 10万+ 份/周 | - | - | 需要评估 | 升级服务器规格 + PostgreSQL |

瓶颈顺序（从最容易触发到最难）：
1. slowapi 限流（30/min/IP）— 调 `surveys.py:25`
2. uvicorn 单 worker — 调 `Dockerfile` CMD 加 `--workers N`
3. SQLite 写锁 — 切 PostgreSQL
4. 单机 CPU/内存 — 升级服务器
5. Caddy 带宽 — 几乎不会到

---

## 12. 紧急联系 / 快速自愈

**整站挂了先跑这 4 条**：
```bash
cd /root/survey-app
docker compose ps             # 看现状
docker compose logs --tail=50 app    # 看报错
docker compose restart              # 简单重启
curl -s -o /dev/null -w "%{http_code}\n" https://survey.deeocem.online/api/health
```

**90% 的小故障重启就能解决**。如果重启无效，把上面 4 条的输出全贴给 Claude，一起定位根因。
