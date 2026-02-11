import hashlib
import os
import secrets
import sqlite3
from datetime import UTC, datetime, timedelta
from pathlib import Path
from statistics import mean

from fastapi import FastAPI, Form, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / "coach.db"
SESSION_COOKIE = "coach_session"
SESSION_TTL_HOURS = 24 * 7

app = FastAPI(title="Diet & Exercise Coach")
templates = Jinja2Templates(directory=str(ROOT / "templates"))


def now_utc() -> datetime:
    return datetime.now(UTC)


def conn():
    c = sqlite3.connect(DB)
    c.row_factory = sqlite3.Row
    return c


def hash_password(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def init_db():
    c = conn()
    cur = c.cursor()
    cur.executescript(
        """
        create table if not exists users (
            id integer primary key autoincrement,
            name text not null,
            email text unique not null,
            password_hash text,
            age integer,
            gender text default 'male',
            height_cm real,
            weight_kg real,
            goal_weight_kg real,
            target_weeks integer default 16,
            activity_level text,
            workout_days integer default 5,
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

        create table if not exists sessions (
            id integer primary key autoincrement,
            user_id integer not null,
            token_hash text not null,
            expires_at text not null,
            created_at text not null
        );
        """
    )

    # lightweight migration safety
    existing_cols = {r["name"] for r in cur.execute("pragma table_info(users)").fetchall()}
    if "password_hash" not in existing_cols:
        cur.execute("alter table users add column password_hash text")
    if "gender" not in existing_cols:
        cur.execute("alter table users add column gender text default 'male'")
    if "target_weeks" not in existing_cols:
        cur.execute("alter table users add column target_weeks integer default 16")
    if "workout_days" not in existing_cols:
        cur.execute("alter table users add column workout_days integer default 5")

    c.commit()
    c.close()


def calc_plan(user: sqlite3.Row):
    weight_kg = float(user["weight_kg"])
    height_cm = float(user["height_cm"])
    age = int(user["age"])
    activity_level = (user["activity_level"] or "moderate").lower()
    goal_weight_kg = float(user["goal_weight_kg"])
    diet_pref = (user["diet_pref"] or "balanced").lower()
    gender = (user["gender"] or "male").lower()
    target_weeks = max(4, int(user["target_weeks"] or 16))
    workout_days = max(2, min(7, int(user["workout_days"] or 5)))

    activity_factor = {
        "low": 1.2,
        "moderate": 1.45,
        "high": 1.65,
    }.get(activity_level, 1.45)

    gender_offset = 5 if gender == "male" else -161
    bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + gender_offset
    tdee = bmr * activity_factor

    total_delta_kg = max(0.0, weight_kg - goal_weight_kg)
    daily_deficit_for_timeline = min(800, int((total_delta_kg * 7700) / max(1, target_weeks * 7)))
    safe_deficit = max(300, daily_deficit_for_timeline) if total_delta_kg > 0 else 200
    calories = int(max(1300, tdee - safe_deficit))

    protein_factor = 2.0 if diet_pref == "high_protein" else 1.8
    protein_g = int(max(110, weight_kg * protein_factor))
    fats_g = int(max(45, weight_kg * 0.7))
    carbs_g = int(max(80, (calories - protein_g * 4 - fats_g * 9) / 4))

    meal_templates = {
        "balanced": "Breakfast: eggs/oats + fruit | Lunch: chicken/roti/rice + veggies | Snack: yogurt/nuts | Dinner: fish/paneer + salad",
        "veg": "Breakfast: paneer/tofu scramble + fruit | Lunch: dal + quinoa + veggies | Snack: greek yogurt/chana | Dinner: tofu/soy + soup + salad",
        "low_carb": "Breakfast: omelette + avocado | Lunch: grilled protein + greens | Snack: nuts/cheese | Dinner: stir-fry protein + vegetables",
        "high_protein": "Every meal anchors 30-45g protein: eggs/whey/chicken/fish/paneer + fiber-rich veggies + controlled carbs",
    }

    workouts = (
        f"{workout_days} days/week: 3 strength sessions + {max(1, workout_days - 3)} cardio/conditioning sessions; "
        "daily steps target 8k-12k; 1 active recovery day with mobility/core"
    )

    notes = (
        f"Planned for ~{target_weeks} weeks. Hydrate 2.5-3L/day, sleep 7-8h, "
        "avoid liquid calories, and keep protein high for fat-loss with muscle retention."
    )

    return {
        "calories": calories,
        "protein_g": protein_g,
        "carbs_g": carbs_g,
        "fats_g": fats_g,
        "meals": meal_templates.get(diet_pref, meal_templates["balanced"]),
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


def create_session(user_id: int):
    raw = secrets.token_urlsafe(32)
    token_hash = hash_token(raw)
    expires_at = (now_utc() + timedelta(hours=SESSION_TTL_HOURS)).isoformat()

    c = conn()
    c.execute(
        "insert into sessions (user_id, token_hash, expires_at, created_at) values (?,?,?,?)",
        (user_id, token_hash, expires_at, now_utc().isoformat()),
    )
    c.commit()
    c.close()
    return raw


def current_user(request: Request):
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        return None

    c = conn()
    row = c.execute(
        """
        select u.* from sessions s
        join users u on u.id = s.user_id
        where s.token_hash = ? and s.expires_at > ?
        order by s.id desc
        limit 1
        """,
        (hash_token(token), now_utc().isoformat()),
    ).fetchone()
    c.close()
    return row


def require_owner(request: Request, user_id: int):
    u = current_user(request)
    if not u or int(u["id"]) != int(user_id):
        raise HTTPException(status_code=401, detail="Unauthorized")
    return u


def weekly_summary(user_id: int):
    c = conn()
    rows = c.execute(
        """
        select * from checkins
        where user_id = ?
        order by date desc, id desc
        limit 7
        """,
        (user_id,),
    ).fetchall()
    c.close()

    if not rows:
        return None

    weights = [r["weight_kg"] for r in rows if r["weight_kg"] is not None]
    steps = [r["steps"] for r in rows if r["steps"] is not None]
    adherence = [r["diet_adherence"] for r in rows if r["diet_adherence"] is not None]
    workouts = sum(int(r["workout_done"] or 0) for r in rows)

    weight_change = None
    if len(weights) >= 2:
        weight_change = round(weights[0] - weights[-1], 2)

    return {
        "entries": len(rows),
        "avg_weight": round(mean(weights), 2) if weights else None,
        "avg_steps": int(mean(steps)) if steps else None,
        "avg_adherence": int(mean(adherence)) if adherence else None,
        "workouts_done": workouts,
        "weight_change_kg": weight_change,
    }


@app.on_event("startup")
def startup():
    init_db()


@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    c = conn()
    users = c.execute("select id,name,email,weight_kg,goal_weight_kg from users order by id desc limit 20").fetchall()
    c.close()
    return templates.TemplateResponse(
        "index.html",
        {"request": request, "users": users, "me": current_user(request)},
    )


@app.post("/register")
def register(
    name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    age: int = Form(...),
    gender: str = Form("male"),
    height_cm: float = Form(...),
    weight_kg: float = Form(...),
    goal_weight_kg: float = Form(...),
    target_weeks: int = Form(16),
    activity_level: str = Form("moderate"),
    workout_days: int = Form(5),
    diet_pref: str = Form("balanced"),
):
    c = conn()
    c.execute(
        """
        insert into users (name,email,password_hash,age,gender,height_cm,weight_kg,goal_weight_kg,target_weeks,activity_level,workout_days,diet_pref,created_at)
        values (?,?,?,?,?,?,?,?,?,?,?,?,?)
        """,
        (
            name,
            email.lower().strip(),
            hash_password(password),
            age,
            gender,
            height_cm,
            weight_kg,
            goal_weight_kg,
            target_weeks,
            activity_level,
            workout_days,
            diet_pref,
            now_utc().isoformat(),
        ),
    )
    c.commit()
    user_id = c.execute("select id from users where email=?", (email.lower().strip(),)).fetchone()[0]
    c.close()

    token = create_session(user_id)
    resp = RedirectResponse(url=f"/dashboard/{user_id}", status_code=303)
    resp.set_cookie(SESSION_COOKIE, token, httponly=True, max_age=SESSION_TTL_HOURS * 3600, samesite="lax")
    return resp


@app.post("/login")
def login(email: str = Form(...), password: str = Form(...)):
    c = conn()
    u = c.execute(
        "select * from users where email=? and password_hash=?",
        (email.lower().strip(), hash_password(password)),
    ).fetchone()
    c.close()
    if not u:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_session(int(u["id"]))
    resp = RedirectResponse(url=f"/dashboard/{u['id']}", status_code=303)
    resp.set_cookie(SESSION_COOKIE, token, httponly=True, max_age=SESSION_TTL_HOURS * 3600, samesite="lax")
    return resp


@app.get("/logout")
def logout():
    resp = RedirectResponse(url="/", status_code=303)
    resp.delete_cookie(SESSION_COOKIE)
    return resp


@app.get("/dashboard/{user_id}", response_class=HTMLResponse)
def dashboard(user_id: int, request: Request):
    require_owner(request, user_id)

    c = conn()
    user = c.execute("select * from users where id=?", (user_id,)).fetchone()
    plan = c.execute("select * from plans where user_id=? order by id desc limit 1", (user_id,)).fetchone()
    checkins = c.execute("select * from checkins where user_id=? order by id desc limit 30", (user_id,)).fetchall()
    c.close()

    return templates.TemplateResponse(
        "dashboard.html",
        {
            "request": request,
            "user": user,
            "plan": plan,
            "checkins": checkins,
            "analytics": weekly_summary(user_id),
            "me": current_user(request),
        },
    )


@app.post("/generate-plan/{user_id}")
def generate_plan(user_id: int, request: Request):
    require_owner(request, user_id)

    c = conn()
    u = c.execute("select * from users where id=?", (user_id,)).fetchone()
    p = calc_plan(u)
    c.execute(
        """
        insert into plans (user_id,calories,protein_g,carbs_g,fats_g,meals,workouts,notes,created_at)
        values (?,?,?,?,?,?,?,?,?)
        """,
        (user_id, p["calories"], p["protein_g"], p["carbs_g"], p["fats_g"], p["meals"], p["workouts"], p["notes"], now_utc().isoformat()),
    )
    c.commit()
    c.close()
    return RedirectResponse(url=f"/dashboard/{user_id}", status_code=303)


@app.post("/checkin/{user_id}")
def add_checkin(
    user_id: int,
    request: Request,
    weight_kg: float = Form(...),
    steps: int = Form(...),
    workout_done: int = Form(0),
    diet_adherence: int = Form(...),
    mood: str = Form("ok"),
    notes: str = Form(""),
):
    require_owner(request, user_id)

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
        (user_id, now_utc().date().isoformat(), weight_kg, steps, workout_done, diet_adherence, mood, notes, comment),
    )
    c.commit()
    c.close()
    return RedirectResponse(url=f"/dashboard/{user_id}", status_code=303)


@app.post("/api/register")
def api_register(payload: dict):
    c = conn()
    c.execute(
        """
        insert into users (name,email,password_hash,age,gender,height_cm,weight_kg,goal_weight_kg,target_weeks,activity_level,workout_days,diet_pref,created_at)
        values (?,?,?,?,?,?,?,?,?,?,?,?,?)
        """,
        (
            payload["name"],
            payload["email"].lower().strip(),
            hash_password(payload.get("password", "changeme123")),
            payload.get("age", 30),
            payload.get("gender", "male"),
            payload.get("height_cm", 170),
            payload.get("weight_kg", 102),
            payload.get("goal_weight_kg", 85),
            payload.get("target_weeks", 16),
            payload.get("activity_level", "moderate"),
            payload.get("workout_days", 5),
            payload.get("diet_pref", "balanced"),
            now_utc().isoformat(),
        ),
    )
    c.commit()
    uid = c.execute("select id from users where email=?", (payload["email"].lower().strip(),)).fetchone()[0]
    c.close()
    return {"ok": True, "user_id": uid}


@app.post("/api/plan/generate/{user_id}")
def api_plan(user_id: int):
    c = conn()
    u = c.execute("select * from users where id=?", (user_id,)).fetchone()
    p = calc_plan(u)
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
            user_id,
            now_utc().date().isoformat(),
            payload["weight_kg"],
            payload.get("steps", 0),
            payload.get("workout_done", 0),
            payload.get("diet_adherence", 70),
            payload.get("mood", "ok"),
            payload.get("notes", ""),
            comment,
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


@app.get("/api/analytics/weekly/{user_id}")
def api_weekly_analytics(user_id: int):
    return {"ok": True, "weekly": weekly_summary(user_id)}
