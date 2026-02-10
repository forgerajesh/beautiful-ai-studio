from fastapi import FastAPI
from pydantic import BaseModel

from agentic.agent.engine import execute_workflow_file
from agentic.agent.planner import generate_workflow
from agentic.agent.claude_mode import run_claude_like
from agentic.agent.history import build_dashboard

app = FastAPI(title="Agentic Automation API", version="1.0.0")


class WorkflowRunRequest(BaseModel):
    workflow_path: str
    notify: bool = False


class PlanRequest(BaseModel):
    prompt: str


class AskRequest(BaseModel):
    goal: str
    notify: bool = False


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/run")
def run_workflow(req: WorkflowRunRequest):
    result = execute_workflow_file(req.workflow_path, notify=req.notify)
    return result


@app.post("/plan")
def plan(req: PlanRequest):
    wf = generate_workflow(req.prompt)
    return wf


@app.post("/ask")
def ask(req: AskRequest):
    return run_claude_like(req.goal, notify=req.notify)


@app.get("/dashboard")
def dashboard():
    p = build_dashboard()
    return {"dashboard": p}
