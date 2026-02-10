#!/usr/bin/env python3
import argparse
from pathlib import Path

from framework.config_loader import load_config
from framework.engine import run_all
from framework.reporters.json_reporter import write_json
from framework.reporters.html_reporter import write_html
from framework.reporters.junit_reporter import write_junit


def main():
    ap = argparse.ArgumentParser(description="SECQ Security Testing Framework Runner")
    ap.add_argument("--config", default="config/targets.yaml")
    args = ap.parse_args()

    cfg = load_config(args.config)
    findings = run_all(cfg)

    out_dir = cfg.get("reporting", {}).get("output_dir", "reports")
    formats = cfg.get("reporting", {}).get("formats", ["json", "html", "junit"])

    generated = []
    if "json" in formats:
        generated.append(write_json(findings, out_dir))
    if "html" in formats:
        generated.append(write_html(findings, out_dir))
    if "junit" in formats:
        generated.append(write_junit(findings, out_dir))

    fail = sum(1 for f in findings if f.status == "FAIL")
    error = sum(1 for f in findings if f.status == "ERROR")

    print("SECQ scan finished")
    print(f"Total findings: {len(findings)} | FAIL={fail} | ERROR={error}")
    for g in generated:
        print(f"Report: {g}")

    raise SystemExit(1 if fail or error else 0)


if __name__ == "__main__":
    main()
