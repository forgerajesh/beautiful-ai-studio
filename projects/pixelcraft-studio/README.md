# PixelCraft Studio

Original Canva-like design editor (not a copy), built with Fabric.js.

## Frontend Features
- Templates: Instagram, Presentation, Poster
- Add/edit text, shapes, lines, images
- Layer controls (front/back/duplicate/delete)
- Property panel (fill, stroke, opacity, font)
- Save/Load JSON design files
- Export PNG
- Team mode (local): login, projects list, autosave
- Shared templates board + brand kit palette

## Production Backend (added)
- JWT auth (register/login)
- SQLite project storage
- Multi-user project access with roles (owner/viewer/editor)
- Version history per project save
- Project comments
- Shared template APIs
- LLM design endpoint (`POST /api/ai/design`) for AI layout generation

Backend source:
- `server/index.js`

## Run frontend
```bash
cd projects/pixelcraft-studio
python3 -m http.server 8095
# open http://localhost:8095
```

## Run backend API
```bash
cd projects/pixelcraft-studio
npm install
npm run server
# API health: http://localhost:8795/api/health
```

## Next step (optional)
Wire frontend UI to backend APIs for true cloud collaboration mode.
