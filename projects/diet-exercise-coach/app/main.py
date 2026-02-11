import sqlite3
from datetime import datetime
from pathlib import Path
from statistics import mean

from fastapi import FastAPI, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / "coach.db"

app = FastAPI(title="Diet & Exercise Coach")
templates = Jinja2Templates(directory=str(ROOT / "templates"))


def conn():
    c = sqlite3.connect(DB)
    c.row_factory = sqlite3.Row
    return c


def init_db():
    c = conn()
    cur = c.cursor()
    cur.executescript(
        """
        create table if not exists users (
            id integer primary key autoincrement,
            name text not null,
            email text unique not null,
            age integer,
            height_cm real,
            weight_kg real,
            goal_weight_kg real,
            activity_level text,
            diet_pref text,
            created_at text not null
        );

        create table if not exists plans (
            id integer primary key autoincrement,
            user_id integer not null,
            calories integer,
            protein_g integer,
            carbs_g integer,
            fats_g integer,
            meals text,
            workouts text,
            notes text,
            created_at text not null
        );

        create table if not exists checkins (
            id integer primary key autoincrement,
            user_id integer not null,
            date text not null,
            weight_kg real,
            steps integer,
            workout_done integer,
            diet_adherence integer,
            mood text,
            notes text,
            coach_comment text
        );
        """
    )
    c.commit()
    c.close()


def calc_plan(weight_kg: float, height_cm: float, age: int, activity_level: str, goal_weight_kg: float):
    activity_factor = {
        "low": 1.2,
        "moderate": 1.4,
        "high": 1.6,
    }.get((activity_level or "moderate").lower(), 1.4)

    bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
    tdee = bmr * activity_factor

    deficit = 500 if goal_weight_kg < weight_kg else 250
    calories = int(max(1300, tdee - deficit))

    protein_g = int(max(110, weight_kg * 1.8))
    fats_g = int(max(45, weight_kg * 0.7))
    carbs_g = int(max(100, (calories - protein_g * 4 - fats_g * 9) / 4))

    meals = (
        "Breakfast: High-protein + fiber | "
        "Lunch: Lean protein + whole grains + vegetables | "
        "Snack: Fruit + yogurt/nuts | "
        "Dinner: Protein + vegetables + light carbs"
    )

    workouts = (
        "Mon/Thu: Strength (45 min), Tue/Fri: Cardio (30-40 min), "
        "Wed: Mobility + Core, Sat: Long walk (8k-12k steps), Sun: Recovery"
    )

    notes = "Hydrate 2.5-3L/day, sleep 7-8h, avoid liquid calories, track portions daily."
    return {
        "calories": calories,
        "protein_g": protein_g,
        "carbs_g": carbs_g,
        "fats_g": fats_g,
        "meals": meals,
        "workouts": workouts,
        "notes": notes,
    }


def coach_comment(latest_weight: float, avg_prev: float | None, adherence: int, workout_done: int):
    if avg_prev is not None and latest_weight < avg_prev and adherence >= 80:
        return "Excellent momentum — your consistency is showing. Keep this exact rhythm for another week."
    if adherence >= 80 and workout_done:
        return "Great discipline today. You’re building long-term fat-loss habits, not just short-term results."
    if adherence < 60:
        return "No stress — reset next meal, next workout. Progress is consistency over perfection."
    return "Solid effort. Focus on protein target and steps tomorrow for an even better trend."


@app.on_event("startup")
def startup():
    init_db()


@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    c = conn()
    users = c.execute("select * from users order by id desc limit 20").fetchall()
    c.close()
    return templates.TemplateResponse("index.html", {"request": request, "users": users})


@app.post("/register")
def register(
    name: str = Form(...),
    email: str = Form(...),
    age: int = Form(...),
    height_cm: float = Form(...),
    weight_kg: float = Form(...),
    goal_weight_kg: float = Form(...),
    activity_level: str = Form("moderate"),
    diet_pref: str = Form("balanced"),
):
    c = conn()
    c.execute(
        """
        insert into users (name,email,age,height_cm,weight_kg,goal_weight_kg,activity_level,diet_pref,created_at)
        values (?,?,?,?,?,?,?,?,?)
        """,
        (name, email, age, height_cm, weight_kg, goal_weight_kg, activity_level, diet_pref, datetime.utcnow().isoformat()),
    )
    c.commit()
    user_id = c.execute("select id from users where email=?", (email,)).fetchone()[0]
    c.close()
    return RedirectResponse(url=f"/dashboard/{user_id}", status_code=303)


@app.get("/dashboard/{user_id}", response_class=HTMLResponse)
def dashboard(user_id: int, request: Request):
    c = conn()
    user = c.execute("select * from users where id=?", (user_id,)).fetchone()
    plan = c.execute("select * from plans where user_id=? order by id desc limit 1", (user_id,)).fetchone()
    checkins = c.execute("select * from checkins where user_id=? order by id desc limit 30", (user_id,)).fetchall()
    c.close()

    avg_prev = None
    if len(checkins) >= 4:
        prev = [r["weight_kg"] for r in checkins[1:8] if r["weight_kg"] is not None]
        if prev:
            avg_prev = mean(prev)

    return templates.TemplateResponse(
        "dashboard.html",
        {
            "request": request,
            "user": user,
            "plan": plan,
            "checkins": checkins,
            "avg_prev": avg_prev,
        },
    )


@app.post("/generate-plan/{user_id}")
def generate_plan(user_id: int):
    c = conn()
    u = c.execute("select * from users where id=?", (user_id,)).fetchone()
    p = calc_plan(u["weight_kg"], u["height_cm"], u["age"], u["activity_level"], u["goal_weight_kg"])
    c.execute(
        """
        insert into plans (user_id,calories,protein_g,carbs_g,fats_g,meals,workouts,notes,created_at)
        values (?,?,?,?,?,?,?,?,?)
        """,
        (user_id, p["calories"], p["protein_g"], p["carbs_g"], p["fats_g"], p["meals"], p["workouts"], p["notes"], datetime.utcnow().isoformat()),
    )
    c.commit()
    c.close()
    return RedirectResponse(url=f"/dashboard/{user_id}", status_code=303)


@app.post("/checkin/{user_id}")
def add_checkin(
    user_id: int,
    weight_kg: float = Form(...),
    steps: int = Form(...),
    workout_done: int = Form(0),
    diet_adherence: int = Form(...),
    mood: str = Form("ok"),
    notes: str = Form(""),
):
    c = conn()
    prev = c.execute("select weight_kg from checkins where user_id=? order by id desc limit 7", (user_id,)).fetchall()
    prev_vals = [x["weight_kg"] for x in prev if x["weight_kg"] is not None]
    avg_prev = mean(prev_vals) if prev_vals else None
    comment = coach_comment(weight_kg, avg_prev, diet_adherence, workout_done)

    c.execute(
        """
        insert into checkins (user_id,date,weight_kg,steps,workout_done,diet_adherence,mood,notes,coach_comment)
        values (?,?,?,?,?,?,?,?,?)
        """,
        (user_id, datetime.utcnow().date().isoformat(), weight_kg, steps, workout_done, diet_adherence, mood, notes, comment),
    )
    c.commit()
    c.close()
    return RedirectResponse(url=f"/dashboard/{user_id}", status_code=303)


@app.post("/api/register")
def api_register(payload: dict):
    c = conn()
    c.execute(
        """
        insert into users (name,email,age,height_cm,weight_kg,goal_weight_kg,activity_level,diet_pref,created_at)
        values (?,?,?,?,?,?,?,?,?)
        """,
        (
            payload["name"], payload["email"], payload.get("age", 30), payload.get("height_cm", 170),
            payload.get("weight_kg", 102), payload.get("goal_weight_kg", 85), payload.get("activity_level", "moderate"),
            payload.get("diet_pref", "balanced"), datetime.utcnow().isoformat(),
        ),
    )
    c.commit()
    uid = c.execute("select id from users where email=?", (payload["email"],)).fetchone()[0]
    c.close()
    return {"ok": True, "user_id": uid}


@app.post("/api/plan/generate/{user_id}")
def api_plan(user_id: int):
    c = conn()
    u = c.execute("select * from users where id=?", (user_id,)).fetchone()
    p = calc_plan(u["weight_kg"], u["height_cm"], u["age"], u["activity_level"], u["goal_weight_kg"])
    c.close()
    return {"ok": True, "plan": p}


@app.post("/api/checkin/{user_id}")
def api_checkin(user_id: int, payload: dict):
    c = conn()
    prev = c.execute("select weight_kg from checkins where user_id=? order by id desc limit 7", (user_id,)).fetchall()
    prev_vals = [x["weight_kg"] for x in prev if x["weight_kg"] is not None]
    avg_prev = mean(prev_vals) if prev_vals else None
    comment = coach_comment(payload["weight_kg"], avg_prev, payload.get("diet_adherence", 70), payload.get("workout_done", 0))

    c.execute(
        """
        insert into checkins (user_id,date,weight_kg,steps,workout_done,diet_adherence,mood,notes,coach_comment)
        values (?,?,?,?,?,?,?,?,?)
        """,
        (
            user_id, datetime.utcnow().date().isoformat(), payload["weight_kg"], payload.get("steps", 0), payload.get("workout_done", 0),
            payload.get("diet_adherence", 70), payload.get("mood", "ok"), payload.get("notes", ""), comment,
        ),
    )
    c.commit()
    c.close()
    return {"ok": True, "coach_comment": comment}


@app.get("/api/progress/{user_id}")
def api_progress(user_id: int):
    c = conn()
    rows = c.execute("select date,weight_kg,steps,diet_adherence,coach_comment from checkins where user_id=? order by id desc limit 30", (user_id,)).fetchall()
    c.close()
    return {"ok": True, "entries": [dict(r) for r in rows]}
