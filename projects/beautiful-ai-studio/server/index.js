import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = process.env.PORT || 8787;
const JWT_SECRET = process.env.JWT_SECRET || 'beautiful-ai-studio-secret';
const db = new Database(new URL('./studio.db', import.meta.url).pathname);

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS decks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  theme TEXT NOT NULL,
  slides_json TEXT NOT NULL,
  is_published INTEGER DEFAULT 0,
  slug TEXT UNIQUE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
`);

app.use(cors());
app.use(express.json({ limit: '3mb' }));

function auth(req, res, next) {
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60);
}

app.get('/api/health', (_, res) => res.json({ ok: true }));

app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email/password required' });
  const password_hash = bcrypt.hashSync(password, 10);
  try {
    const info = db.prepare('INSERT INTO users(name,email,password_hash) VALUES(?,?,?)').run(name || '', email.toLowerCase(), password_hash);
    const token = jwt.sign({ id: info.lastInsertRowid, email }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token });
  } catch {
    res.status(400).json({ error: 'Email already exists' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE email=?').get((email || '').toLowerCase());
  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token });
});

app.get('/api/me', auth, (req, res) => {
  const user = db.prepare('SELECT id,name,email,created_at FROM users WHERE id=?').get(req.user.id);
  res.json({ user });
});

app.get('/api/decks', auth, (req, res) => {
  const rows = db.prepare('SELECT id,title,theme,is_published,slug,updated_at FROM decks WHERE user_id=? ORDER BY updated_at DESC').all(req.user.id);
  res.json({ decks: rows });
});

app.post('/api/decks', auth, (req, res) => {
  const { id, title, theme, slides } = req.body || {};
  if (!title || !theme || !Array.isArray(slides)) return res.status(400).json({ error: 'title/theme/slides required' });
  const json = JSON.stringify(slides);
  if (id) {
    db.prepare('UPDATE decks SET title=?, theme=?, slides_json=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?').run(title, theme, json, id, req.user.id);
    return res.json({ id });
  }
  const info = db.prepare('INSERT INTO decks(user_id,title,theme,slides_json) VALUES(?,?,?,?)').run(req.user.id, title, theme, json);
  res.json({ id: info.lastInsertRowid });
});

app.get('/api/decks/:id', auth, (req, res) => {
  const deck = db.prepare('SELECT * FROM decks WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!deck) return res.status(404).json({ error: 'Deck not found' });
  res.json({ deck: { ...deck, slides: JSON.parse(deck.slides_json) } });
});

app.post('/api/decks/:id/publish', auth, (req, res) => {
  const deck = db.prepare('SELECT * FROM decks WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!deck) return res.status(404).json({ error: 'Deck not found' });
  const slug = deck.slug || `${slugify(deck.title)}-${deck.id}`;
  db.prepare('UPDATE decks SET is_published=1, slug=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?').run(slug, deck.id, req.user.id);
  res.json({ slug, url: `http://localhost:${PORT}/p/${slug}` });
});

app.get('/api/public/:slug', (req, res) => {
  const deck = db.prepare('SELECT title,theme,slides_json FROM decks WHERE slug=? AND is_published=1').get(req.params.slug);
  if (!deck) return res.status(404).json({ error: 'Not found' });
  res.json({ title: deck.title, theme: deck.theme, slides: JSON.parse(deck.slides_json) });
});

app.get('/p/:slug', (req, res) => {
  res.send(`<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Published Deck</title>
  <style>body{margin:0;font-family:Inter,Arial;background:#0b1020;color:#fff}#app{padding:18px}.slide{background:#121a33;border:1px solid #2a3a63;border-radius:14px;max-width:1000px;aspect-ratio:16/9;padding:36px;margin:12px auto}h1,h2{margin-top:0}</style></head>
  <body><div id="app">Loading...</div><script>
  fetch('/api/public/${req.params.slug}').then(r=>r.json()).then(d=>{
    const app=document.getElementById('app'); app.innerHTML='';
    d.slides.forEach(s=>{const el=document.createElement('div');el.className='slide';
      if(s.layout==='Title'){el.innerHTML='<h1>'+s.title+'</h1><ul>'+(s.bullets||[]).map(x=>'<li>'+x+'</li>').join('')+'</ul>'}
      else if(s.layout==='Two Column'){el.innerHTML='<h2>'+s.title+'</h2><div style="display:grid;grid-template-columns:1fr 1fr;gap:20px"><ul>'+(s.left||[]).map(x=>'<li>'+x+'</li>').join('')+'</ul><ul>'+(s.right||[]).map(x=>'<li>'+x+'</li>').join('')+'</ul></div>'}
      else if(s.layout==='Metrics'){el.innerHTML='<h2>'+s.title+'</h2><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">'+(s.metrics||[]).map(m=>'<div style="background:#1d4ed8;border-radius:10px;padding:14px"><div style="font-size:30px;font-weight:700">'+m.value+'</div><div>'+m.label+'</div></div>').join('')+'</div>'}
      else {el.innerHTML='<h2>'+s.title+'</h2><ol>'+(s.milestones||[]).map(x=>'<li>'+x+'</li>').join('')+'</ol>'}
      app.appendChild(el);
    })
  }).catch(()=>document.getElementById('app').innerText='Deck not found');
  </script></body></html>`);
});

app.listen(PORT, () => console.log(`Beautiful AI Studio API running on :${PORT}`));
