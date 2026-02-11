import os
from dataclasses import dataclass

import jwt
from fastapi import Header, HTTPException


@dataclass
class AuthStatus:
    configured_mode: str
    active_mode: str
    has_jwks: bool
    has_issuer: bool
    fallback_enabled: bool


def _env(name: str, default: str = "") -> str:
    return str(os.getenv(name, default)).strip()


def _bool_env(name: str, default: bool = False) -> bool:
    v = _env(name, "1" if default else "0").lower()
    return v in ("1", "true", "yes", "on")


def _configured_mode() -> str:
    mode = _env("JWT_AUTH_MODE", "auto").lower()
    return mode if mode in ("auto", "hs256", "oidc") else "auto"


def _oidc_available() -> bool:
    return bool(_env("OIDC_JWKS_URL") or _env("OIDC_ISSUER_URL"))


def _active_mode() -> str:
    mode = _configured_mode()
    if mode == "auto":
        return "oidc" if _oidc_available() else "hs256"
    return mode


def auth_mode_status() -> dict:
    st = AuthStatus(
        configured_mode=_configured_mode(),
        active_mode=_active_mode(),
        has_jwks=bool(_env("OIDC_JWKS_URL")),
        has_issuer=bool(_env("OIDC_ISSUER_URL")),
        fallback_enabled=_bool_env("JWT_AUTH_ALLOW_FALLBACK", True),
    )
    return st.__dict__


def _decode_hs256(token: str) -> dict:
    secret = _env("JWT_SECRET", "dev-secret")
    return jwt.decode(token, secret, algorithms=["HS256"])


def _decode_oidc(token: str) -> dict:
    issuer = _env("OIDC_ISSUER_URL")
    jwks_url = _env("OIDC_JWKS_URL") or (f"{issuer.rstrip('/')}/.well-known/jwks.json" if issuer else "")
    if not jwks_url:
        raise RuntimeError("OIDC jwks url is not configured")

    algos = [x.strip() for x in _env("OIDC_ALGORITHMS", "RS256").split(",") if x.strip()]
    audience = _env("OIDC_AUDIENCE")

    jwk_client = jwt.PyJWKClient(jwks_url)
    signing_key = jwk_client.get_signing_key_from_jwt(token)

    kwargs = {
        "algorithms": algos,
        "issuer": issuer or None,
        "options": {"verify_aud": bool(audience)},
    }
    if audience:
        kwargs["audience"] = audience
    return jwt.decode(token, signing_key.key, **kwargs)


def decode_token(token: str) -> tuple[dict, str]:
    mode = _active_mode()
    fallback = _bool_env("JWT_AUTH_ALLOW_FALLBACK", True)

    if mode == "hs256":
        return _decode_hs256(token), "hs256"

    if mode == "oidc":
        try:
            return _decode_oidc(token), "oidc"
        except Exception:
            if fallback:
                return _decode_hs256(token), "hs256-fallback"
            raise

    # auto mode safety
    try:
        return _decode_oidc(token), "oidc"
    except Exception:
        return _decode_hs256(token), "hs256-fallback"


def get_claims_hardened(authorization: str = Header(default="")):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1].strip()
    try:
        claims, mode = decode_token(token)
        claims["_auth_mode"] = mode
        return claims
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


def role_from_claims_hardened(claims: dict) -> str:
    if claims.get("role"):
        return str(claims["role"])
    realm_roles = ((claims.get("realm_access") or {}).get("roles") or [])
    if "admin" in realm_roles:
        return "admin"
    if "operator" in realm_roles:
        return "operator"
    return "viewer"
