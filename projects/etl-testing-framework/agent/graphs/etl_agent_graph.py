from langgraph.graph import StateGraph, END
from agent.state import AgentState
from agent.nodes.nodes import plan_node, execute_node, analyze_node


def build_graph():
    g = StateGraph(AgentState)
    g.add_node("plan", plan_node)
    g.add_node("execute", execute_node)
    g.add_node("analyze", analyze_node)

    g.set_entry_point("plan")
    g.add_edge("plan", "execute")
    g.add_edge("execute", "analyze")
    g.add_edge("analyze", END)
    return g.compile()
