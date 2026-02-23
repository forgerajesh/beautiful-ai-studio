# DeckForge Studio

Production-ready presentation studio (React + Express + SQLite) with AI generation, deck publishing, and template marketplace.

## Real-use setup (Docker)

1. Copy env file:
```bash
cp .env.example .env
```
2. Set secrets in `.env`:
- `JWT_SECRET`
- `LLM_API_KEY` (optional, enables AI generation)

3. Run:
```bash
npm run docker:up
```

4. Open:
- App + API: `http://localhost:8787`
- Health: `http://localhost:8787/api/health`

Data persists in `./data/studio.db`.

## Local (non-docker)

```bash
npm install
npm run build
npm run start
```

## Notes
- Frontend is served by Express from `dist` in production.
- API base defaults to same-origin `/api` for reverse-proxy/domain deployments.
- Published deck routes are available at `/p/:slug`.
