from pathlib import Path
import yaml

ROOT = Path(__file__).resolve().parents[2]


def load_tier_config(path: str = "config/table_tiers.yaml") -> dict:
    p = ROOT / path
    if not p.exists():
        return {"table_tiers": {}, "business_impact_weights": {}}
    with open(p, "r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def rank_severity(table: str, tags: list[str], default: str = "high") -> str:
    cfg = load_tier_config()
    tier = int((cfg.get("table_tiers") or {}).get(table, 3))  # 1=most critical
    weights = cfg.get("business_impact_weights") or {}

    score = 0.0
    for t in tags:
        score += float(weights.get(t, 0.5))

    # tier multiplier: tier1 gets highest impact
    tier_mult = {1: 1.25, 2: 1.0, 3: 0.8}.get(tier, 0.8)
    score *= tier_mult

    # guardrails
    if "critical" in tags or "schema" in tags and tier == 1:
        return "critical"

    if score >= 1.5:
        return "critical"
    if score >= 0.8:
        return "high"
    return default
