import argparse
import json
import os
import time
from pathlib import Path

from agentic.config import CONFIG
from agentic.utils.logger import log, err
from agentic.agent.engine import execute_workflow_file
from agentic.agent.planner import generate_workflow
from agentic.agent.claude_mode import run_claude_like
from agentic.agent.history import build_dashboard, append_history
from agentic.agent.queue import RunQueue
from agentic.agent.memory import recent, relevant_lexical
from agentic.agent.semantic_memory import relevant_semantic
from agentic.channels.telegram import poll_updates, parse_command, send_message


def save_generated(wf, out):
    p = Path(out)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(wf, indent=2))
    return str(p)


def run_once(workflow, notify=False):
    result = execute_workflow_file(workflow, notify=notify)
    append_history({
        "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "name": result.get("name"),
        "ok": bool(result.get("ok")),
        "durationMs": result.get("durationMs"),
        "finalUrl": result.get("finalUrl", ""),
        "error": result.get("error", ""),
    })
    d = build_dashboard()
    log("Result", json.dumps(result, indent=2))
    log("Dashboard", d)
    return result


def listener():
    if not CONFIG["telegram"]["token"]:
        raise RuntimeError("TELEGRAM_BOT_TOKEN missing")

    def worker(job):
        return execute_workflow_file(job["workflow"], notify=True)

    def on_result(result, job):
        append_history({
            "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "name": result.get("name"),
            "ok": bool(result.get("ok")),
            "durationMs": result.get("durationMs"),
            "finalUrl": result.get("finalUrl", ""),
            "error": result.get("error", ""),
        })
        build_dashboard()
        text = f"✅ {result.get('name')} passed in {result.get('durationMs')}ms" if result.get("ok") else f"❌ {result.get('name')} failed: {result.get('error')}"
        try:
            send_message(CONFIG["telegram"]["token"], job["chat_id"], text)
        except Exception:
            pass

    q = RunQueue(worker=worker, concurrency=CONFIG["queue"]["concurrency"], retries=CONFIG["queue"]["retries"], on_result=on_result)

    log("Telegram listener started. Commands: /run /plan /ask /memory /dashboard")
    offset = 0
    while True:
        updates = poll_updates(CONFIG["telegram"]["token"], offset=offset, timeout=30)
        for upd in updates:
            offset = upd.get("update_id", 0) + 1
            cmd = parse_command(upd)
            if not cmd:
                continue

            allowed = CONFIG["telegram"]["allowed_user_ids"]
            if allowed and cmd["user_id"] not in allowed:
                send_message(CONFIG["telegram"]["token"], cmd["chat_id"], "Unauthorized user.")
                continue

            txt = cmd["text"]
            if txt.startswith("/run "):
                wf = txt.replace("/run ", "", 1).strip()
                if not Path(wf).exists():
                    send_message(CONFIG["telegram"]["token"], cmd["chat_id"], f"Workflow not found: {wf}")
                    continue
                send_message(CONFIG["telegram"]["token"], cmd["chat_id"], f"Queued: {wf}")
                q.add({"workflow": wf, "chat_id": cmd["chat_id"]})
                continue

            if txt.startswith("/plan "):
                prompt = txt.replace("/plan ", "", 1).strip()
                wf = generate_workflow(prompt)
                out = f"./examples/generated-{int(time.time()*1000)}.json"
                save_generated(wf, out)
                send_message(CONFIG["telegram"]["token"], cmd["chat_id"], f"Generated workflow: {out}")
                continue

            if txt.startswith("/ask "):
                goal = txt.replace("/ask ", "", 1).strip()
                send_message(CONFIG["telegram"]["token"], cmd["chat_id"], f"Agentic run started: {goal}")
                res = run_claude_like(goal, notify=True)
                text = f"✅ Agent done in {res.get('iterationsUsed')} iteration(s)" if res.get("ok") else f"❌ Agent failed: {res.get('final',{}).get('error')}"
                send_message(CONFIG["telegram"]["token"], cmd["chat_id"], text)
                continue

            if txt.startswith("/memory"):
                goal = txt.replace("/memory", "", 1).strip()
                mem = relevant_semantic(goal, 5) if goal else []
                if not mem:
                    mem = relevant_lexical(goal, 5) if goal else recent(5)
                message = "No matching failure memory." if not mem else "\n".join([f"{i+1}. score={m.get('score',0):.2f} {m.get('goal')} -> {m.get('error')}" for i,m in enumerate(mem)])
                send_message(CONFIG["telegram"]["token"], cmd["chat_id"], message)
                continue

            if txt.startswith("/dashboard"):
                d = build_dashboard()
                send_message(CONFIG["telegram"]["token"], cmd["chat_id"], f"Dashboard: {d}")
                continue

            send_message(CONFIG["telegram"]["token"], cmd["chat_id"], "Use /run <workflow> | /plan <prompt> | /ask <goal> | /memory [goal] | /dashboard")


def main():
    ap = argparse.ArgumentParser(description="Agentic Automation Framework (Python)")
    ap.add_argument("--workflow")
    ap.add_argument("--notify", action="store_true")
    ap.add_argument("--telegram-listen", action="store_true")
    ap.add_argument("--dashboard", action="store_true")
    ap.add_argument("--plan")
    ap.add_argument("--out", default="./examples/generated-workflow.json")
    ap.add_argument("--ask")
    args = ap.parse_args()

    try:
        if args.dashboard:
            d = build_dashboard()
            log("Dashboard generated", d)
            return
        if args.plan:
            wf = generate_workflow(args.plan)
            out = save_generated(wf, args.out)
            log("Generated workflow", out)
            return
        if args.ask:
            res = run_claude_like(args.ask, notify=args.notify)
            log("Agentic result", json.dumps(res, indent=2))
            if not res.get("ok"):
                raise SystemExit(1)
            return
        if args.telegram_listen:
            listener()
            return
        if args.workflow:
            res = run_once(args.workflow, notify=args.notify)
            if not res.get("ok"):
                raise SystemExit(1)
            return
        raise SystemExit("Provide one of: --workflow, --plan, --ask, --telegram-listen, --dashboard")
    except Exception as e:
        err(e)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
