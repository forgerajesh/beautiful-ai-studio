from app.features.functional.service import run_functional
from app.features.non_functional.service import run_non_functional
from app.features.security.service import run_security
from app.reporting.reporters import write_reports


def run_product_suite(cfg: dict):
    findings = []

    feats = cfg.get("features", {})
    if feats.get("functional", {}).get("enabled", False):
        findings.extend(run_functional(cfg))
    if feats.get("non_functional", {}).get("enabled", False):
        findings.extend(run_non_functional(cfg))
    if feats.get("security", {}).get("enabled", False):
        findings.extend(run_security(cfg))

    report = write_reports(findings, cfg.get("reporting", {}).get("out_dir", "reports"))
    return findings, report
