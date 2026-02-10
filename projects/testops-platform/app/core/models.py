from dataclasses import dataclass, field
from typing import Any, Dict


@dataclass
class Finding:
    domain: str
    check_id: str
    severity: str
    status: str  # PASS|FAIL|ERROR|INFO
    summary: str
    details: Dict[str, Any] = field(default_factory=dict)
