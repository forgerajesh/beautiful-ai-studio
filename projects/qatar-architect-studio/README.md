# Qatar Architect Studio

Architecture-focused web app for Qatar projects, with sample templates and comprehensive testing coverage matrix.

## What it includes
- Project setup panel (name, type, location, primary standard)
- Template library (concept, schematic, construction docs, authority submission)
- Auto-generated project execution plan
- Export plan as JSON
- Full testing-types matrix (functional/UI/API/integration/system/smoke/regression/performance/security/accessibility/compatibility/usability/UAT)
- Quality gates checklist

## Run
```bash
cd projects/qatar-architect-studio
python3 -m http.server 8097
# open http://localhost:8097
```

## Next suggested upgrade
- Add backend (auth + project DB)
- Add BIM/model file integration
- Add LLM assistant for code-compliant checklist generation
