from fastapi import Request
from slowapi import Limiter


def get_real_ip(request: Request) -> str:
    """
    在反向代理 / Zeabur 等平台后，request.client.host 通常是内网 IP。
    优先用 X-Forwarded-For 第一个值作为真实客户端 IP 作为限流键。
    """
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else "unknown"


limiter = Limiter(key_func=get_real_ip)
