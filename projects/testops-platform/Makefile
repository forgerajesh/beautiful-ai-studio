.PHONY: bootstrap api worker ui stack test etl

bootstrap:
	python3 -m venv .venv
	. .venv/bin/activate && pip install --upgrade pip && pip install -r requirements.txt
	cd ui-react && npm install

api:
	. .venv/bin/activate && uvicorn app.api.server:app --host 0.0.0.0 --port $${API_PORT:-8090}

worker:
	. .venv/bin/activate && celery -A app.wave1.queue.celery_app.celery_app worker --loglevel=info

ui:
	cd ui-react && npm run dev -- --host 0.0.0.0 --port $${UI_PORT:-5174}

stack:
	docker compose up --build

test:
	. .venv/bin/activate && pytest -q

etl:
	. .venv/bin/activate && python -c "from app.etl.engine import run_etl_profile; import json; print(json.dumps(run_etl_profile(), indent=2))"
