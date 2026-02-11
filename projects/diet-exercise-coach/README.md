# Diet & Exercise Coach App

A practical weight-loss coaching app where users can:
- register with body/goal inputs
- generate personalized diet + workout plan
- log daily check-ins
- track progress and receive motivational comments

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
