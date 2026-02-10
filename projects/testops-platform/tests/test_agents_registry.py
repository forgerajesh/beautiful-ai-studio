from app.agent.modules.registry import AgentRegistry


def test_registry_has_expected_agents():
    r = AgentRegistry()
    names = r.list()
    assert "playwright" in names
    assert "security" in names
    assert "api" in names
