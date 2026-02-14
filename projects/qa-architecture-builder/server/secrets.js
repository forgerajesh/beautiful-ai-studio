const crypto = require('crypto');

function maskSecret(secret = '') {
  if (!secret) return '';
  if (secret.length <= 4) return '*'.repeat(secret.length);
  return `${secret.slice(0, 2)}${'*'.repeat(Math.max(4, secret.length - 4))}${secret.slice(-2)}`;
}

function buildSecretReference({ provider, key, value }) {
  const hash = crypto.createHash('sha256').update(`${provider}:${key}:${value}`).digest('hex').slice(0, 16);
  return `kms-placeholder://${provider}/${key}/${hash}`;
}

function normalizeCredentialPayload(input = {}) {
  const normalized = {};
  Object.entries(input).forEach(([k, v]) => {
    if (v === undefined || v === null || `${v}`.trim() === '') return;
    const raw = `${v}`.trim();
    normalized[k] = {
      ref: buildSecretReference({ provider: 'integration', key: k, value: raw }),
      masked: maskSecret(raw),
      updatedAt: new Date().toISOString(),
    };
  });
  return normalized;
}

module.exports = {
  maskSecret,
  buildSecretReference,
  normalizeCredentialPayload,
};
