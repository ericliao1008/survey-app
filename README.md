# 问卷调查系统

一个轻量级的问卷调查平台，支持电脑和手机填写，匿名提交，可导出 CSV 和查看统计。

## 技术栈

- **后端**：FastAPI + SQLAlchemy 2.0 + SQLite + Pydantic v2
- **前端**：Vite + React 18 + TypeScript + Tailwind CSS
- **存储**：SQLite（文件：`backend/survey.db`，首次启动自动创建）
- **问卷定义**：JSON 文件（`backend/surveys/*.json`）

## 目录结构

```
问卷程序/
├── backend/              # Python 后端
│   ├── app/
│   │   ├── api/          # 路由层
│   │   ├── core/         # 配置
│   │   ├── db/           # 数据库会话 / 初始化
│   │   ├── models/       # SQLAlchemy ORM
│   │   ├── schemas/      # Pydantic DTO
│   │   ├── services/     # 业务逻辑（JSON 导入、CSV 导出、统计）
│   │   └── main.py       # FastAPI 入口
│   ├── surveys/          # 问卷 JSON 定义（之后你往这里放问卷）
│   │   └── example.json  # 示例问卷（7 道题，含所有题型）
│   ├── requirements.txt
│   └── run.py            # 启动脚本
├── frontend/             # React 前端
│   ├── src/
│   │   ├── components/
│   │   │   ├── questions/  # 8 种题型组件
│   │   │   ├── ui/         # 基础 UI 组件
│   │   │   ├── SurveyRunner.tsx
│   │   │   └── ProgressBar.tsx
│   │   ├── pages/        # 页面：问卷 / 感谢 / 统计 / 404
│   │   ├── lib/          # api、types、visitor
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
└── README.md
```

## 快速启动

### 1. 启动后端（终端 A）

```powershell
# 进入项目目录
cd F:\问卷程序

# 激活虚拟环境（已存在 .venv）
.venv\Scripts\activate

# 安装依赖（首次运行）
pip install -r backend\requirements.txt

# 启动后端
cd backend
python run.py
```

后端启动后监听 `http://localhost:8000`，自动文档：`http://localhost:8000/docs`

### 2. 启动前端（终端 B）

```powershell
cd F:\问卷程序\frontend

# 安装依赖（首次运行）
npm install

# 启动开发服务器
npm run dev
```

前端启动后监听 `http://localhost:5173`

### 3. 访问

- **问卷填写**（PC 和手机都能访问）：<http://localhost:5173>
- **统计页**：<http://localhost:5173/admin/example/stats>
- **API 文档**：<http://localhost:8000/docs>

## 手机端访问

前端默认监听所有网卡。在手机上访问：

1. 查看电脑的局域网 IP：`ipconfig`（Windows）
2. 手机浏览器打开：`http://<电脑IP>:5173`
3. 确保电脑防火墙允许 5173 和 8000 端口

> 前端 dev 服务器已通过 Vite proxy 把 `/api` 转发到后端，手机访问 `5173` 即可完整使用。

## 替换问卷内容

**这是本系统的核心流程**：问卷内容通过 JSON 文件管理，无需改代码。

1. 编辑或新建 `backend/surveys/*.json`
2. 重启后端（`python run.py`）—— 启动时自动读取 JSON 重新导入数据库（幂等，同 slug 会覆盖）
3. 如果 `slug` 变了，需要同步修改 `frontend/src/App.tsx` 里的 `DEFAULT_SLUG`

### JSON 格式规范

```json
{
  "slug": "your_survey_id",
  "title": "问卷标题",
  "description": "问卷说明（可选）",
  "is_active": true,
  "questions": [
    {
      "type": "single_choice",
      "text": "题目文字",
      "required": true,
      "options": [
        {"text": "选项A", "value": "a"},
        {"text": "选项B", "value": "b"}
      ]
    }
  ]
}
```

### 支持的题型

| type | 说明 | 额外字段 |
|---|---|---|
| `single_choice` | 单选题 | `options` |
| `multiple_choice` | 多选题 | `options` |
| `text_short` | 短文本输入 | `config.placeholder` |
| `text_long` | 长文本（多行） | `config.placeholder` |
| `likert_5` | 5 点李克特量表 | `config.labels` (可选，5 项) |
| `rating_10` | 0-10 分评分（NPS 式） | 无 |
| `number` | 数字输入 | `config.min`, `config.max`, `config.placeholder` |
| `date` | 日期选择 | 无 |

### 题目字段说明

- **`required`**：是否必答（默认 `true`）
- **`options.value`**：后端存储使用的内部标识（导出 CSV 时会转换回 `text`）

## API 端点

| Method | 路径 | 说明 |
|---|---|---|
| GET | `/api/health` | 健康检查 |
| GET | `/api/surveys/{slug}` | 获取问卷定义 |
| POST | `/api/surveys/{slug}/responses` | 提交答卷 |
| GET | `/api/admin/surveys/{slug}/stats` | 获取统计数据 |
| GET | `/api/admin/surveys/{slug}/export` | 导出 CSV |

## 功能特性

- ✅ 响应式设计：PC / 平板 / 手机自适应
- ✅ 逐题显示：一次一题，大号触控区，专注填写
- ✅ 进度条：清晰显示进度
- ✅ 匿名提交：基于 `localStorage` 生成 `visitor_id`
- ✅ 防重复提交：同一 `visitor_id` 对同一问卷只能提交一次（后端唯一约束 + 前端标记）
- ✅ 基础统计：选择题计数、数值题均值/极值
- ✅ CSV 导出：UTF-8-BOM 编码，Excel 可直接打开
- ✅ 数据驱动：问卷内容通过 JSON 配置，无需改代码

## 生产构建

```powershell
# 前端构建
cd frontend
npm run build
# 产物在 frontend/dist/

# 后端生产运行
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

生产环境建议：

- 用 Nginx 反向代理前端静态文件到 `/`，API 到 `/api/`
- 后端切换到 PostgreSQL（只需改 `backend/app/core/config.py` 中的 `database_url`）
- 启用 HTTPS
- 后端跑在 Gunicorn + Uvicorn workers 下

## 后续可扩展

- 问卷管理后台 UI（目前仅 JSON 配置）
- 跳题逻辑（根据前一题答案决定显示哪题）
- 多语言切换
- 可视化图表统计
- Alembic 迁移管理
- 单元测试
