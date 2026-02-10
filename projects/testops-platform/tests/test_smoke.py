from app.core.config import load_config
from app.core.orchestrator import run_product_suite


def test_config_loads():
    cfg = load_config("config/product.yaml")
    assert "features" in cfg


def test_run_returns_report():
    cfg = load_config("config/product.yaml")
    findings, report = run_product_suite(cfg)
    assert isinstance(findings, list)
    assert "counts" in report
    assert "html" in report
