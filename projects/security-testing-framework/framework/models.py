from dataclasses import dataclass, field
from typing import Any, Dict, List


@dataclass
class Target:
    id: str
    type: str
    base_url: str | None = None
    tags: List[str] = field(default_factory=list)


@dataclass
class CheckSpec:
    id: str
    type: str
    severity: str
    enabled: bool
    params: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Finding:
    check_id: str
    target_id: str
    severity: str
    status: str  # PASS | FAIL | ERROR | INFO
    summary: str
    details: Dict[str, Any] = field(default_factory=dict)
