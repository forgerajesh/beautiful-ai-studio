import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = process.env.PORT || 8795;
const JWT_SECRET = process.env.JWT_SECRET || 'pixelcraft-secret';
const db = new Database(new URL('./pixelcraft.db', import.meta.url).pathname);

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// schema
 db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  design_json TEXT NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(owner_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS project_collaborators (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('viewer','editor','owner')),
  UNIQUE(project_id,user_id),
  FOREIGN KEY(project_id) REFERENCES projects(id),
  FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS project_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  saved_by INTEGER NOT NULL,
  note TEXT,
  design_json TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(project_id) REFERENCES projects(id),
  FOREIGN KEY(saved_by) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS project_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  comment TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(project_id) REFERENCES projects(id),
  FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS shared_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  design_json TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
`);

const auth = (req, res, next) => {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'unauthorized' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'invalid token' });
  }
};

function canEditProject(userId, projectId) {
  const row = db.prepare(`
    SELECT p.owner_id, c.role FROM projects p
    LEFT JOIN project_collaborators c ON c.project_id=p.id AND c.user_id=?
    WHERE p.id=?
  `).get(userId, projectId);
  if (!row) return false;
  return row.owner_id === userId || row.role === 'editor' || row.role === 'owner';
}

function canViewProject(userId, projectId) {
  const row = db.prepare(`
    SELECT p.owner_id, c.role FROM projects p
    LEFT JOIN project_collaborators c ON c.project_id=p.id AND c.user_id=?
    WHERE p.id=?
  `).get(userId, projectId);
  if (!row) return false;
  return row.owner_id === userId || !!row.role;
}

app.get('/api/health', (_, res) => res.json({ ok: true }));

app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email/password required' });
  const hash = bcrypt.hashSync(password, 10);
  try {
    const r = db.prepare('INSERT INTO users(name,email,password_hash) VALUES(?,?,?)').run(name || '', email.toLowerCase(), hash);
    const token = jwt.sign({ id: r.lastInsertRowid, email }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token });
  } catch {
    res.status(400).json({ error: 'email already exists' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE email=?').get((email || '').toLowerCase());
  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) return res.status(401).json({ error: 'invalid credentials' });
  const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token });
});

app.get('/api/me', auth, (req, res) => {
  const user = db.prepare('SELECT id,name,email,created_at FROM users WHERE id=?').get(req.user.id);
  res.json({ user });
});

// projects
app.get('/api/projects', auth, (req, res) => {
  const rows = db.prepare(`
    SELECT DISTINCT p.id,p.name,p.width,p.height,p.updated_at,p.owner_id,
      CASE WHEN p.owner_id=? THEN 'owner' ELSE c.role END AS my_role
    FROM projects p
    LEFT JOIN project_collaborators c ON c.project_id=p.id AND c.user_id=?
    WHERE p.owner_id=? OR c.user_id=?
    ORDER BY p.updated_at DESC
  `).all(req.user.id, req.user.id, req.user.id, req.user.id);
  res.json({ projects: rows });
});

app.post('/api/projects', auth, (req, res) => {
  const { id, name, width, height, design, note } = req.body || {};
  if (!name || !design) return res.status(400).json({ error: 'name/design required' });
  const designJson = JSON.stringify(design);

  if (id) {
    if (!canEditProject(req.user.id, id)) return res.status(403).json({ error: 'forbidden' });
    db.prepare('UPDATE projects SET name=?, width=?, height=?, design_json=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(name, width || 1080, height || 1080, designJson, id);
    db.prepare('INSERT INTO project_versions(project_id,saved_by,note,design_json) VALUES(?,?,?,?)').run(id, req.user.id, note || 'Autosave', designJson);
    return res.json({ id });
  }

  const r = db.prepare('INSERT INTO projects(owner_id,name,width,height,design_json) VALUES(?,?,?,?,?)').run(req.user.id, name, width || 1080, height || 1080, designJson);
  const projectId = r.lastInsertRowid;
  db.prepare('INSERT OR IGNORE INTO project_collaborators(project_id,user_id,role) VALUES(?,?,?)').run(projectId, req.user.id, 'owner');
  db.prepare('INSERT INTO project_versions(project_id,saved_by,note,design_json) VALUES(?,?,?,?)').run(projectId, req.user.id, note || 'Initial version', designJson);
  res.json({ id: projectId });
});

app.get('/api/projects/:id', auth, (req, res) => {
  const id = Number(req.params.id);
  if (!canViewProject(req.user.id, id)) return res.status(403).json({ error: 'forbidden' });
  const p = db.prepare('SELECT id,name,width,height,design_json,updated_at FROM projects WHERE id=?').get(id);
  res.json({ project: { ...p, design: JSON.parse(p.design_json) } });
});

app.post('/api/projects/:id/share', auth, (req, res) => {
  const id = Number(req.params.id);
  const { email, role = 'viewer' } = req.body || {};
  const p = db.prepare('SELECT owner_id FROM projects WHERE id=?').get(id);
  if (!p || p.owner_id !== req.user.id) return res.status(403).json({ error: 'only owner can share' });
  const user = db.prepare('SELECT id FROM users WHERE email=?').get((email || '').toLowerCase());
  if (!user) return res.status(404).json({ error: 'user not found' });
  db.prepare('INSERT INTO project_collaborators(project_id,user_id,role) VALUES(?,?,?) ON CONFLICT(project_id,user_id) DO UPDATE SET role=excluded.role').run(id, user.id, role);
  res.json({ ok: true });
});

app.get('/api/projects/:id/versions', auth, (req, res) => {
  const id = Number(req.params.id);
  if (!canViewProject(req.user.id, id)) return res.status(403).json({ error: 'forbidden' });
  const versions = db.prepare(`
    SELECT v.id,v.note,v.created_at,u.name AS by_name
    FROM project_versions v JOIN users u ON u.id=v.saved_by
    WHERE v.project_id=? ORDER BY v.id DESC LIMIT 50
  `).all(id);
  res.json({ versions });
});

app.post('/api/projects/:id/comments', auth, (req, res) => {
  const id = Number(req.params.id);
  const { comment } = req.body || {};
  if (!comment) return res.status(400).json({ error: 'comment required' });
  if (!canViewProject(req.user.id, id)) return res.status(403).json({ error: 'forbidden' });
  db.prepare('INSERT INTO project_comments(project_id,user_id,comment) VALUES(?,?,?)').run(id, req.user.id, comment);
  res.json({ ok: true });
});

app.get('/api/projects/:id/comments', auth, (req, res) => {
  const id = Number(req.params.id);
  if (!canViewProject(req.user.id, id)) return res.status(403).json({ error: 'forbidden' });
  const comments = db.prepare(`
    SELECT c.id,c.comment,c.created_at,u.name AS by_name
    FROM project_comments c JOIN users u ON u.id=c.user_id
    WHERE c.project_id=? ORDER BY c.id DESC LIMIT 100
  `).all(id);
  res.json({ comments });
});

// shared templates
app.get('/api/templates', auth, (req, res) => {
  const templates = db.prepare('SELECT id,name,created_at FROM shared_templates ORDER BY id DESC LIMIT 200').all();
  res.json({ templates });
});

app.post('/api/templates', auth, (req, res) => {
  const { name, design } = req.body || {};
  if (!name || !design) return res.status(400).json({ error: 'name/design required' });
  const r = db.prepare('INSERT INTO shared_templates(user_id,name,design_json) VALUES(?,?,?)').run(req.user.id, name, JSON.stringify(design));
  res.json({ id: r.lastInsertRowid });
});

app.get('/api/templates/:id', auth, (req, res) => {
  const t = db.prepare('SELECT id,name,design_json FROM shared_templates WHERE id=?').get(Number(req.params.id));
  if (!t) return res.status(404).json({ error: 'not found' });
  res.json({ template: { ...t, design: JSON.parse(t.design_json) } });
});

app.listen(PORT, () => console.log(`PixelCraft API running on :${PORT}`));
