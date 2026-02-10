import json
from pathlib import Path
from agentic.config import CONFIG
from agentic.playwright_runner import run_workflow
from agentic.channels.telegram import send_message as send_tg
from agentic.channels.whatsapp import send_message as send_wa


def load_workflow(file_path: str):
    return json.loads(Path(file_path).read_text())


def execute_workflow_file(file_path: str, notify=False):
    wf = load_workflow(file_path)
    result = run_workflow(wf, headless=CONFIG["headless"])

    if notify:
        text = (
            f"✅ [{result['name']}] Passed in {result['durationMs']}ms\nURL: {result.get('finalUrl','')}"
            if result.get("ok")
            else f"❌ [{result['name']}] Failed in {result['durationMs']}ms\nError: {result.get('error','')}"
        )
        try:
            send_tg(CONFIG["telegram"]["token"], CONFIG["telegram"]["chat_id"], text)
        except Exception:
            pass
        try:
            send_wa(CONFIG["whatsapp"]["token"], CONFIG["whatsapp"]["phone_number_id"], CONFIG["whatsapp"]["to"], text)
        except Exception:
            pass

    return result
