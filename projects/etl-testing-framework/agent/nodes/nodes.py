from typing import Dict, Any
from agent.state import AgentState
from agent.tools.framework_tools import (
    load_suite_yaml,
    run_pytest_junit,
    summarize_failures,
    save_remediation_notes,
)
from agent.llm import build_llm


def plan_node(state: AgentState) -> AgentState:
    suite = load_suite_yaml()
    req = (state.get("user_request") or "").lower()

    tests = suite.get("tests", [])
    selected = tests
    if "critical" in req:
        selected = [t for t in tests if t.get("severity") == "critical"]

    state["selected_tests"] = selected
    return state


def execute_node(state: AgentState) -> AgentState:
    req = (state.get("user_request") or "").lower()
    mark_expr = None
    if "critical" in req:
        mark_expr = "critical"
    elif "high" in req:
        mark_expr = "high or critical"

    result = run_pytest_junit(mark_expr)
    state["execution_result"] = result
    return state


def analyze_node(state: AgentState) -> AgentState:
    result = state.get("execution_result", {})
    output = (result.get("stdout", "") + "\n" + result.get("stderr", "")).strip()
    failure_summary = summarize_failures(output)

    llm = build_llm()
    prompt = f"""
You are a Principal Data QA architect.
Given the ETL framework run result, produce:
1) root-cause hypotheses
2) concrete remediation steps
3) SQL checks to run now
4) CI gate recommendation (pass/fail)

Result:
{failure_summary}
"""
    analysis = llm.invoke(prompt).content
    state["ai_analysis"] = analysis

    notes_path = save_remediation_notes(analysis)
    state["final_response"] = (
        f"Execution {'PASSED' if result.get('ok') else 'FAILED'} (code={result.get('returncode')}).\n"
        f"JUnit: {result.get('junit_path')}\n"
        f"AI Remediation Notes: {notes_path}\n\n"
        f"{analysis}"
    )
    return state
