from pathlib import Path
from typing import List, Dict, Any
import yaml

from framework.runner_context import RunnerContext
from agent.tools.severity_ranker import rank_severity

ROOT = Path(__file__).resolve().parents[2]


def infer_tests_from_table(table: str, schema: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    tests = []

    # schema baseline
    tests.append(
        {
            "id": f"schema_{table}",
            "type": "schema",
            "severity": rank_severity(table, ["schema", "critical"], default="high"),
            "tags": ["generated", "schema", "critical"],
            "params": {
                "table": table,
                "expected_columns": [
                    {"name": c["name"], "type": c.get("type", "TEXT"), "nullable": c.get("nullable", True)}
                    for c in schema
                ],
            },
        }
    )

    # uniqueness from PK
    pk_cols = [c["name"] for c in schema if c.get("pk")]
    if pk_cols:
        cols = ", ".join(pk_cols)
        tests.append(
            {
                "id": f"unique_{table}_{'_'.join(pk_cols)}",
                "type": "business_rule",
                "severity": rank_severity(table, ["uniqueness", "critical"], default="high"),
                "tags": ["generated", "uniqueness", "critical"],
                "params": {
                    "sql": f"select count(*) from (select {cols}, count(*) c from {table} group by {cols} having count(*) > 1) x",
                    "expected": 0,
                },
            }
        )

    # non-null checks on required columns
    non_null_cols = [c["name"] for c in schema if not c.get("nullable", True)]
    for col in non_null_cols:
        tests.append(
            {
                "id": f"not_null_{table}_{col}",
                "type": "business_rule",
                "severity": rank_severity(table, ["not_null"], default="high"),
                "tags": ["generated", "not_null"],
                "params": {
                    "sql": f"select count(*) from {table} where {col} is null",
                    "expected": 0,
                },
            }
        )

    # freshness heuristic
    time_cols = [c["name"] for c in schema if "updated" in c["name"].lower() or "loaded" in c["name"].lower()]
    if time_cols:
        c = time_cols[0]
        tests.append(
            {
                "id": f"freshness_{table}_{c}",
                "type": "incremental",
                "severity": rank_severity(table, ["freshness"], default="high"),
                "tags": ["generated", "freshness"],
                "params": {
                    "sql": f"select (strftime('%s','now') - strftime('%s', max({c}))) / 60.0 from {table}",
                    "max_lag_minutes": 180,
                },
            }
        )

    return tests



def load_lineage(path: str = "config/lineage.yaml") -> list:
    p = ROOT / path
    if not p.exists():
        return []
    with open(p, "r", encoding="utf-8") as f:
        return (yaml.safe_load(f) or {}).get("lineage", [])


def infer_tests_from_lineage(edges: list) -> list:
    tests = []
    for e in edges:
        src = e["source"]
        tgt = e["target"]
        key_map = e.get("key_map", {})
        for s_col, t_col in key_map.items():
            tests.append(
                {
                    "id": f"lineage_recon_{src}_to_{tgt}_{s_col}",
                    "type": "rowcount_recon",
                    "severity": rank_severity(tgt, ["recon", "integrity"], default="high"),
                    "tags": ["generated", "lineage", "recon"],
                    "params": {
                        "source_sql": f"select count(*) from {src}",
                        "target_sql": f"select count(*) from {tgt}",
                        "tolerance_pct": 5.0,
                    },
                }
            )
            tests.append(
                {
                    "id": f"lineage_orphan_{src}_to_{tgt}_{s_col}",
                    "type": "business_rule",
                    "severity": rank_severity(tgt, ["integrity"], default="high"),
                    "tags": ["generated", "lineage", "integrity"],
                    "params": {
                        "sql": (
                            f"select count(*) from {src} s left join {tgt} t "
                            f"on s.{s_col}=t.{t_col} where t.{t_col} is null"
                        ),
                        "expected": 0,
                    },
                }
            )
    return tests

def generate_tests(output_path: str = "agent/generated/generated_tests.yaml") -> str:
    ctx = RunnerContext("config/tests.yaml")
    adapter = ctx.adapter

    tables = ["source_orders", "target_orders", "dim_customer_hist"]
    generated = []

    for table in tables:
        schema = adapter.table_schema(table)
        generated.extend(infer_tests_from_table(table, schema))

    lineage_edges = load_lineage()
    generated.extend(infer_tests_from_lineage(lineage_edges))

    payload = {
        "suite": "generated_suite",
        "generated_from": "schema_and_lineage_metadata",
        "tests": generated,
    }

    out = ROOT / output_path
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        yaml.safe_dump(payload, f, sort_keys=False)
    return str(out)
