from fastapi import FastAPI, Request, Depends, WebSocket
from fastapi.responses import HTMLResponse, RedirectResponse, PlainTextResponse
from fastapi.templating import Jinja2Templates
from pathlib import Path
import json
import os
import subprocess
import sys
import asyncio

from app.core.config import load_config
from app.core.orchestrator import run_product_suite
from app.agent.service import AgentService
from app.channels.base import ChannelMessage
from app.channels.registry import ChannelRegistry
from app.api.schemas import AgentMessageRequest, RunAgentRequest, RunWorkflowRequest
from app.api.workflows import list_workflows
from app.api.artifacts_io import list_artifacts, read_artifact
from app.core.doctor import run_doctor
from app.testdata.manager import list_profiles, seed_profile, load_profile, generate_synthetic, reset_active, status as testdata_status
from app.mobile.runner import list_devices as mobile_list_devices, run_mobile_checks, last_report as mobile_last_report
from app.auth.rbac import get_role, require_role
from app.state.logbus import logbus
from app.channels.config.store import list_tenants, get_tenant, upsert_tenant
from app.worldclass.strategy_planner import plan_agents_from_goal
from app.worldclass.policy_engine import evaluate_release
from app.worldclass.maturity import compute_maturity
from app.v3.queue.executor import run_distributed
from app.v3.observability.telemetry import snapshot as telemetry_snapshot, instrument
from app.v3.eval.harness import evaluate_run, persist_benchmark
from app.v3.remediation.governance import propose_remediation, apply_remediation
from app.v31.queue.backend import queue_backend_status
from app.v31.observability.exporters import prometheus_text
from app.v31.governance.audit import log_approval, list_audit
from app.integrations.jira import create_jira_issue
from app.integrations.testrail import create_test_run
from app.integrations.artifacts import generate_testcases, generate_testplan, generate_teststrategy
from app.wave1.queue.tasks import run_agent_task, run_all_agents_task
from app.wave1.auth.jwt_auth import get_claims, role_from_claims
from app.wave1.observability.otel import otel_status
from app.wave1.integrations.testrail_results import push_result
from app.wave2.policy.engine import evaluate_policy
from app.wave2.jira.sync import add_comment, transition_issue
from app.wave2.risk.selector import select_agents_by_risk
from app.wave2.approval.workflow import create_request, approve, list_requests
from app.wave3.synthesis.pr_diff_synth import synthesize_tests_from_diff
from app.wave3.remediation.hitl import create_checkpoint, approve_checkpoint, list_checkpoints
from app.wave3.analytics.executive import build_executive_summary
from app.wave3.analytics.trends import load_benchmark_trends
from app.wave31.contract.validator import validate_contract
from app.wave31.traceability.matrix import build_traceability
from app.wave32.flaky.governance import record_test_result, list_flaky
from app.wave32.promotion.gates import evaluate_promotion
from app.wave32.visual.regression import compare_snapshot
from app.wave32.performance.percentiles import compute_percentiles
from app.wave32.chaos.scenarios import run_chaos_scenario
from app.etl.engine import run_etl_profile, list_profiles as list_etl_profiles, load_last_report as load_last_etl_report
from app.wave4.contract.executor import execute_contract
from app.wave4.drift.analyzer import analyze_drift, list_drift_reports
from app.wave4.security.fuzzer import run_fuzz, list_fuzz_reports
from app.wave4.performance.soak import run_soak, list_soak_reports
from app.wave41.auth.oidc_jwt import auth_mode_status, get_claims_hardened, role_from_claims_hardened
from app.wave41.policy.adapter import evaluate_with_adapter
from app.wave41.queue.readiness import queue_readiness, startup_verify_queue_connectivity

app = FastAPI(title="TestOps Platform API", version="1.4.0")
templates = Jinja2Templates(directory="app/ui/templates")


@app.get("/health")
def health():
    etl_cfg_ok = Path("etl/profiles.yaml").exists()
    etl_data_ok = Path("etl/source_orders.csv").exists() and Path("etl/target_orders.csv").exists()
    return {"ok": True, "etl_ready": etl_cfg_ok and etl_data_ok}


@app.get('/doctor')
def doctor(role: str = Depends(get_role)):
    require_role(role, ["admin", "operator", "viewer"])
    return run_doctor()


@app.get("/", response_class=HTMLResponse)
def ui_home(request: Request):
    p = Path("reports/summary.json")
    findings = json.loads(p.read_text()) if p.exists() else []
    counts = {
        "total": len(findings),
        "pass": len([x for x in findings if x.get("status") == "PASS"]),
        "fail": len([x for x in findings if x.get("status") == "FAIL"]),
        "error": len([x for x in findings if x.get("status") == "ERROR"]),
    }
    etl = load_last_etl_report()
    return templates.TemplateResponse(
        request,
        "index.html",
        {
            "findings": findings[-100:],
            "counts": counts,
            "config_path": "config/product.yaml",
            "etl": etl,
        },
    )


@app.websocket("/ws/logs")
async def ws_logs(ws: WebSocket):
    await ws.accept()
    last = 0
    try:
        while True:
            data = logbus.tail(200)
            if len(data) != last:
                await ws.send_json({"events": data[-50:]})
                last = len(data)
            await asyncio.sleep(1)
    except Exception:
        await ws.close()


@app.post("/ui/run")
def ui_run(config_path: str = "config/product.yaml", role: str = Depends(get_role)):
    require_role(role, ["admin", "operator"])
    cfg = load_config(config_path)
    findings, report = run_product_suite(cfg)
    logbus.push("info", "suite_run", {"status": "PASS" if report["counts"]["fail"] == 0 and report["counts"]["error"] == 0 else "FAIL", "counts": report["counts"]})
    return RedirectResponse(url="/", status_code=303)


@app.get("/channels")
def channels(config_path: str = "config/product.yaml", role: str = Depends(get_role)):
    require_role(role, ["admin", "operator", "viewer"])
    cfg = load_config(config_path)
    reg = ChannelRegistry(cfg)
    return {"supported": reg.SUPPORTED_CHANNELS}


@app.get("/agents")
def agents(config_path: str = "config/product.yaml", role: str = Depends(get_role)):
    require_role(role, ["admin", "operator", "viewer"])
    a = AgentService(config_path)
    return {"agents": a.registry.list()}


@app.get("/workflows")
def workflows(role: str = Depends(get_role)):
    require_role(role, ["admin", "operator", "viewer"])
    return {"workflows": list_workflows()}


@app.post("/workflows/run")
def run_workflow(req: RunWorkflowRequest, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator"])
    env = os.environ.copy()
    env["PYTHONPATH"] = str(Path("../agentic-automation-framework-python").resolve())
    cmd = [sys.executable, "../agentic-automation-framework-python/main.py", "--workflow", req.workflow_path]
    if req.notify:
        cmd.append("--notify")
    p = subprocess.run(cmd, capture_output=True, text=True, env=env)
    payload = {
        "ok": p.returncode == 0,
        "returncode": p.returncode,
        "stdout_tail": p.stdout[-1200:],
        "stderr_tail": p.stderr[-1200:],
    }
    logbus.push("info", "workflow_run", {"workflow": req.workflow_path, "ok": payload["ok"]})
    return payload


@app.post("/run")
def run_all(config_path: str = "config/product.yaml", role: str = Depends(get_role)):
    require_role(role, ["admin", "operator"])
    cfg = load_config(config_path)
    findings, report = run_product_suite(cfg)
    payload = {
        "status": "PASS" if report["counts"]["fail"] == 0 and report["counts"]["error"] == 0 else "FAIL",
        "counts": report["counts"],
        "reports": report,
        "findings": [f.__dict__ for f in findings],
    }
    logbus.push("info", "suite_run", {"status": payload["status"], "counts": payload["counts"]})
    return payload


@app.post("/agent/run")
def agent_run(req: RunAgentRequest, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator"])
    agent = AgentService(config_path=req.config_path)
    if req.agent:
        r = agent.run_one_agent(req.agent)
        if not r:
            return {"ok": False, "error": f"Unknown agent: {req.agent}"}
        logbus.push("info", "agent_run", {"agent": req.agent, "status": r.status})
        return {"ok": True, "result": r.__dict__}
    all_result = agent.run_all_agents()
    logbus.push("info", "agent_run_all", {"status": all_result.get("status")})
    return {"ok": True, "result": all_result}


@app.post("/agent/message")
def agent_message(req: AgentMessageRequest, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator", "viewer"])
    agent = AgentService(config_path=req.config_path)
    response = agent.handle(
        ChannelMessage(
            channel=req.channel,
            user_id=req.user_id,
            chat_id=req.chat_id,
            text=req.text,
            raw=req.raw,
        )
    )
    logbus.push("info", "agent_message", {"channel": req.channel, "text": req.text[:120]})
    return {"ok": True, "response": response}


@app.post("/webhook/{channel}")
def webhook(channel: str, payload: dict):
    text = str(payload.get("text") or payload.get("message") or "").strip()
    user_id = str(payload.get("user_id") or payload.get("from") or "unknown")
    chat_id = str(payload.get("chat_id") or payload.get("conversation_id") or user_id)

    agent = AgentService(config_path="config/product.yaml")
    response = agent.handle(ChannelMessage(channel=channel, user_id=user_id, chat_id=chat_id, text=text, raw=payload))
    logbus.push("info", "webhook_message", {"channel": channel, "text": text[:120]})
    return {"ok": True, "channel": channel, "response": response}


@app.post('/channels/send')
def channels_send(payload: dict, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator"])
    cfg = load_config(str(payload.get('config_path', 'config/product.yaml')))
    channel = str(payload.get('channel', 'telegram'))
    chat_id = str(payload.get('chat_id', ''))
    text = str(payload.get('text', '')).strip()
    reg = ChannelRegistry(cfg)
    adapter = reg.get(channel)
    if not adapter:
        return {"ok": False, "error": f"unsupported channel: {channel}"}
    result = adapter.send(chat_id, text)
    logbus.push("info", "channel_send", {"channel": channel, "chat_id": chat_id})
    return {"ok": True, "channel": channel, "result": result}


@app.get("/tenants")
def tenants(role: str = Depends(get_role)):
    require_role(role, ["admin", "operator", "viewer"])
    return {"tenants": list_tenants()}


@app.get("/tenants/{tenant_id}/channels")
def tenant_channels(tenant_id: str, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator", "viewer"])
    data = get_tenant(tenant_id)
    return {"tenant_id": tenant_id, "config": data or {"channels": {}}}


@app.put("/tenants/{tenant_id}/channels")
def tenant_channels_upsert(tenant_id: str, payload: dict, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator"])
    updated = upsert_tenant(tenant_id, payload)
    logbus.push("info", "tenant_channels_upsert", {"tenant_id": tenant_id})
    return {"ok": True, "tenant_id": tenant_id, "config": updated}


@app.post("/worldclass/plan")
def worldclass_plan(payload: dict, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator", "viewer"])
    goal = str(payload.get("goal", ""))
    return {"goal": goal, "recommended_agents": plan_agents_from_goal(goal)}


@app.post("/worldclass/run-goal")
def worldclass_run_goal(payload: dict, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator"])
    goal = str(payload.get("goal", ""))
    agents = plan_agents_from_goal(goal)
    svc = AgentService(config_path=str(payload.get("config_path", "config/product.yaml")))

    results = []
    for a in agents:
        r = svc.run_one_agent(a)
        if r:
            results.append(r.__dict__)

    decision = evaluate_release([
        {
            "status": x.get("status"),
            "severity": "critical" if x.get("agent") == "security" and x.get("status") in ("FAIL", "ERROR") else "high" if x.get("status") in ("FAIL", "ERROR") else "low",
        }
        for x in results
    ])
    mat = compute_maturity(results, enabled_channels=11, enabled_agents=len(svc.registry.list()))

    out = {
        "goal": goal,
        "agents": agents,
        "results": results,
        "release_decision": decision.__dict__,
        "maturity": mat,
    }
    logbus.push("info", "worldclass_run_goal", {"goal": goal, "decision": decision.status, "score": decision.score})
    return out


@app.get("/worldclass/maturity")
def worldclass_maturity(role: str = Depends(get_role)):
    require_role(role, ["admin", "operator", "viewer"])
    p = Path("reports/summary.json")
    findings = json.loads(p.read_text()) if p.exists() else []
    return compute_maturity(findings, enabled_channels=11, enabled_agents=5)


@instrument("v3_run_distributed")
def _run_one_agent_task(config_path: str, agent_name: str):
    svc = AgentService(config_path=config_path)
    r = svc.run_one_agent(agent_name)
    return r.__dict__ if r else {"agent": agent_name, "status": "ERROR", "summary": "unknown agent", "details": {}}


@app.post("/v3/distributed/run")
def v3_distributed_run(payload: dict, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator"])
    config_path = str(payload.get("config_path", "config/product.yaml"))
    agents = payload.get("agents") or ["playwright", "api", "non_functional", "security", "accessibility"]
    tasks = [(_run_one_agent_task, (config_path, a), {}) for a in agents]
    results = run_distributed(tasks, max_workers=int(payload.get("max_workers", 4)))

    normalized = [x.get("result") for x in results if x.get("ok")]
    findings_like = [{"status": r.get("status"), "severity": "critical" if r.get("agent") == "security" and r.get("status") in ("FAIL", "ERROR") else "high"} for r in normalized]
    decision = evaluate_release(findings_like)
    eval_score = evaluate_run({"counts": {"total": len(normalized), "pass": len([r for r in normalized if r.get('status') == 'PASS']), "fail": len([r for r in normalized if r.get('status') == 'FAIL']), "error": len([r for r in normalized if r.get('status') == 'ERROR'])}})
    bench_file = persist_benchmark({"decision": decision.__dict__, "evaluation": eval_score, "agents": agents})

    return {"ok": True, "results": results, "release_decision": decision.__dict__, "evaluation": eval_score, "benchmark_file": bench_file}


@app.get("/v3/telemetry")
def v3_telemetry(role: str = Depends(get_role)):
    require_role(role, ["admin", "operator", "viewer"])
    return telemetry_snapshot()


@app.post("/v3/remediation/propose")
def v3_remediation_propose(payload: dict, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator", "viewer"])
    findings = payload.get("findings") or []
    return {"actions": propose_remediation(findings)}


@app.post("/v3/remediation/apply")
def v3_remediation_apply(payload: dict, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator"])
    actions = payload.get("actions") or []
    approved = bool(payload.get("approved", False))
    return apply_remediation(actions, approved=approved)


@app.get("/v3.1/queue/status")
def v31_queue_status(role: str = Depends(get_role)):
    require_role(role, ["admin", "operator", "viewer"])
    return queue_backend_status()


@app.get("/v3.1/metrics", response_class=PlainTextResponse)
def v31_metrics(role: str = Depends(get_role)):
    require_role(role, ["admin", "operator", "viewer"])
    return prometheus_text()


@app.post("/v3.1/remediation/apply")
def v31_remediation_apply(payload: dict, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator"])
    actions = payload.get("actions") or []
    approved = bool(payload.get("approved", False))
    actor = str(payload.get("actor", role))
    result = apply_remediation(actions, approved=approved)
    audit = log_approval("remediation_apply", approved, actor, {"actions": actions, "result": result})
    return {"result": result, "audit": audit}


@app.get("/v3.1/audit")
def v31_audit(limit: int = 100, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator", "viewer"])
    return {"events": list_audit(limit=limit)}


@app.post("/integrations/jira/create-issue")
def integrations_jira_create_issue(payload: dict, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator"])
    return create_jira_issue(
        summary=str(payload.get("summary", "TestOps issue")),
        description=str(payload.get("description", "Generated from TestOps")),
        issue_type=str(payload.get("issue_type", "Task")),
    )


@app.post("/integrations/testrail/create-run")
def integrations_testrail_create_run(payload: dict, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator"])
    case_ids = payload.get("case_ids")
    return create_test_run(name=str(payload.get("name", "TestOps Automated Run")), case_ids=case_ids)


@app.post("/artifacts/generate")
def integrations_generate_artifacts(payload: dict, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator", "viewer"])
    product_name = str(payload.get("product_name", "TestOps Platform"))
    out_dir = str(payload.get("out_dir", "artifacts"))
    tc = generate_testcases(product_name, out_dir)
    tp = generate_testplan(product_name, out_dir)
    ts = generate_teststrategy(product_name, out_dir)
    return {"ok": True, "files": {"testcases": tc, "testplan": tp, "teststrategy": ts}}


@app.get('/artifacts/list')
def artifacts_list(role: str = Depends(get_role)):
    require_role(role, ["admin", "operator", "viewer"])
    return {"files": list_artifacts()}


@app.get('/testdata/profiles')
def testdata_profiles(role: str = Depends(get_role)):
    require_role(role, ["admin", "operator", "viewer"])
    return {"profiles": list_profiles()}


@app.post('/testdata/seed')
def testdata_seed(payload: dict, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator"])
    profile = str(payload.get('profile', 'default'))
    return {"ok": True, "path": seed_profile(profile)}


@app.post('/testdata/load')
def testdata_load(payload: dict, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator", "viewer"])
    return load_profile(str(payload.get('profile', 'default')))


@app.post('/testdata/generate')
def testdata_generate(payload: dict, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator"])
    return generate_synthetic(
        profile=str(payload.get('profile', 'synthetic')),
        users=int(payload.get('users', 10)),
        orders=int(payload.get('orders', 20)),
    )


@app.post('/testdata/reset')
def testdata_reset(role: str = Depends(get_role)):
    require_role(role, ["admin", "operator"])
    return reset_active()


@app.get('/testdata/status')
def testdata_status_api(role: str = Depends(get_role)):
    require_role(role, ["admin", "operator", "viewer"])
    return testdata_status()


@app.get('/mobile/devices')
def mobile_devices(role: str = Depends(get_role)):
    require_role(role, ["admin", "operator", "viewer"])
    return {"devices": mobile_list_devices()}


@app.post('/mobile/run')
def mobile_run(payload: dict, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator"])
    return run_mobile_checks(
        url=str(payload.get('url', 'https://example.com')),
        device=str(payload.get('device', 'iPhone 13')),
        simulate=bool(payload.get('simulate', True)),
    )


@app.get('/mobile/last-report')
def mobile_report(role: str = Depends(get_role)):
    require_role(role, ["admin", "operator", "viewer"])
    return mobile_last_report()


@app.post('/artifacts/read')
def artifacts_read(payload: dict, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator", "viewer"])
    return read_artifact(str(payload.get('path', '')))


@app.get('/etl/profiles')
def etl_profiles(role: str = Depends(get_role)):
    require_role(role, ["admin", "operator", "viewer"])
    return {"profiles": list_etl_profiles()}


@app.post('/etl/run')
def etl_run(payload: dict, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator"])
    profile = payload.get('profile')
    report = run_etl_profile(profile)
    logbus.push("info", "etl_run", {"profile": report.get("profile"), "status": report.get("status")})
    return report


@app.get('/etl/last-report')
def etl_last_report(role: str = Depends(get_role)):
    require_role(role, ["admin", "operator", "viewer"])
    return load_last_etl_report()


@app.get('/wave1/auth/jwt/verify')
def wave1_jwt_verify(claims: dict = Depends(get_claims)):
    return {"ok": True, "claims": claims, "role": role_from_claims(claims)}


@app.get('/wave1/otel/status')
def wave1_otel_status(role: str = Depends(get_role)):
    require_role(role, ["admin", "operator", "viewer"])
    return otel_status()


@app.post('/wave1/queue/run-agent')
def wave1_queue_run_agent(payload: dict, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator"])
    config_path = str(payload.get("config_path", "config/product.yaml"))
    agent = str(payload.get("agent", "playwright"))
    task = run_agent_task.delay(config_path, agent)
    return {"ok": True, "task_id": task.id, "agent": agent}


@app.post('/wave1/queue/run-all')
def wave1_queue_run_all(payload: dict, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator"])
    config_path = str(payload.get("config_path", "config/product.yaml"))
    task = run_all_agents_task.delay(config_path)
    return {"ok": True, "task_id": task.id}


@app.get('/wave1/queue/task/{task_id}')
def wave1_queue_task(task_id: str, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator", "viewer"])
    t = run_agent_task.AsyncResult(task_id)
    return {"task_id": task_id, "state": t.state, "ready": t.ready(), "result": t.result if t.ready() else None}


@app.post('/wave1/testrail/push-result')
def wave1_testrail_push_result(payload: dict, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator"])
    return push_result(
        run_id=int(payload.get('run_id')),
        case_id=int(payload.get('case_id')),
        status_id=int(payload.get('status_id', 1)),
        comment=str(payload.get('comment', 'Pushed from TestOps Wave1')),
    )


@app.post('/wave2/policy/evaluate')
def wave2_policy_evaluate(payload: dict, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator", "viewer"])
    return evaluate_policy(payload)


@app.post('/wave2/risk/select-agents')
def wave2_risk_select(payload: dict, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator", "viewer"])
    files = payload.get('changed_files') or []
    return {"agents": select_agents_by_risk(files)}


@app.post('/wave2/jira/add-comment')
def wave2_jira_add_comment(payload: dict, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator"])
    return add_comment(str(payload.get('issue_key', '')), str(payload.get('comment', 'Automated update from TestOps')))


@app.post('/wave2/jira/transition')
def wave2_jira_transition(payload: dict, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator"])
    return transition_issue(str(payload.get('issue_key', '')), str(payload.get('transition_id', '')))


@app.post('/wave2/approval/request')
def wave2_approval_request(payload: dict, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator"])
    return create_request(
        title=str(payload.get('title', 'Approval request')),
        payload=payload.get('payload', {}),
        requested_by=str(payload.get('requested_by', role)),
    )


@app.post('/wave2/approval/approve')
def wave2_approval_approve(payload: dict, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator"])
    row = approve(str(payload.get('request_id', '')), str(payload.get('actor', role)))
    return {"ok": row is not None, "request": row}


@app.get('/wave2/approval/list')
def wave2_approval_list(role: str = Depends(get_role)):
    require_role(role, ["admin", "operator", "viewer"])
    return {"requests": list_requests()}


@app.post('/wave3/synthesis/pr-diff')
def wave3_synthesis_pr_diff(payload: dict, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator", "viewer"])
    return synthesize_tests_from_diff(str(payload.get('pr_diff', '')))


@app.post('/wave3/remediation/checkpoint/create')
def wave3_hitl_create(payload: dict, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator"])
    return create_checkpoint(
        title=str(payload.get('title', 'Wave3 HITL Checkpoint')),
        actions=payload.get('actions') or [],
        created_by=str(payload.get('created_by', role)),
    )


@app.post('/wave3/remediation/checkpoint/approve')
def wave3_hitl_approve(payload: dict, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator"])
    row = approve_checkpoint(str(payload.get('checkpoint_id', '')), str(payload.get('actor', role)))
    return {"ok": row is not None, "checkpoint": row}


@app.get('/wave3/remediation/checkpoint/list')
def wave3_hitl_list(role: str = Depends(get_role)):
    require_role(role, ["admin", "operator", "viewer"])
    return {"checkpoints": list_checkpoints()}


@app.get('/wave3/analytics/executive')
def wave3_analytics_executive(role: str = Depends(get_role)):
    require_role(role, ["admin", "operator", "viewer"])
    return build_executive_summary()


@app.get('/wave3/analytics/trends')
def wave3_analytics_trends(limit: int = 50, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator", "viewer"])
    return {"points": load_benchmark_trends(limit=limit)}


@app.post('/wave3.1/contract/validate')
def wave31_contract_validate(payload: dict, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator", "viewer"])
    contract_path = str(payload.get('contract_path', 'requirements/sample-contract.json'))
    return validate_contract(contract_path)


@app.post('/wave3.1/traceability/build')
def wave31_traceability_build(payload: dict, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator", "viewer"])
    requirements_path = str(payload.get('requirements_path', 'requirements/requirements.json'))
    tests_path = str(payload.get('tests_path', 'artifacts/TESTCASES.md'))
    return build_traceability(requirements_path=requirements_path, tests_path=tests_path)


@app.post('/wave3.2/flaky/record')
def wave32_flaky_record(payload: dict, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator"])
    return record_test_result(str(payload.get('test_id', 'unknown')), bool(payload.get('passed', True)))


@app.get('/wave3.2/flaky/list')
def wave32_flaky_list(role: str = Depends(get_role)):
    require_role(role, ["admin", "operator", "viewer"])
    return {"flaky": list_flaky()}


@app.post('/wave3.2/promotion/evaluate')
def wave32_promotion_evaluate(payload: dict, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator", "viewer"])
    return evaluate_promotion(
        env_from=str(payload.get('from', 'qa')),
        env_to=str(payload.get('to', 'uat')),
        counts=payload.get('counts') or {},
        policy=payload.get('policy'),
    )


@app.post('/wave3.2/visual/compare')
def wave32_visual_compare(payload: dict, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator", "viewer"])
    return compare_snapshot(str(payload.get('name', 'default')), str(payload.get('current_path', 'reports/screenshot.png')))


@app.post('/wave3.2/performance/percentiles')
def wave32_perf_percentiles(payload: dict, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator", "viewer"])
    samples = payload.get('samples_ms') or []
    return compute_percentiles([int(x) for x in samples])


@app.post('/wave3.2/chaos/run')
def wave32_chaos_run(payload: dict, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator"])
    return run_chaos_scenario(str(payload.get('scenario', 'latency-spike')))


@app.post('/wave4/contract/execute')
def wave4_contract_execute(payload: dict, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator", "viewer"])
    result = execute_contract(
        contract_path=str(payload.get('contract_path', 'requirements/sample-contract.json')),
        provider_base_url=str(payload.get('provider_base_url', '')),
        timeout_s=int(payload.get('timeout_s', 10)),
    )
    logbus.push("info", "wave4_contract_execute", {"ok": result.get("ok"), "contract": result.get("contract")})
    return result


@app.post('/wave4/drift/analyze')
def wave4_drift_analyze(payload: dict, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator", "viewer"])
    return analyze_drift(
        baseline=payload.get('baseline') or [],
        current=payload.get('current') or [],
        numeric_fields=payload.get('numeric_fields') or [],
        categorical_fields=payload.get('categorical_fields') or [],
    )


@app.get('/wave4/drift/reports')
def wave4_drift_reports(limit: int = 20, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator", "viewer"])
    return {"reports": list_drift_reports(limit=limit)}


@app.post('/wave4/security/fuzz')
def wave4_security_fuzz(payload: dict, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator"])
    return run_fuzz(
        target_base_url=str(payload.get('target_base_url', 'http://localhost:8090')),
        path=str(payload.get('path', '/')),
        method=str(payload.get('method', 'GET')),
        auth_header=str(payload.get('auth_header', '')),
    )


@app.get('/wave4/security/fuzz/reports')
def wave4_security_fuzz_reports(limit: int = 20, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator", "viewer"])
    return {"reports": list_fuzz_reports(limit=limit)}


@app.post('/wave4/performance/soak')
def wave4_performance_soak(payload: dict, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator"])
    return run_soak(
        duration_seconds=int(payload.get('duration_seconds', 60)),
        interval_ms=int(payload.get('interval_ms', 200)),
        jitter_ms=int(payload.get('jitter_ms', 25)),
    )


@app.get('/wave4/performance/soak/reports')
def wave4_performance_soak_reports(limit: int = 20, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator", "viewer"])
    return {"reports": list_soak_reports(limit=limit)}


@app.get('/wave4.1/auth/status')
def wave41_auth_status(role: str = Depends(get_role)):
    require_role(role, ["admin", "operator", "viewer"])
    return auth_mode_status()


@app.get('/wave4.1/auth/verify')
def wave41_auth_verify(claims: dict = Depends(get_claims_hardened)):
    return {"ok": True, "claims": claims, "role": role_from_claims_hardened(claims)}


@app.post('/wave4.1/policy/evaluate')
def wave41_policy_evaluate(payload: dict, role: str = Depends(get_role)):
    require_role(role, ["admin", "operator", "viewer"])
    return evaluate_with_adapter(payload)


@app.get('/wave4.1/queue/readiness')
def wave41_queue_readiness(role: str = Depends(get_role)):
    require_role(role, ["admin", "operator", "viewer"])
    return queue_readiness()


@app.post('/wave4.1/queue/startup-verify')
def wave41_queue_startup_verify(role: str = Depends(get_role)):
    require_role(role, ["admin", "operator", "viewer"])
    return startup_verify_queue_connectivity()
