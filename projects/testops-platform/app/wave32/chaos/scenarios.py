import random


def run_chaos_scenario(name: str = "latency-spike"):
    if name == "latency-spike":
        delay_ms = random.randint(200, 2000)
        return {"scenario": name, "injected_delay_ms": delay_ms, "result": "SIMULATED"}
    if name == "dependency-timeout":
        return {"scenario": name, "timeout_sec": random.randint(2, 15), "result": "SIMULATED"}
    return {"scenario": name, "result": "UNKNOWN_SCENARIO"}
