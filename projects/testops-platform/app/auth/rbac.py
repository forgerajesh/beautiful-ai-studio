from fastapi import Header, HTTPException


TOKENS = {
    "admin-token": "admin",
    "operator-token": "operator",
    "viewer-token": "viewer",
}


def get_role(x_api_key: str = Header(default="", alias="X-API-Key")) -> str:
    role = TOKENS.get(x_api_key)
    if not role:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return role


def require_role(role: str, allowed: list[str]):
    if role not in allowed:
        raise HTTPException(status_code=403, detail=f"Forbidden for role={role}")
