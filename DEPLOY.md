# 部署指南

一键部署到 [Zeabur](https://zeabur.com)（推荐，大陆可直连，免费额度够 2000 份问卷使用）。

## 架构

单容器一体化部署：FastAPI 同时提供 API 与前端静态文件。

```
用户 ──HTTPS──> Zeabur(HK/SG) ──> FastAPI 容器
                                 ├── /api/*       → 后端路由
                                 ├── /assets/*    → 前端静态资源
                                 └── /*           → SPA index.html
SQLite 文件挂载在 /data/survey.db (持久 volume)
```

## 一、准备工作

1. 在 https://github.com 创建一个新仓库（例如 `survey-app`）
2. 把整个项目推上去：
   ```bash
   cd F:\问卷程序
   git init
   git add .
   git commit -m "init"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/survey-app.git
   git push -u origin main
   ```
3. 生成一个强管理员密码（本机 Python 即可）：
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```
   保存下来，等会要填到环境变量。

## 二、Zeabur 部署步骤

1. 登录 https://zeabur.com ，用 GitHub 账号授权登录
2. 点 **New Project** → 选一个节点（**Hong Kong** 或 **Singapore**，大陆速度最好）
3. 点 **Add Service** → **Git**，授权并选中你刚才的仓库
4. Zeabur 会自动识别根目录的 `Dockerfile` 并开始构建
5. 构建期间，进入 **Variables** 标签，添加以下环境变量：

   | Key              | Value                                  | 说明                    |
   |------------------|----------------------------------------|-------------------------|
   | `ADMIN_TOKEN`    | `<刚才生成的随机字符串>`                | **必填**，管理员密码    |
   | `DEBUG`          | `false`                                | 保持 false              |
   | `DATABASE_URL`   | `sqlite:////data/survey.db`            | 默认已设，可不填        |

6. 进入 **Volumes** 标签，添加持久卷：
   - **Mount Path**: `/data`
   - **Size**: 1 GiB 即可
7. 进入 **Networking** 标签，点 **Generate Domain**，获得形如 `https://xxx.zeabur.app` 的免费域名
8. 等构建完成（约 2–4 分钟），访问：
   - 问卷：`https://xxx.zeabur.app/s/example`
   - 后台：`https://xxx.zeabur.app/admin/example/stats`（用 ADMIN_TOKEN 登录）
   - 健康：`https://xxx.zeabur.app/api/health`

## 三、首次使用

第一次访问后台时会弹出密码框，输入 `ADMIN_TOKEN` 即可。密码存在浏览器 `sessionStorage`，关闭标签页就清除。

## 四、本地 Docker 测试（可选）

在推送到 Zeabur 之前，可以在本地完整跑一遍生产镜像：

```bash
# 在项目根目录
docker build -t survey-app .

docker run -p 8000:8000 \
  -e ADMIN_TOKEN=test_password_123 \
  -e DEBUG=false \
  -v survey_data:/data \
  survey-app
```

然后访问 http://localhost:8000/s/example 。

## 五、后续更新

只要 `git push` 到 main 分支，Zeabur 会自动重新构建部署。SQLite 数据因为在 volume 里，不会丢失。

## 六、注意事项

- **SQLite 单文件限制**：并发写入性能上限约 100 QPS，2000 份问卷绰绰有余。
- **ICP 备案**：`*.zeabur.app` 子域名无需备案；如果要绑定自己的域名并让大陆 CDN 加速，自定义域名需要备案。
- **速率限制**：提交问卷 `/api/surveys/:slug/responses` 有 `5/minute` 每 IP 限流，防止机刷。
- **数据导出**：CSV 导出通过后台页面下载，带鉴权。命令行直接 curl 必须带 `Authorization: Bearer <token>` header。
- **密钥轮换**：直接在 Zeabur 控制台改 `ADMIN_TOKEN` 并 Redeploy 即可。

## 故障排查

| 现象                          | 原因                         | 解决                               |
|-------------------------------|------------------------------|------------------------------------|
| 启动失败 `ADMIN_TOKEN 未设置` | 环境变量没配                 | 在 Variables 加上                  |
| 后台 401                      | 密码错了或 token 过期        | 浏览器清 sessionStorage 重登       |
| 数据被清空                    | 没挂 volume 到 /data         | 补上 Volume 配置                   |
| 前端 404                      | 前端构建失败                 | 看 Zeabur 日志的 Build 阶段        |
