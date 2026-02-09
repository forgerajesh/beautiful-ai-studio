from agent.tools.test_generation import generate_tests


if __name__ == "__main__":
    out = generate_tests()
    print(f"Generated tests at: {out}")
