import os
from langchain_openai import ChatOpenAI


def build_llm():
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    return ChatOpenAI(model=model, base_url=base_url, temperature=0.1)
