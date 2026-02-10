from datetime import datetime, UTC


def now_iso() -> str:
    return datetime.now(UTC).isoformat()
