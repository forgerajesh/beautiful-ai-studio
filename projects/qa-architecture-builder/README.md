# QA Architecture Builder

Drag-and-drop app for quality assurance architects to design test architecture workflows.

## Features
- Drag-and-drop QA components
- Reference industry E2E architecture templates (Web/API, Mobile, Data/ETL)
- Import external template JSON and apply instantly
- Export current board as reusable template JSON
- Connect blocks by clicking two nodes
- Double-click to edit labels
- Right-click to delete node
- Undo/Redo actions
- Auto-layout by QA lifecycle swimlanes
- Risk scoring + validation checks
- Effort estimator (person-day view)
- Auto-generated test strategy narrative
- Innovation Lab what-if simulator (team, release pace, leakage)
- Anti-pattern detection engine
- Export full blueprint pack (board + strategy + effort + validation + simulation)
- Export/import board JSON
- Built-in quality matrix coverage view

## Run
```bash
cd projects/qa-architecture-builder
python3 -m http.server 8101
# open http://localhost:8101
```
