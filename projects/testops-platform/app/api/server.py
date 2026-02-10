from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from pathlib import Path
import json
import os
import subprocess
import sys

from app.core.config import load_config
from app.core.orchestrator import run_product_suite
from app.agent.service import AgentService
from app.channels.base import ChannelMessage
from app.channels.registry import ChannelRegistry
from app.api.schemas import AgentMessageRequest, RunAgentRequest, RunWorkflowRequest
from app.api.workflows import list_workflows

app = FastAPI(title="TestOps Platform API", version="1.3.0")
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


@app.post("/ui/run")
def ui_run(config_path: str = "config/product.yaml"):
    cfg = load_config(config_path)
    run_product_suite(cfg)
    return RedirectResponse(url="/", status_code=303)


@app.get("/channels")
def channels(config_path: str = "config/product.yaml"):
    cfg = load_config(config_path)
    reg = ChannelRegistry(cfg)
    return {"supported": reg.SUPPORTED_CHANNELS}


@app.get("/agents")
def agents(config_path: str = "config/product.yaml"):
    a = AgentService(config_path)
    return {"agents": a.registry.list()}


@app.get("/workflows")
def workflows():
    return {"workflows": list_workflows()}


@app.post("/workflows/run")
def run_workflow(req: RunWorkflowRequest):
    env = os.environ.copy()
    env["PYTHONPATH"] = str(Path("../agentic-automation-framework-python").resolve())
    cmd = [sys.executable, "../agentic-automation-framework-python/main.py", "--workflow", req.workflow_path]
    if req.notify:
        cmd.append("--notify")
    p = subprocess.run(cmd, capture_output=True, text=True, env=env)
    return {
        "ok": p.returncode == 0,
        "returncode": p.returncode,
        "stdout_tail": p.stdout[-1200:],
        "stderr_tail": p.stderr[-1200:],
    }


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


@app.post("/agent/run")
def agent_run(req: RunAgentRequest):
    agent = AgentService(config_path=req.config_path)
    if req.agent:
        r = agent.run_one_agent(req.agent)
        if not r:
            return {"ok": False, "error": f"Unknown agent: {req.agent}"}
        return {"ok": True, "result": r.__dict__}
    return {"ok": True, "result": agent.run_all_agents()}


@app.post("/agent/message")
def agent_message(req: AgentMessageRequest):
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
    return {"ok": True, "response": response}


@app.post("/webhook/{channel}")
def webhook(channel: str, payload: dict):
    text = str(payload.get("text") or payload.get("message") or "").strip()
    user_id = str(payload.get("user_id") or payload.get("from") or "unknown")
    chat_id = str(payload.get("chat_id") or payload.get("conversation_id") or user_id)

    agent = AgentService(config_path="config/product.yaml")
    response = agent.handle(ChannelMessage(channel=channel, user_id=user_id, chat_id=chat_id, text=text, raw=payload))
    return {"ok": True, "channel": channel, "response": response}
