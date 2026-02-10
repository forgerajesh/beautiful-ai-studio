from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional

from app.core.config import load_config
from app.core.orchestrator import run_product_suite
from app.agent.service import AgentService
from app.channels.base import ChannelMessage
from app.channels.registry import ChannelRegistry

app = FastAPI(title="TestOps Platform API", version="1.1.0")


class AgentMessageRequest(BaseModel):
    channel: str
    user_id: str = "anonymous"
    chat_id: str = ""
    text: str
    raw: dict = {}
    config_path: str = "config/product.yaml"


class RunAgentRequest(BaseModel):
    config_path: str = "config/product.yaml"
    agent: Optional[str] = None


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/channels")
def channels(config_path: str = "config/product.yaml"):
    cfg = load_config(config_path)
    reg = ChannelRegistry(cfg)
    return {"supported": reg.SUPPORTED_CHANNELS}


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
    # Generic webhook ingress for non-telegram channels.
    # Map provider payload to internal message envelope.
    text = str(payload.get("text") or payload.get("message") or "").strip()
    user_id = str(payload.get("user_id") or payload.get("from") or "unknown")
    chat_id = str(payload.get("chat_id") or payload.get("conversation_id") or user_id)

    agent = AgentService(config_path="config/product.yaml")
    response = agent.handle(ChannelMessage(channel=channel, user_id=user_id, chat_id=chat_id, text=text, raw=payload))
    return {"ok": True, "channel": channel, "response": response}
