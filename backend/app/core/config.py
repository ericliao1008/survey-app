from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    """
    所有敏感/环境相关配置均从环境变量读取，开发时可选用 .env 文件。
    生产环境（Zeabur 等）在平台控制台设置环境变量。
    """
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "问卷调查系统"

    # 生产环境必须设为 false（默认）
    debug: bool = False

    # SQLite 数据库文件路径
    # 生产环境推荐 sqlite:////data/survey.db（挂载 volume 到 /data）
    database_url: str = f"sqlite:///{BASE_DIR / 'survey.db'}"

    # 问卷 JSON 定义目录
    surveys_dir: Path = BASE_DIR / "surveys"

    # CORS 允许来源（逗号分隔的字符串，例如 "https://foo.zeabur.app,https://bar.com"）
    # 一体化部署（前后端同域）可留空
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173"

    # 管理员 Bearer Token —— 用于保护 stats/export 端点
    # 生产环境必须设为强密码，否则服务启动会报错
    admin_token: str = ""

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
