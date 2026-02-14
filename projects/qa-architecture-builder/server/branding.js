const fs = require('fs');
const path = require('path');

const brandingPath = process.env.BRANDING_FILE || path.join(__dirname, '..', 'config', 'branding.json');

const defaultBranding = {
  company: 'QA Architecture Builder',
  logoUrl: 'https://example.com/logo.svg',
  colors: {
    primary: '#1f4fd6',
    secondary: '#0f172a',
    accent: '#16a34a',
  },
  exportTheme: {
    titleTemplate: '{company} · QA Strategy Executive Pack',
    footerTemplate: 'Confidential · Generated {dateIso}',
    pptSlideTheme: 'enterprise-blue',
  },
};

function ensureBrandingFile() {
  if (!fs.existsSync(brandingPath)) {
    fs.mkdirSync(path.dirname(brandingPath), { recursive: true });
    fs.writeFileSync(brandingPath, `${JSON.stringify(defaultBranding, null, 2)}\n`);
  }
}

function loadBranding() {
  ensureBrandingFile();
  try {
    const parsed = JSON.parse(fs.readFileSync(brandingPath, 'utf8'));
    return { ...defaultBranding, ...parsed, colors: { ...defaultBranding.colors, ...(parsed.colors || {}) }, exportTheme: { ...defaultBranding.exportTheme, ...(parsed.exportTheme || {}) } };
  } catch {
    return defaultBranding;
  }
}

function saveBranding(nextBranding) {
  ensureBrandingFile();
  fs.writeFileSync(brandingPath, `${JSON.stringify(nextBranding, null, 2)}\n`);
  return nextBranding;
}

function renderTemplate(template, branding) {
  const dateIso = new Date().toISOString();
  return String(template || '')
    .replaceAll('{company}', branding.company || defaultBranding.company)
    .replaceAll('{dateIso}', dateIso);
}

module.exports = { loadBranding, saveBranding, renderTemplate, brandingPath };
