import os
import jwt
from fastapi import Header, HTTPException


def get_claims(authorization: str = Header(default="")):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1].strip()
    secret = os.getenv("JWT_SECRET", "dev-secret")
    try:
        claims = jwt.decode(token, secret, algorithms=["HS256"])
        return claims
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


def role_from_claims(claims: dict) -> str:
    return str(claims.get("role", "viewer"))
