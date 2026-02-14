const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

const users = [
  { id: 'u_admin', username: 'admin', password: 'admin', role: 'admin' },
  { id: 'u_architect', username: 'architect', password: 'architect', role: 'architect' },
  { id: 'u_viewer', username: 'viewer', password: 'viewer', role: 'viewer' },
];

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, username: user.username }, JWT_SECRET, { expiresIn: '8h' });
}

function authenticate(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;

  if (!token) {
    req.user = { id: 'anonymous', role: 'viewer', username: 'guest' };
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { id: decoded.sub, role: decoded.role, username: decoded.username };
    return next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function login(username, password) {
  const user = users.find((u) => u.username === username && u.password === password);
  if (!user) return null;
  return { token: signToken(user), user: { id: user.id, role: user.role, username: user.username } };
}

module.exports = { users, authenticate, login };
