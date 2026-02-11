import sqlite3
from typing import Any, List, Dict
from .base import DBAdapter


class SQLiteAdapter(DBAdapter):
    def __init__(self, database_path: str):
        self.conn = sqlite3.connect(database_path)
        self.conn.row_factory = sqlite3.Row

    def scalar(self, sql: str) -> Any:
        cur = self.conn.cursor()
        cur.execute(sql)
        row = cur.fetchone()
        return None if row is None else row[0]

    def rows(self, sql: str, limit: int = 20) -> List[Dict[str, Any]]:
        cur = self.conn.cursor()
        cur.execute(f"SELECT * FROM ({sql}) LIMIT {limit}")
        return [dict(r) for r in cur.fetchall()]

    def table_schema(self, table: str) -> List[Dict[str, Any]]:
        cur = self.conn.cursor()
        cur.execute(f"PRAGMA table_info({table})")
        rows = cur.fetchall()
        out = []
        for r in rows:
            pk = r[5] == 1
            # SQLite quirk: PRIMARY KEY columns may report notnull=0 unless explicitly declared NOT NULL.
            nullable = (r[3] == 0) and not pk
            out.append(
                {
                    "name": r[1],
                    "type": r[2],
                    "nullable": nullable,
                    "pk": pk,
                }
            )
        return out
