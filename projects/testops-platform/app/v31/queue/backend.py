import os


def queue_backend_status():
    """v3.1 queue backend readiness.
    If REDIS_URL is set, mark backend as redis-ready (worker integration hook point).
    """
    redis_url = os.getenv("REDIS_URL", "")
    if redis_url:
        return {"backend": "redis", "ready": True, "redis_url_masked": redis_url[:18] + "..."}
    return {"backend": "inmemory", "ready": True, "note": "Set REDIS_URL to enable Redis/Celery-style backend integration"}
