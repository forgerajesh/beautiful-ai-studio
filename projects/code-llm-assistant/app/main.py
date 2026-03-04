import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from openai import OpenAI

load_dotenv()

app = FastAPI(title="Code LLM Assistant", version="1.0.0")

API_KEY = os.getenv("OPENAI_API_KEY", "")
MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")


class CodeRequest(BaseModel):
    prompt: str = Field(..., description="What code to generate")
    language: str = Field(default="python")
    constraints: str | None = None


class RefactorRequest(BaseModel):
    code: str
    goal: str = "Improve readability and maintainability"
    language: str = "python"


def get_client() -> OpenAI:
    if not API_KEY:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY missing")
    return OpenAI(api_key=API_KEY)


@app.get("/health")
def health():
    return {"ok": True, "model": MODEL}


@app.post("/generate")
def generate_code(req: CodeRequest):
    client = get_client()
    system = (
        "You are an expert software engineer. Return only code block output with concise comments. "
        "Prefer production-safe, readable code."
    )
    user = f"Language: {req.language}\nTask: {req.prompt}\nConstraints: {req.constraints or 'none'}"

    try:
        r = client.chat.completions.create(
            model=MODEL,
            temperature=0.2,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        )
        out = r.choices[0].message.content or ""
        return {"code": out}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/refactor")
def refactor_code(req: RefactorRequest):
    client = get_client()
    system = "You refactor code safely. Return improved code only, then a short bullet list of key improvements."
    user = f"Language: {req.language}\nGoal: {req.goal}\nCode:\n{req.code}"

    try:
        r = client.chat.completions.create(
            model=MODEL,
            temperature=0.1,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        )
        out = r.choices[0].message.content or ""
        return {"result": out}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
