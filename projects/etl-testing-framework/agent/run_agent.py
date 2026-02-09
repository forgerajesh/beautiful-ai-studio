import argparse
from agent.graphs.etl_agent_graph import build_graph


def main():
    parser = argparse.ArgumentParser(description="Run LangGraph ETL Test Agent")
    parser.add_argument("--request", required=True, help="User request for the agent")
    args = parser.parse_args()

    graph = build_graph()
    state = {
        "user_request": args.request,
        "suite_path": "config/tests.yaml",
    }
    out = graph.invoke(state)
    print(out.get("final_response", "No response"))


if __name__ == "__main__":
    main()
