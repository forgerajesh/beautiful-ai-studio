from fastapi import FastAPI, Request, Depends, WebSocket
from fastapi.responses import HTMLResponse, RedirectResponse
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
from app.auth.rbac import get_role, require_role
from app.state.logbus import logbus
from app.channels.config.store import list_tenants, get_tenant, upsert_tenant
from app.worldclass.strategy_planner import plan_agents_from_goal
from app.worldclass.policy_engine import evaluate_release
from app.worldclass.maturity import compute_maturity

app = FastAPI(title="TestOps Platform API", version="1.4.0")
templates = Jinja2Templates(directory="app/ui/templates")


@app.get("/health")
def health():
    return {"ok": True}


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
    return templates.TemplateResponse(request, "index.html", {"findings": findings[-100:], "counts": counts, "config_path": "config/product.yaml"})


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
