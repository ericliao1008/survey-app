import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response as FastAPIResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.survey import Survey
from app.services.export import export_responses_csv, compute_basic_stats


router = APIRouter(prefix="/api/admin", tags=["admin"])

# auto_error=False：由我们自己抛 401，消息可控
_bearer_scheme = HTTPBearer(auto_error=False)


def require_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> None:
    """
    所有 admin 端点的依赖。要求 Authorization: Bearer <ADMIN_TOKEN>。
    使用 secrets.compare_digest 防 timing attack。
    """
    if not settings.admin_token:
        # 后端未配置 token：直接拒绝，避免空串匹配
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="管理接口未配置鉴权",
        )
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="未授权",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not secrets.compare_digest(credentials.credentials, settings.admin_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.get("/surveys/{slug}/export", dependencies=[Depends(require_admin)])
def export_csv(slug: str, db: Session = Depends(get_db)):
    survey = db.query(Survey).filter(Survey.slug == slug).first()
    if not survey:
        raise HTTPException(status_code=404, detail="问卷不存在")

    csv_str = export_responses_csv(db, survey)
    return FastAPIResponse(
        content=csv_str.encode("utf-8"),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{slug}_responses.csv"'
        },
    )


@router.get("/surveys/{slug}/stats", dependencies=[Depends(require_admin)])
def survey_stats(slug: str, db: Session = Depends(get_db)):
    survey = db.query(Survey).filter(Survey.slug == slug).first()
    if not survey:
        raise HTTPException(status_code=404, detail="问卷不存在")
    return compute_basic_stats(db, survey)
