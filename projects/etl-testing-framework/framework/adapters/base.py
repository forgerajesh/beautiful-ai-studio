from abc import ABC, abstractmethod
from typing import Any, List, Dict


class DBAdapter(ABC):
    @abstractmethod
    def scalar(self, sql: str) -> Any:
        raise NotImplementedError

    @abstractmethod
    def rows(self, sql: str, limit: int = 20) -> List[Dict[str, Any]]:
        raise NotImplementedError

    @abstractmethod
    def table_schema(self, table: str) -> List[Dict[str, Any]]:
        raise NotImplementedError
