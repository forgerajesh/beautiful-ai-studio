from agentic.agent.planner import generate_workflow


def test_planner_fallback_generates_steps():
    wf = generate_workflow("login to saucedemo and verify inventory")
    assert "steps" in wf
    assert len(wf["steps"]) > 0
