.PHONY: venv install seed test test-critical run report mcp agent gen clean

venv:
	python3 -m venv .venv

install:
	. .venv/bin/activate && pip install -r requirements.txt

seed:
	. .venv/bin/activate && python scripts/seed_demo_db.py

test:
	. .venv/bin/activate && pytest -q --junitxml=reports/junit.xml

test-critical:
	. .venv/bin/activate && pytest -q --junitxml=reports/junit.xml -m "critical or high"

run:
	. .venv/bin/activate && PYTHONPATH=. python -m etlq.cli run --email-mode never --brand "Local Run"

report:
	python3 -m webbrowser file://$(PWD)/reports/executive_report.html

mcp:
	. .venv/bin/activate && python -m mcp_server.server

agent:
	. .venv/bin/activate && PYTHONPATH=. python -m agent.run_agent --request "run critical ETL checks and provide remediation"

gen:
	. .venv/bin/activate && PYTHONPATH=. python -m agent.generate_tests

clean:
	rm -rf .venv __pycache__ .pytest_cache
