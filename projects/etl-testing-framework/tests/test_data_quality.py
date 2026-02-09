import pytest
from framework.runner_context import RunnerContext
from framework.assertions import (
    assert_equal,
    assert_within_pct,
    assert_zero,
    assert_schema_columns,
)

CTX = RunnerContext("config/tests.yaml")


def _mark_for_severity(sev: str):
    sev = sev.lower()
    if sev == "critical":
        return pytest.mark.critical
    if sev == "high":
        return pytest.mark.high
    return pytest.mark.medium


params = []
for t in CTX.tests:
    params.append(pytest.param(t, id=t.id, marks=[_mark_for_severity(t.severity)]))


@pytest.mark.parametrize("test_case", params)
def test_configured_checks(test_case):
    a = CTX.adapter
    p = test_case.params
    ttype = test_case.type

    try:
        if ttype == "schema":
            actual = a.table_schema(p["table"])
            assert_schema_columns(test_case.id, actual, p["expected_columns"])

        elif ttype == "rowcount_recon":
            src = float(a.scalar(p["source_sql"]))
            tgt = float(a.scalar(p["target_sql"]))
            assert_within_pct(
                test_case.id,
                actual=tgt,
                expected=src,
                tolerance_pct=float(p["tolerance_pct"]),
                context={"source_sql": p["source_sql"], "target_sql": p["target_sql"]},
            )

        elif ttype == "business_rule":
            violations = int(a.scalar(p["sql"]))
            assert_equal(test_case.id, violations, int(p["expected"]), context={"sql": p["sql"]})

        elif ttype == "incremental":
            lag = float(a.scalar(p["sql"]))
            if lag > float(p["max_lag_minutes"]):
                sample = a.rows("select * from target_orders order by updated_at desc", limit=5)
                raise AssertionError(
                    f"[{test_case.id}] watermark lag too high: {lag:.2f} min > {p['max_lag_minutes']} | "
                    f"sql={p['sql']} | sample_rows={sample}"
                )

        elif ttype == "scd2":
            broken_keys = int(a.scalar(p["sql"]))
            assert_zero(test_case.id, broken_keys, context={"sql": p["sql"]})

        else:
            pytest.skip(f"Unsupported test type in starter kit: {ttype}")

    except AssertionError as e:
        hint = CTX.ai.triage_failure(test_case.id, str(e), {"type": ttype, "params": p})
        raise AssertionError(f"{e}\nAI_TRIAGE: {hint}")
