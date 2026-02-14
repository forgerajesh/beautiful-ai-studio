const path = require('path');
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');

const { initDb, run, get, all } = require('./db');
const { authenticate, login } = require('./auth');
const { requireRole } = require('./rbac');
const { computeBoardMetrics, diffBoards, safeParse } = require('./metrics');
const { pushToJira, pullFromJira, getSyncHealth, JIRA_MOCK_MODE } = require('./jira');
const { createWave3Router } = require('./wave3');

const app = express();
app.use(cors());
app.use(express.json({ limit: '4mb' }));
app.use(authenticate);

function nowIso() { return new Date().toISOString(); }

async function nextVersionNumber(boardId) {
  const row = await get('SELECT COALESCE(MAX(version_number), 0) AS maxv FROM board_versions WHERE board_id = ?', [boardId]);
  return (row?.maxv || 0) + 1;
}

async function createVersion(boardId, dataJson, createdBy, summary = 'Auto snapshot') {
  const versionNumber = await nextVersionNumber(boardId);
  return run(
    `INSERT INTO board_versions (board_id, version_number, data_json, summary, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [boardId, versionNumber, dataJson, summary, createdBy, nowIso()]
  );
}

app.post('/api/v2/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const result = login(username, password);
  if (!result) return res.status(401).json({ error: 'Invalid credentials' });
  return res.json(result);
});

app.get('/api/v2/health', async (req, res) => {
  const b = await get('SELECT COUNT(*) as c FROM boards');
  res.json({ status: 'ok', jiraMockMode: JIRA_MOCK_MODE, boards: b?.c || 0 });
});

app.get('/api/v2/boards', async (req, res) => {
  const rows = await all('SELECT id, name, description, owner_user_id, workflow_state, created_at, updated_at FROM boards ORDER BY id DESC');
  res.json(rows);
});

app.post('/api/v2/boards', requireRole('admin', 'architect'), async (req, res) => {
  const { name, description = '', data = { nodes: [], links: [] } } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name is required' });

  const dataJson = JSON.stringify(data);
  const ts = nowIso();
  const result = await run(
    `INSERT INTO boards (name, description, data_json, owner_user_id, workflow_state, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [name, description, dataJson, req.user.id, 'draft', ts, ts]
  );
  await createVersion(result.lastID, dataJson, req.user.id, 'Initial version');
  const created = await get('SELECT * FROM boards WHERE id = ?', [result.lastID]);
  res.status(201).json(created);
});

app.get('/api/v2/boards/:id', async (req, res) => {
  const row = await get('SELECT * FROM boards WHERE id = ?', [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Board not found' });
  const metrics = computeBoardMetrics(row);
  res.json({ ...row, data: safeParse(row.data_json, { nodes: [], links: [] }), metrics });
});

app.put('/api/v2/boards/:id', requireRole('admin', 'architect'), async (req, res) => {
  const board = await get('SELECT * FROM boards WHERE id = ?', [req.params.id]);
  if (!board) return res.status(404).json({ error: 'Board not found' });

  const { name = board.name, description = board.description, data = safeParse(board.data_json, { nodes: [], links: [] }), summary = 'Board updated' } = req.body || {};
  const dataJson = JSON.stringify(data);

  await run(
    'UPDATE boards SET name = ?, description = ?, data_json = ?, updated_at = ? WHERE id = ?',
    [name, description, dataJson, nowIso(), req.params.id]
  );
  await createVersion(req.params.id, dataJson, req.user.id, summary);
  const updated = await get('SELECT * FROM boards WHERE id = ?', [req.params.id]);
  broadcastBoard(req.params.id, { type: 'board:update', boardId: Number(req.params.id), by: req.user.username, data });
  res.json(updated);
});

app.get('/api/v2/boards/:id/versions', async (req, res) => {
  const rows = await all(
    `SELECT id, board_id, version_number, summary, created_by, created_at
     FROM board_versions WHERE board_id = ? ORDER BY version_number DESC`,
    [req.params.id]
  );
  res.json(rows);
});

app.get('/api/v2/boards/:id/diff/:fromVersion/:toVersion', async (req, res) => {
  const from = await get('SELECT * FROM board_versions WHERE board_id = ? AND version_number = ?', [req.params.id, req.params.fromVersion]);
  const to = await get('SELECT * FROM board_versions WHERE board_id = ? AND version_number = ?', [req.params.id, req.params.toVersion]);
  if (!from || !to) return res.status(404).json({ error: 'One or both versions not found' });
  const diff = diffBoards(from.data_json, to.data_json);
  res.json({ fromVersion: from.version_number, toVersion: to.version_number, diff });
});

app.post('/api/v2/boards/:id/restore/:versionNumber', requireRole('admin', 'architect'), async (req, res) => {
  const board = await get('SELECT * FROM boards WHERE id = ?', [req.params.id]);
  if (!board) return res.status(404).json({ error: 'Board not found' });
  const version = await get('SELECT * FROM board_versions WHERE board_id = ? AND version_number = ?', [req.params.id, req.params.versionNumber]);
  if (!version) return res.status(404).json({ error: 'Version not found' });

  await run('UPDATE boards SET data_json = ?, updated_at = ? WHERE id = ?', [version.data_json, nowIso(), req.params.id]);
  await createVersion(req.params.id, version.data_json, req.user.id, `Restore to version ${req.params.versionNumber}`);

  const restoredData = safeParse(version.data_json, { nodes: [], links: [] });
  broadcastBoard(req.params.id, { type: 'board:restore', boardId: Number(req.params.id), version: Number(req.params.versionNumber), data: restoredData });
  res.json({ ok: true, restoredToVersion: Number(req.params.versionNumber), data: restoredData });
});

app.get('/api/v2/boards/:id/comments', async (req, res) => {
  const rows = await all('SELECT * FROM comments WHERE board_id = ? ORDER BY id DESC LIMIT 200', [req.params.id]);
  res.json(rows);
});

app.post('/api/v2/boards/:id/comments', requireRole('admin', 'architect', 'viewer'), async (req, res) => {
  const { text } = req.body || {};
  if (!text) return res.status(400).json({ error: 'text is required' });

  const result = await run(
    'INSERT INTO comments (board_id, user_id, text, created_at) VALUES (?, ?, ?, ?)',
    [req.params.id, req.user.id, text, nowIso()]
  );
  const created = await get('SELECT * FROM comments WHERE id = ?', [result.lastID]);
  broadcastBoard(req.params.id, { type: 'comment:add', boardId: Number(req.params.id), comment: created });
  res.status(201).json(created);
});

app.patch('/api/v2/boards/:id/workflow', requireRole('admin', 'architect'), async (req, res) => {
  const { toState } = req.body || {};
  if (!toState) return res.status(400).json({ error: 'toState is required' });
  const board = await get('SELECT * FROM boards WHERE id = ?', [req.params.id]);
  if (!board) return res.status(404).json({ error: 'Board not found' });

  await run('UPDATE boards SET workflow_state = ?, updated_at = ? WHERE id = ?', [toState, nowIso(), req.params.id]);
  await run(
    'INSERT INTO workflow_history (board_id, from_state, to_state, changed_by, created_at) VALUES (?, ?, ?, ?, ?)',
    [req.params.id, board.workflow_state, toState, req.user.id, nowIso()]
  );

  const updated = await get('SELECT * FROM boards WHERE id = ?', [req.params.id]);
  broadcastBoard(req.params.id, { type: 'workflow:update', boardId: Number(req.params.id), workflowState: toState });
  res.json(updated);
});

app.post('/api/v2/integrations/jira/push/:boardId', requireRole('admin', 'architect'), async (req, res) => {
  const board = await get('SELECT * FROM boards WHERE id = ?', [req.params.boardId]);
  if (!board) return res.status(404).json({ error: 'Board not found' });
  const response = await pushToJira(board);
  res.json(response);
});

app.post('/api/v2/integrations/jira/pull/:boardId', requireRole('admin', 'architect', 'viewer'), async (req, res) => {
  const response = await pullFromJira(Number(req.params.boardId));
  res.json(response);
});

app.get('/api/v2/integrations/jira/health', async (req, res) => {
  const boardId = req.query.boardId ? Number(req.query.boardId) : null;
  const logs = await getSyncHealth(boardId);
  res.json({ mode: JIRA_MOCK_MODE ? 'mock' : 'stub', logs });
});

app.get('/api/v2/dashboard/board/:id', async (req, res) => {
  const board = await get('SELECT * FROM boards WHERE id = ?', [req.params.id]);
  if (!board) return res.status(404).json({ error: 'Board not found' });

  const metrics = computeBoardMetrics(board);
  const versions = await all(
    `SELECT version_number, data_json, created_at FROM board_versions WHERE board_id = ? ORDER BY version_number ASC`,
    [req.params.id]
  );

  const riskTrend = versions.slice(-10).map((v) => {
    const m = computeBoardMetrics({ data_json: v.data_json });
    return { version: v.version_number, risk: m.currentRiskScore, at: v.created_at };
  });

  res.json({ boardId: Number(req.params.id), metrics, riskTrend, workflowState: board.workflow_state, updatedAt: board.updated_at });
});

app.use('/api/v3', createWave3Router({ broadcastBoard }));

app.use(express.static(path.join(__dirname, '..')));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws/v2' });
const rooms = new Map();

function ensureRoom(boardId) {
  const key = String(boardId);
  if (!rooms.has(key)) {
    rooms.set(key, { clients: new Set(), presence: new Map() });
  }
  return rooms.get(key);
}

function sendJson(ws, payload) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
}

function broadcastBoard(boardId, payload) {
  const room = rooms.get(String(boardId));
  if (!room) return;
  const encoded = JSON.stringify(payload);
  room.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(encoded);
  });
}

wss.on('connection', (ws) => {
  ws.meta = { boardId: null, user: 'guest' };

  ws.on('message', async (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    if (msg.type === 'join' && msg.boardId) {
      ws.meta.boardId = String(msg.boardId);
      ws.meta.user = msg.user || 'guest';
      const room = ensureRoom(ws.meta.boardId);
      room.clients.add(ws);
      room.presence.set(ws, ws.meta.user);

      const users = [...room.presence.values()];
      broadcastBoard(ws.meta.boardId, { type: 'presence', boardId: Number(ws.meta.boardId), users });
      return;
    }

    if (!ws.meta.boardId) return;

    if (msg.type === 'board:update') {
      broadcastBoard(ws.meta.boardId, { type: 'board:update', boardId: Number(ws.meta.boardId), by: ws.meta.user, data: msg.data });
      return;
    }

    if (msg.type === 'ping') {
      sendJson(ws, { type: 'pong', ts: Date.now() });
    }
  });

  ws.on('close', () => {
    if (!ws.meta?.boardId) return;
    const room = rooms.get(ws.meta.boardId);
    if (!room) return;

    room.clients.delete(ws);
    room.presence.delete(ws);
    const users = [...room.presence.values()];
    broadcastBoard(ws.meta.boardId, { type: 'presence', boardId: Number(ws.meta.boardId), users });
  });
});

const port = process.env.PORT || 8101;
initDb().then(() => {
  server.listen(port, () => {
    console.log(`[qa-builder-v2] listening on http://localhost:${port}`);
    console.log(`[qa-builder-v2] ws endpoint ws://localhost:${port}/ws/v2`);
  });
});
