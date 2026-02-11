from __future__ import annotations

from dataclasses import dataclass
import os

import requests


@dataclass
class SecretProviderStatus:
    provider: str
    healthy: bool
    details: dict


class SecretProvider:
    def get_secret(self, key: str, default: str | None = None) -> str | None:
        raise NotImplementedError

    def status(self) -> SecretProviderStatus:
        raise NotImplementedError


class EnvSecretProvider(SecretProvider):
    def get_secret(self, key: str, default: str | None = None) -> str | None:
        return os.getenv(key, default)

    def status(self) -> SecretProviderStatus:
        return SecretProviderStatus(provider="env", healthy=True, details={"mode": "direct_env"})


class VaultSecretProvider(SecretProvider):
    def __init__(self):
        self.url = os.getenv("WAVE5_VAULT_URL", "").rstrip("/")
        self.token = os.getenv("WAVE5_VAULT_TOKEN", "")
        self.secret_path = os.getenv("WAVE5_VAULT_SECRET_PATH", "secret/data/testops")

    def _headers(self) -> dict:
        return {"X-Vault-Token": self.token} if self.token else {}

    def _url(self) -> str:
        return f"{self.url}/v1/{self.secret_path.lstrip('/')}"

    def get_secret(self, key: str, default: str | None = None) -> str | None:
        if not self.url or not self.token:
            return os.getenv(key, default)
        try:
            r = requests.get(self._url(), headers=self._headers(), timeout=15)
            r.raise_for_status()
            payload = r.json() or {}
            data = ((payload.get("data") or {}).get("data") or {})
            return data.get(key, os.getenv(key, default))
        except Exception:
            return os.getenv(key, default)

    def status(self) -> SecretProviderStatus:
        if not self.url:
            return SecretProviderStatus(provider="vault", healthy=False, details={"reason": "missing WAVE5_VAULT_URL"})
        if not self.token:
            return SecretProviderStatus(provider="vault", healthy=False, details={"reason": "missing WAVE5_VAULT_TOKEN"})
        try:
            r = requests.get(f"{self.url}/v1/sys/health", headers=self._headers(), timeout=10)
            healthy = r.status_code in (200, 429, 472, 473)
            return SecretProviderStatus(provider="vault", healthy=healthy, details={"status_code": r.status_code, "url": self.url})
        except Exception as exc:
            return SecretProviderStatus(provider="vault", healthy=False, details={"error": str(exc), "url": self.url})


def get_secret_provider() -> SecretProvider:
    mode = os.getenv("WAVE5_SECRET_PROVIDER", "env").lower()
    if mode == "vault":
        return VaultSecretProvider()
    return EnvSecretProvider()


def secrets_status() -> dict:
    provider = get_secret_provider()
    st = provider.status()
    return {"provider": st.provider, "healthy": st.healthy, "details": st.details}
