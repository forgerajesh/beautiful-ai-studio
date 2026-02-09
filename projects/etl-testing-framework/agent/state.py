from typing import TypedDict, List, Dict, Any


class AgentState(TypedDict, total=False):
    user_request: str
    suite_path: str
    selected_tests: List[Dict[str, Any]]
    execution_result: Dict[str, Any]
    ai_analysis: str
    remediation_sql: List[str]
    final_response: str
