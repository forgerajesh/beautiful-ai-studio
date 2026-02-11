from fastapi import Header

from app.wave41.auth.oidc_jwt import get_claims_hardened, role_from_claims_hardened


def get_claims(authorization: str = Header(default="")):
    return get_claims_hardened(authorization)


def role_from_claims(claims: dict) -> str:
    return role_from_claims_hardened(claims)
