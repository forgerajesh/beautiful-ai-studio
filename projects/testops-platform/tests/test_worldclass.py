from app.worldclass.strategy_planner import plan_agents_from_goal
from app.worldclass.policy_engine import evaluate_release


def test_goal_planner_security_perf():
    a = plan_agents_from_goal('security and performance release')
    assert 'security' in a
    assert 'non_functional' in a


def test_release_decision_no_go_on_critical():
    d = evaluate_release([{"status": "FAIL", "severity": "critical"}])
    assert d.status == 'NO_GO'
