import os

import redis


def _mask(url: str) -> str:
    if len(url) < 22:
        return "***"
    return f"{url[:18]}..."


def queue_readiness() -> dict:
    redis_url = str(os.getenv("REDIS_URL", "")).strip()
    result_backend = str(os.getenv("REDIS_RESULT_BACKEND", "")).strip()

    if not redis_url:
        return {
            "ready": True,
            "backend": "inmemory",
            "broker_connected": True,
            "result_backend_connected": True,
            "note": "Set REDIS_URL/REDIS_RESULT_BACKEND for production queue hardening",
        }

    broker_connected = False
    backend_connected = False
    broker_error = ""
    backend_error = ""

    try:
        redis.Redis.from_url(redis_url, socket_timeout=2).ping()
        broker_connected = True
    except Exception as exc:
        broker_error = str(exc)

    backend_to_check = result_backend or redis_url
    try:
        redis.Redis.from_url(backend_to_check, socket_timeout=2).ping()
        backend_connected = True
    except Exception as exc:
        backend_error = str(exc)

    return {
        "ready": broker_connected and backend_connected,
        "backend": "redis",
        "broker_connected": broker_connected,
        "result_backend_connected": backend_connected,
        "redis_url_masked": _mask(redis_url),
        "result_backend_masked": _mask(backend_to_check),
        "broker_error": broker_error or None,
        "result_backend_error": backend_error or None,
    }


def startup_verify_queue_connectivity() -> dict:
    status = queue_readiness()
    status["verification"] = "startup"
    return status
