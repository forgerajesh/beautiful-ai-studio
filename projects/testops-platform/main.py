import argparse
import json

from app.core.config import load_config
from app.core.orchestrator import run_product_suite


def main():
    ap = argparse.ArgumentParser(description="TestOps Platform - unified product testing")
    ap.add_argument("--config", default="config/product.yaml")
    args = ap.parse_args()

    cfg = load_config(args.config)
    findings, report = run_product_suite(cfg)

    status = "PASS" if report["counts"]["fail"] == 0 and report["counts"]["error"] == 0 else "FAIL"
    payload = {
        "status": status,
        "counts": report["counts"],
        "reports": report,
        "findings": [f.__dict__ for f in findings],
    }
    print(json.dumps(payload, indent=2))
    raise SystemExit(0 if status == "PASS" else 1)


if __name__ == "__main__":
    main()
