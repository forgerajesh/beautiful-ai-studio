from app.wave1.queue.celery_app import celery_app
from app.agent.service import AgentService


@celery_app.task(name="testops.run_agent")
def run_agent_task(config_path: str, agent: str):
    svc = AgentService(config_path=config_path)
    result = svc.run_one_agent(agent)
    return result.__dict__ if result else {"agent": agent, "status": "ERROR", "summary": "unknown agent", "details": {}}


@celery_app.task(name="testops.run_all_agents")
def run_all_agents_task(config_path: str):
    svc = AgentService(config_path=config_path)
    return svc.run_all_agents()
