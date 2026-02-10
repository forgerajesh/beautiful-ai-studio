from fastapi import FastAPI
from app.core.config import load_config
from app.core.orchestrator import run_product_suite

app = FastAPI(title="TestOps Platform API", version="1.0.0")


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/run")
def run_all(config_path: str = "config/product.yaml"):
    cfg = load_config(config_path)
    findings, report = run_product_suite(cfg)
    return {
        "status": "PASS" if report["counts"]["fail"] == 0 and report["counts"]["error"] == 0 else "FAIL",
        "counts": report["counts"],
        "reports": report,
        "findings": [f.__dict__ for f in findings],
    }
