import json
from pathlib import Path
from datetime import datetime, UTC
from agentic.config import CONFIG
from agentic.agent.planner import generate_workflow
from agentic.agent.engine import execute_workflow_file
from agentic.agent.history import append_history, build_dashboard
from agentic.agent.memory import record_failure, relevant_lexical
from agentic.agent.semantic_memory import relevant_semantic, remember_semantic


def _persist(result):
    append_history(
        {
            "ts": datetime.now(UTC).isoformat(),
            "name": result.get("name"),
            "ok": bool(result.get("ok")),
            "durationMs": result.get("durationMs"),
            "finalUrl": result.get("finalUrl", ""),
            "error": result.get("error", ""),
        }
    )
    return build_dashboard()


def run_claude_like(goal: str, notify=False, output_dir="examples"):
    if not goal.strip():
        raise ValueError("Goal required")

    max_iter = CONFIG["agent_max_iterations"]
    use_sem = CONFIG["memory_mode"].lower() != "lexical"

    prior = relevant_semantic(goal, 5) if use_sem else []
    if not prior:
        prior = relevant_lexical(goal, 5)

    trace = []
    last = None
    for i in range(1, max_iter + 1):
        mem_txt = "\n".join([f"{k+1}) score={x.get('score',0):.2f} goal={x.get('goal')} err={x.get('error')}" for k, x in enumerate(prior)]) if prior else ""
        prompt = goal if i == 1 else f"{goal}\nPrevious failure: {last.get('error','unknown')}\nRelevant memory:\n{mem_txt}\nGenerate safer workflow."

        wf = generate_workflow(prompt)
        p = Path(output_dir) / f"agentic-{int(datetime.now().timestamp()*1000)}-{i}.json"
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(json.dumps(wf, indent=2))

        result = execute_workflow_file(str(p), notify=notify)
        dashboard = _persist(result)
        trace.append({"iteration": i, "workflowFile": str(p), "result": result})
        last = result

        if result.get("ok"):
            return {"ok": True, "goal": goal, "iterationsUsed": i, "final": result, "dashboard": dashboard, "trace": trace}

        failure_item = {
            "ts": datetime.now(UTC).isoformat(),
            "goal": goal,
            "error": result.get("error", "unknown"),
            "workflowFile": str(p),
            "iteration": i,
        }
        record_failure(failure_item)
        if use_sem:
            remember_semantic(failure_item)

    return {"ok": False, "goal": goal, "iterationsUsed": max_iter, "final": last, "dashboard": build_dashboard(), "trace": trace}
