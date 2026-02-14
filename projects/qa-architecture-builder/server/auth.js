const jwt = require('jsonwebtoken');
const { createTokenVerifier, JWT_SECRET } = require('./tokenVerifier');

const tokenVerifier = createTokenVerifier();

const users = [
  { id: 'u_admin', username: 'admin', password: 'admin', role: 'admin' },
  { id: 'u_architect', username: 'architect', password: 'architect', role: 'architect' },
  { id: 'u_viewer', username: 'viewer', password: 'viewer', role: 'viewer' },
];

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, username: user.username }, JWT_SECRET, { expiresIn: '8h' });
}

async function authenticate(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;

  if (!token) {
    req.user = { id: 'anonymous', role: 'viewer', username: 'guest' };
    return next();
  }

  try {
    const verified = await tokenVerifier.verify(token);
    req.user = { id: verified.sub, role: verified.role, username: verified.username, authSource: verified.source };
    return next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token', details: e.message });
  }
}

function login(username, password) {
  const user = users.find((u) => u.username === username && u.password === password);
  if (!user) return null;
  return { token: signToken(user), user: { id: user.id, role: user.role, username: user.username } };
}

module.exports = { users, authenticate, login, tokenVerifier };
