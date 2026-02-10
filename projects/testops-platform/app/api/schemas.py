from pydantic import BaseModel
from typing import Optional


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


class RunWorkflowRequest(BaseModel):
    workflow_path: str
    notify: bool = False
