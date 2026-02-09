from .sqlite_adapter import SQLiteAdapter


def create_adapter(cfg: dict):
    kind = cfg.get("kind")
    if kind == "sqlite":
        return SQLiteAdapter(cfg["database_path"])
    raise ValueError(f"Unsupported adapter kind: {kind}")
