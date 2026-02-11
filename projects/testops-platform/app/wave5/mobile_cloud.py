from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
import json
import os

import requests

REPORTS_DIR = Path("reports/wave5/mobile-cloud")
LAST_REPORT = REPORTS_DIR / "last-run.json"


@dataclass
class MobileCloudConfig:
    provider: str
    username: str
    access_key: str
    endpoint: str


def _provider_config(provider: str) -> MobileCloudConfig:
    p = provider.lower().strip()
    if p == "browserstack":
        return MobileCloudConfig(
            provider="browserstack",
            username=os.getenv("BROWSERSTACK_USERNAME", ""),
            access_key=os.getenv("BROWSERSTACK_ACCESS_KEY", ""),
            endpoint=os.getenv("BROWSERSTACK_API_URL", "https://api.browserstack.com/app-automate/sessions.json"),
        )
    if p == "saucelabs":
        return MobileCloudConfig(
            provider="saucelabs",
            username=os.getenv("SAUCELABS_USERNAME", ""),
            access_key=os.getenv("SAUCELABS_ACCESS_KEY", ""),
            endpoint=os.getenv("SAUCELABS_API_URL", "https://api.us-west-1.saucelabs.com/rest/v1"),
        )
    raise ValueError(f"unsupported provider: {provider}")


def _simulate(provider: str, device: str, app_url: str, test_spec: str) -> dict:
    return {
        "ok": True,
        "mode": "simulate",
        "provider": provider,
        "device": device,
        "app_url": app_url,
        "test_spec": test_spec,
        "session_id": f"sim-{provider}-{device.replace(' ', '-').lower()}",
        "checks": [
            {"id": "session_boot", "status": "PASS"},
            {"id": "test_dispatch", "status": "PASS"},
            {"id": "result_collect", "status": "PASS"},
        ],
    }


def run_cloud_mobile(
    provider: str,
    device: str = "iPhone 13",
    app_url: str = "https://example.com",
    test_spec: str = "smoke",
    simulate: bool | None = None,
) -> dict:
    cfg = _provider_config(provider)
    should_simulate = bool(simulate) if simulate is not None else not (cfg.username and cfg.access_key)

    if should_simulate:
        result = _simulate(cfg.provider, device, app_url, test_spec)
    else:
        # Skeleton provider integration: validate auth against provider status/session APIs.
        try:
            if cfg.provider == "browserstack":
                response = requests.get(cfg.endpoint, auth=(cfg.username, cfg.access_key), timeout=30)
                response.raise_for_status()
                payload = response.json() if response.text else []
                sample = payload[0].get("automation_session", {}) if isinstance(payload, list) and payload else {}
                result = {
                    "ok": True,
                    "mode": "real",
                    "provider": cfg.provider,
                    "device": device,
                    "app_url": app_url,
                    "test_spec": test_spec,
                    "session_id": sample.get("hashed_id") or "browserstack-session",
                    "raw": {"sessions_returned": len(payload) if isinstance(payload, list) else 1},
                }
            else:
                status_url = f"{cfg.endpoint.rstrip('/')}/{cfg.username}/jobs"
                response = requests.get(status_url, auth=(cfg.username, cfg.access_key), timeout=30)
                response.raise_for_status()
                payload = response.json() if response.text else []
                job_id = payload[0].get("id") if isinstance(payload, list) and payload else "saucelabs-job"
                result = {
                    "ok": True,
                    "mode": "real",
                    "provider": cfg.provider,
                    "device": device,
                    "app_url": app_url,
                    "test_spec": test_spec,
                    "session_id": job_id,
                    "raw": {"jobs_returned": len(payload) if isinstance(payload, list) else 1},
                }
        except Exception as exc:
            result = {
                "ok": False,
                "mode": "real",
                "provider": cfg.provider,
                "device": device,
                "app_url": app_url,
                "test_spec": test_spec,
                "error": str(exc),
            }

    report = {
        "ts": datetime.now(UTC).isoformat(),
        **result,
    }
    persist_run_report(report)
    return report


def persist_run_report(report: dict) -> str:
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    run_file = REPORTS_DIR / f"run-{stamp}.json"
    run_file.write_text(json.dumps(report, indent=2), encoding="utf-8")
    LAST_REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    return str(run_file)


def last_mobile_cloud_report() -> dict:
    if not LAST_REPORT.exists():
        return {"ok": False, "error": "no wave5 mobile cloud report yet"}
    return json.loads(LAST_REPORT.read_text(encoding="utf-8"))
