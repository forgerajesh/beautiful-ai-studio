import os
from datetime import datetime, timezone
from typing import TypedDict

from dotenv import load_dotenv
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langgraph.graph import END, START, StateGraph
from langgraph.prebuilt import ToolNode


class AgentState(TypedDict):
    messages: list


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


def build_graph():
    tools = [add, multiply, utc_now]
    model = ChatOpenAI(model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"), temperature=0)
    llm_with_tools = model.bind_tools(tools)

    def assistant_node(state: AgentState):
        system = SystemMessage(
            content=(
                "You are a simple helpful agent. "
                "Use tools for math and time when useful. Keep answers concise."
            )
        )
        response = llm_with_tools.invoke([system, *state["messages"]])
        return {"messages": [response]}

    def route_tools(state: AgentState):
        last = state["messages"][-1]
        if getattr(last, "tool_calls", None):
            return "tools"
        return END

    graph = StateGraph(AgentState)
    graph.add_node("assistant", assistant_node)
    graph.add_node("tools", ToolNode(tools))

    graph.add_edge(START, "assistant")
    graph.add_conditional_edges("assistant", route_tools, {"tools": "tools", END: END})
    graph.add_edge("tools", "assistant")

    return graph.compile()


def run_once(user_input: str):
    app = build_graph()
    result = app.invoke({"messages": [HumanMessage(content=user_input)]})
    for msg in reversed(result["messages"]):
        if msg.type == "ai" and msg.content:
            return msg.content
    return "No response generated."


if __name__ == "__main__":
    load_dotenv()
    if not os.getenv("OPENAI_API_KEY"):
        raise RuntimeError("OPENAI_API_KEY is missing. Copy .env.example to .env and set key.")

    print("Simple LangChain + LangGraph Agent")
    print("Type 'exit' to quit.\n")

    while True:
        q = input("You: ").strip()
        if q.lower() in {"exit", "quit"}:
            break
        try:
            answer = run_once(q)
            print(f"Agent: {answer}\n")
        except Exception as e:
            print(f"Agent error: {e}\n")