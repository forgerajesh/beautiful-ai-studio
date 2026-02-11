# Diet & Exercise Coach App

A practical weight-loss coaching app where users can:
- register + login securely
- provide body stats, timeline, and preference inputs
- generate personalized diet/workout plans
- log daily check-ins with motivational coach feedback
- track weekly analytics (steps, adherence, weight trend)

## Run
```bash
cd /home/vnc/.openclaw/workspace/projects/diet-exercise-coach
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8077
```

Open: `http://localhost:8077`

## API highlights
- `POST /api/register`
- `POST /api/plan/generate/{user_id}`
- `POST /api/checkin/{user_id}`
- `GET /api/progress/{user_id}`
- `GET /api/analytics/weekly/{user_id}`

## Product upgrades included
- Session-based auth for web app (`/login`, `/logout`)
- Personalized planning inputs: gender, timeline, workout days, diet preference
- Weekly analytics engine in dashboard + API
- Upgraded premium UI (clean, responsive, modern cards/KPIs)
