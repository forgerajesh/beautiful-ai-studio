const jwt = require('jsonwebtoken');
const { parseEnvProviders } = require('./sso');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function decodeWithoutVerify(token) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return payload;
  } catch {
    return null;
  }
}

function createTokenVerifier() {
  const envProviders = parseEnvProviders();

  async function verifyLocalJwt(token) {
    const decoded = jwt.verify(token, JWT_SECRET);
    return {
      sub: decoded.sub,
      role: decoded.role || 'viewer',
      username: decoded.username || decoded.preferred_username || decoded.email || 'user',
      claims: decoded,
      source: 'local-jwt',
    };
  }

  async function verifyExternalOidc(token) {
    // Scaffold-only verifier: validates token shape and issuer/audience alignment.
    // Replace with jose/jwks-based signature verification before full production rollout.
    const decoded = decodeWithoutVerify(token);
    if (!decoded) throw new Error('Malformed external token');
    const provider = envProviders.find((p) => p.enabled && p.protocol === 'oidc' && decoded.iss === p.issuer);
    if (!provider) throw new Error('Unknown token issuer');
    const aud = Array.isArray(decoded.aud) ? decoded.aud : [decoded.aud];
    if (!aud.includes(provider.audience || provider.clientId)) throw new Error('Audience mismatch');
    if (decoded.exp && Date.now() / 1000 > decoded.exp) throw new Error('Token expired');

    return {
      sub: decoded.sub || decoded.oid || decoded.email,
      role: decoded.role || decoded['qa_builder_role'] || 'viewer',
      username: decoded.preferred_username || decoded.email || decoded.sub || 'sso-user',
      claims: decoded,
      source: `oidc:${provider.provider}`,
    };
  }

  async function verify(token) {
    try {
      return await verifyLocalJwt(token);
    } catch (localErr) {
      if (!envProviders.length) throw localErr;
      return verifyExternalOidc(token);
    }
  }

  return {
    verify,
    getProviderCatalog: () => envProviders.map((p) => ({
      provider: p.provider,
      protocol: p.protocol,
      issuer: p.issuer,
      audience: p.audience,
      enabled: !!p.enabled,
    })),
  };
}

module.exports = { createTokenVerifier, JWT_SECRET };
