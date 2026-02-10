from dataclasses import dataclass
from typing import Callable, Any


@dataclass
class HealResult:
    ok: bool
    attempts: int
    healed: bool
    last_error: str = ""
    result: Any = None


def run_with_self_healing(fn: Callable[[], Any], max_attempts: int = 3, backoff_ms: int = 250) -> HealResult:
    """Generic self-healing executor.
    Strategy:
    - retry transient failures
    - small backoff between attempts
    - mark healed if success after first failure
    """
    import time

    last_error = ""
    for i in range(1, max_attempts + 1):
        try:
            out = fn()
            return HealResult(ok=True, attempts=i, healed=i > 1, result=out)
        except Exception as e:
            last_error = str(e)
            if i < max_attempts:
                time.sleep(backoff_ms / 1000.0)
    return HealResult(ok=False, attempts=max_attempts, healed=False, last_error=last_error)
