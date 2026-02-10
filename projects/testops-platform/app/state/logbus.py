from collections import deque
from datetime import datetime, UTC
import json


class LogBus:
    def __init__(self):
        self.buffer = deque(maxlen=500)

    def push(self, level: str, msg: str, data: dict | None = None):
        event = {
            "ts": datetime.now(UTC).isoformat(),
            "level": level,
            "msg": msg,
            "data": data or {},
        }
        self.buffer.append(event)
        return event

    def tail(self, n: int = 100):
        return list(self.buffer)[-n:]

    def tail_jsonl(self, n: int = 100):
        return "\n".join(json.dumps(x) for x in self.tail(n))


logbus = LogBus()
