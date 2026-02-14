const { URL } = require('url');

const DEFAULT_PROTOCOL = 'oidc';

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function parseEnvProviders() {
  const json = process.env.SSO_PROVIDERS_JSON;
  if (json) {
    const providers = safeJsonParse(json, []);
    if (Array.isArray(providers)) return providers;
  }

  const issuer = process.env.OIDC_ISSUER;
  const clientId = process.env.OIDC_CLIENT_ID;
  if (!issuer || !clientId) return [];

  return [{
    provider: process.env.OIDC_PROVIDER || 'primary-oidc',
    protocol: process.env.OIDC_PROTOCOL || DEFAULT_PROTOCOL,
    issuer,
    clientId,
    metadataUrl: process.env.OIDC_METADATA_URL || '',
    audience: process.env.OIDC_AUDIENCE || clientId,
    enabled: process.env.OIDC_ENABLED !== 'false',
  }];
}

function ensureHttpsUrl(value, fieldName) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${fieldName} must be a valid URL`);
  }
  if (!['https:', 'http:'].includes(parsed.protocol)) {
    throw new Error(`${fieldName} must use http/https`);
  }
  return parsed.toString().replace(/\/$/, '');
}

function validateSsoConfig(input) {
  const provider = String(input.provider || '').trim();
  const protocol = String(input.protocol || DEFAULT_PROTOCOL).trim().toLowerCase();
  const issuer = String(input.issuer || '').trim();
  const clientId = String(input.clientId || '').trim();
  const metadataUrl = String(input.metadataUrl || '').trim();

  if (!provider.match(/^[a-z0-9-_.]{2,80}$/i)) throw new Error('provider must be 2-80 chars [a-z0-9-_.]');
  if (!['oidc', 'saml'].includes(protocol)) throw new Error('protocol must be oidc or saml');
  if (!issuer) throw new Error('issuer is required');
  if (!clientId) throw new Error('clientId is required');

  const normalized = {
    provider,
    protocol,
    issuer: ensureHttpsUrl(issuer, 'issuer'),
    clientId,
    clientSecret: String(input.clientSecret || '').trim(),
    metadataUrl: metadataUrl ? ensureHttpsUrl(metadataUrl, 'metadataUrl') : '',
    audience: String(input.audience || clientId).trim(),
    enabled: !!input.enabled,
  };

  if (normalized.protocol === 'oidc' && !normalized.metadataUrl) {
    normalized.metadataUrl = `${normalized.issuer}/.well-known/openid-configuration`;
  }

  return normalized;
}

async function discoverOidcMetadata(metadataUrl) {
  const response = await fetch(metadataUrl, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`metadata fetch failed: ${response.status}`);
  const body = await response.json();
  const required = ['issuer', 'jwks_uri', 'authorization_endpoint', 'token_endpoint'];
  const missing = required.filter((k) => !body[k]);
  if (missing.length) throw new Error(`metadata missing keys: ${missing.join(', ')}`);
  return body;
}

module.exports = {
  parseEnvProviders,
  validateSsoConfig,
  discoverOidcMetadata,
};
