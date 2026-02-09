from dataclasses import dataclass
from typing import Any, Dict, List


@dataclass
class TestCase:
    id: str
    type: str
    severity: str
    params: Dict[str, Any]
    tags: List[str]
