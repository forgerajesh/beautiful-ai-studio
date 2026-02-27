import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import TypedDict

from dotenv import load_dotenv
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langgraph.graph import END, START, StateGraph
from langgraph.prebuilt import ToolNode

MEMORY_FILE = Path(__file__).parent / "memory.json"


class AgentState(TypedDict, total=False):
    messages: list
    plan: str


def read_memory() -> dict:
    if MEMORY_FILE.exists():
        try:
            return json.loads(MEMORY_FILE.read_text())
        except Exception:
            return {"notes": []}
    return {"notes": []}


def write_memory(memory: dict) -> None:
    MEMORY_FILE.write_text(json.dumps(memory, indent=2))


@tool
def add(a: float, b: float) -> float:
    """Add two numbers."""
    return a + b


@tool
def multiply(a: float, b: float) -> float:
    """Multiply two numbers."""
    return a * b


@tool
def utc_now() -> str:
    """Get current UTC timestamp in ISO format."""
    return datetime.now(timezone.utc).isoformat()


@tool
def remember(note: str) -> str:
    """Save a short note to long-term memory."""
    memory = read_memory()
    notes = memory.get("notes", [])
    notes.append({"at": utc_now.invoke({}), "note": note})
    memory["notes"] = notes[-100:]
    write_memory(memory)
    return "Saved to memory"


@tool
def recall(limit: int = 5) -> str:
    """Recall recent memory notes."""
    memory = read_memory()
    notes = memory.get("notes", [])[-max(1, min(limit, 20)):]
    if not notes:
        return "No memory notes yet"
    return "\n".join([f"- {n['at']}: {n['note']}" for n in notes])


def build_graph():
    tools = [add, multiply, utc_now, remember, recall]
    model = ChatOpenAI(model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"), temperature=0)
    planner = ChatOpenAI(model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"), temperature=0)
    llm_with_tools = model.bind_tools(tools)

    def planner_node(state: AgentState):
        user_text = state["messages"][-1].content if state.get("messages") else ""
        memory = recall.invoke({"limit": 3})
        plan_prompt = [
            SystemMessage(content="Create a compact ReAct-style plan in 2-4 steps. Mention if tool use is needed."),
            HumanMessage(content=f"User request: {user_text}\nRelevant memory:\n{memory}"),
        ]
        plan = planner.invoke(plan_prompt).content
        return {"plan": plan}

    def assistant_node(state: AgentState):
        system = SystemMessage(
            content=(
                "You are a helpful agent. Use the provided plan. "
                "Use tools for math/time/memory when useful. Keep answers concise."
            )
        )
        plan_msg = SystemMessage(content=f"Execution plan:\n{state.get('plan', 'No plan')}" )
        response = llm_with_tools.invoke([system, plan_msg, *state["messages"]])
        return {"messages": [response]}

    def route_tools(state: AgentState):
        last = state["messages"][-1]
        if getattr(last, "tool_calls", None):
            return "tools"
        return END

    graph = StateGraph(AgentState)
    graph.add_node("planner", planner_node)
    graph.add_node("assistant", assistant_node)
    graph.add_node("tools", ToolNode(tools))

    graph.add_edge(START, "planner")
    graph.add_edge("planner", "assistant")
    graph.add_conditional_edges("assistant", route_tools, {"tools": "tools", END: END})
    graph.add_edge("tools", "assistant")

    return graph.compile()


def run_once(user_input: str):
    app = build_graph()
    result = app.invoke({"messages": [HumanMessage(content=user_input)]})
    plan = result.get("plan", "")
    answer = "No response generated."
    for msg in reversed(result["messages"]):
        if isinstance(msg, AIMessage) and msg.content:
            answer = msg.content
            break
    return answer, plan


if __name__ == "__main__":
    load_dotenv()
    if not os.getenv("OPENAI_API_KEY"):
        raise RuntimeError("OPENAI_API_KEY is missing. Copy .env.example to .env and set key.")

    print("Simple LangChain + LangGraph Agent (Planner + Memory)")
    print("Type 'exit' to quit.\n")

    while True:
        q = input("You: ").strip()
        if q.lower() in {"exit", "quit"}:
            break
        try:
            answer, plan = run_once(q)
            print(f"Plan: {plan}\n")
            print(f"Agent: {answer}\n")
        except Exception as e:
            print(f"Agent error: {e}\n")