const { run, get, all } = require('./db');
const { requireRole } = require('./rbac');
const { computeBoardMetrics, safeParse } = require('./metrics');
const { validateSsoConfig, discoverOidcMetadata } = require('./sso');
const { normalizeCredentialPayload } = require('./secrets');
const { loadBranding, saveBranding, renderTemplate } = require('./branding');

function nowIso() { return new Date().toISOString(); }

function validateIntegrationSettings(provider, payload = {}) {
  const supported = ['jira', 'azure-devops'];
  if (!supported.includes(provider)) throw new Error('provider must be jira or azure-devops');
  if (!payload.baseUrl || !/^https?:\/\//.test(payload.baseUrl)) throw new Error('baseUrl must be a valid http/https URL');
  if (provider === 'jira' && !payload.projectKey) throw new Error('projectKey is required for jira');
  if (provider === 'azure-devops' && !payload.projectKey) throw new Error('projectKey (project name) is required for azure-devops');
  return {
    baseUrl: payload.baseUrl.replace(/\/$/, ''),
    projectKey: payload.projectKey || '',
    apiVersion: payload.apiVersion || (provider === 'azure-devops' ? '7.1-preview.1' : '3'),
    enabled: !!payload.enabled,
    fieldMapping: payload.fieldMapping || {},
    credentials: payload.credentials || {},
  };
}

function buildRoadmap(gaps) {
  const phases = [
    { phase: 'Phase 1 (0-30 days)', focus: ['Baseline architecture import', 'Traceability model', 'Core CI checks'] },
    { phase: 'Phase 2 (30-60 days)', focus: ['Non-functional controls', 'Governance workflow', 'Integration sync hardening'] },
    { phase: 'Phase 3 (60-90 days)', focus: ['Portfolio analytics', 'Compliance evidence', 'Executive export automation'] },
  ];
  if (!gaps.length) return phases;
  phases[0].focus.push(`Address critical gaps: ${gaps.slice(0, 3).join(', ')}`);
  return phases;
}

function applyDeterministicOps(currentData, operations) {
  const data = JSON.parse(JSON.stringify(currentData || { nodes: [], links: [] }));
  const nodeById = new Map((data.nodes || []).map((n) => [n.id, n]));
  const linkSet = new Set((data.links || []).map((l) => `${l.from}->${l.to}`));
  const fieldClock = new Map();

  const sorted = [...operations].sort((a, b) => {
    if ((a.ts || '') !== (b.ts || '')) return (a.ts || '').localeCompare(b.ts || '');
    return String(a.opId || '').localeCompare(String(b.opId || ''));
  });

  sorted.forEach((op) => {
    const opKey = String(op.opId || `${op.actor || 'anon'}:${op.ts || ''}`);
    if (op.type === 'node:add' && op.node?.id) {
      if (!nodeById.has(op.node.id)) {
        const n = { ...op.node };
        data.nodes.push(n);
        nodeById.set(n.id, n);
      }
      return;
    }

    if (op.type === 'node:update' && op.nodeId && op.patch) {
      const node = nodeById.get(op.nodeId);
      if (!node) return;
      Object.entries(op.patch).forEach(([k, v]) => {
        const ck = `${op.nodeId}:${k}`;
        const prev = fieldClock.get(ck);
        if (!prev || opKey > prev) {
          node[k] = v;
          fieldClock.set(ck, opKey);
        }
      });
      return;
    }

    if (op.type === 'node:remove' && op.nodeId) {
      const idx = data.nodes.findIndex((n) => n.id === op.nodeId);
      if (idx >= 0) data.nodes.splice(idx, 1);
      nodeById.delete(op.nodeId);
      data.links = data.links.filter((l) => l.from !== op.nodeId && l.to !== op.nodeId);
      return;
    }

    if (op.type === 'link:add' && op.link?.from && op.link?.to) {
      const lk = `${op.link.from}->${op.link.to}`;
      if (!linkSet.has(lk)) {
        data.links.push({ from: op.link.from, to: op.link.to });
        linkSet.add(lk);
      }
      return;
    }

    if (op.type === 'link:remove' && op.link?.from && op.link?.to) {
      const lk = `${op.link.from}->${op.link.to}`;
      data.links = data.links.filter((l) => `${l.from}->${l.to}` !== lk);
      linkSet.delete(lk);
    }
  });

  return data;
}

function createWave3Router({ broadcastBoard }) {
  const router = require('express').Router();

  router.post('/collab/boards/:id/patches', requireRole('admin', 'architect'), async (req, res) => {
    const boardId = Number(req.params.id);
    const { baseVersion = 0, operations = [] } = req.body || {};
    const board = await get('SELECT * FROM boards WHERE id = ?', [boardId]);
    if (!board) return res.status(404).json({ error: 'Board not found' });

    const state = await get('SELECT * FROM collab_state WHERE board_id = ?', [boardId]);
    const serverVersion = state?.server_version || 0;

    const incoming = [];
    for (const op of operations) {
      const opId = String(op.opId || '');
      if (!opId) continue;
      const seen = await get('SELECT op_id FROM collab_ops WHERE board_id = ? AND op_id = ?', [boardId, opId]);
      if (seen) continue;
      await run(
        'INSERT INTO collab_ops (board_id, op_id, actor, base_version, op_json, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [boardId, opId, op.actor || req.user.username, baseVersion, JSON.stringify(op), nowIso()]
      );
      incoming.push(op);
    }

    const current = safeParse(board.data_json, { nodes: [], links: [] });
    const merged = applyDeterministicOps(current, incoming);
    const nextVersion = serverVersion + 1;

    await run('UPDATE boards SET data_json = ?, updated_at = ? WHERE id = ?', [JSON.stringify(merged), nowIso(), boardId]);
    await run(
      'INSERT INTO board_versions (board_id, version_number, data_json, summary, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [boardId, nextVersion, JSON.stringify(merged), `Wave3 patch merge (${incoming.length} ops)`, req.user.id, nowIso()]
    );
    await run(
      `INSERT INTO collab_state (board_id, server_version, last_patch_hash, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(board_id) DO UPDATE SET server_version = excluded.server_version, last_patch_hash = excluded.last_patch_hash, updated_at = excluded.updated_at`,
      [boardId, nextVersion, `${incoming.length}:${nextVersion}`, nowIso()]
    );

    broadcastBoard(boardId, { type: 'board:patch:merged', boardId, serverVersion: nextVersion, by: req.user.username, data: merged });
    res.json({ ok: true, baseVersion, serverVersion: nextVersion, acceptedOps: incoming.length, data: merged });
  });

  router.get('/auth/sso/config', requireRole('admin'), async (req, res) => {
    const rows = await all('SELECT provider, protocol, issuer, client_id, metadata_url, enabled, updated_at FROM sso_configs ORDER BY provider');
    res.json({ providers: rows.map((r) => ({ ...r, client_secret: '***' })) });
  });

  router.post('/auth/sso/config', requireRole('admin'), async (req, res) => {
    try {
      const validated = validateSsoConfig(req.body || {});
      const strictDiscovery = (req.body || {}).strictDiscovery !== false;
      let discovery = null;
      if (validated.protocol === 'oidc' && strictDiscovery) {
        discovery = await discoverOidcMetadata(validated.metadataUrl);
        if (String(discovery.issuer).replace(/\/$/, '') !== validated.issuer) {
          return res.status(400).json({ error: 'OIDC discovery issuer mismatch' });
        }
      }

      await run(
        `INSERT INTO sso_configs (provider, protocol, issuer, client_id, client_secret, metadata_url, enabled, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(provider) DO UPDATE SET protocol=excluded.protocol, issuer=excluded.issuer, client_id=excluded.client_id, client_secret=excluded.client_secret, metadata_url=excluded.metadata_url, enabled=excluded.enabled, updated_at=excluded.updated_at`,
        [validated.provider, validated.protocol, validated.issuer, validated.clientId, validated.clientSecret, validated.metadataUrl, validated.enabled ? 1 : 0, nowIso(), nowIso()]
      );
      res.json({ ok: true, provider: validated.provider, protocol: validated.protocol, enabled: !!validated.enabled, strictDiscovery, discoveryValidated: !!discovery });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  router.post('/auth/sso/provision', requireRole('admin'), async (req, res) => {
    const { orgKey, orgName, userEmail, role = 'viewer', displayName = '' } = req.body || {};
    if (!orgKey || !orgName || !userEmail) return res.status(400).json({ error: 'orgKey, orgName, userEmail required' });

    await run(
      `INSERT INTO orgs (org_key, name, status, created_at, updated_at) VALUES (?, ?, 'active', ?, ?)
       ON CONFLICT(org_key) DO UPDATE SET name=excluded.name, updated_at=excluded.updated_at`,
      [orgKey, orgName, nowIso(), nowIso()]
    );
    const org = await get('SELECT * FROM orgs WHERE org_key = ?', [orgKey]);
    await run(
      `INSERT INTO provisioned_users (org_id, email, display_name, role, auth_source, external_subject, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'sso', ?, ?, ?)
       ON CONFLICT(org_id, email) DO UPDATE SET display_name=excluded.display_name, role=excluded.role, updated_at=excluded.updated_at`,
      [org.id, userEmail, displayName || userEmail, role, `sso:${userEmail}`, nowIso(), nowIso()]
    );
    await run('INSERT INTO provisioning_logs (org_id, email, action, status, details_json, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [org.id, userEmail, 'upsert', 'success', JSON.stringify({ role }), nowIso()]);
    const user = await get('SELECT * FROM provisioned_users WHERE org_id = ? AND email = ?', [org.id, userEmail]);
    res.json({ ok: true, org, user });
  });

  router.post('/governance/policies', requireRole('admin', 'architect'), async (req, res) => {
    const { name, stages = [], slaHours = 24, exceptionAllowed = true } = req.body || {};
    if (!name || !Array.isArray(stages) || !stages.length) return res.status(400).json({ error: 'name and stages[] required' });
    const r = await run('INSERT INTO governance_policies (name, stages_json, sla_hours, exception_allowed, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [name, JSON.stringify(stages), slaHours, exceptionAllowed ? 1 : 0, req.user.id, nowIso()]);
    res.status(201).json(await get('SELECT * FROM governance_policies WHERE id = ?', [r.lastID]));
  });

  router.post('/governance/boards/:id/start', requireRole('admin', 'architect'), async (req, res) => {
    const boardId = Number(req.params.id);
    const { policyId } = req.body || {};
    const policy = await get('SELECT * FROM governance_policies WHERE id = ?', [policyId]);
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    const inst = await run(
      'INSERT INTO governance_instances (board_id, policy_id, current_stage_index, status, started_at, updated_at) VALUES (?, ?, 0, ?, ?, ?)',
      [boardId, policyId, 'pending', nowIso(), nowIso()]
    );
    const stages = safeParse(policy.stages_json, []);
    await run('INSERT INTO governance_actions (instance_id, action_type, actor, notes, sla_due_at, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [inst.lastID, 'start', req.user.id, `Stage: ${stages[0]?.name || 'N/A'}`, new Date(Date.now() + (policy.sla_hours * 3600 * 1000)).toISOString(), nowIso()]
    );
    res.json({ ok: true, instanceId: inst.lastID, currentStage: stages[0] || null });
  });

  router.post('/governance/instances/:id/action', requireRole('admin', 'architect'), async (req, res) => {
    const { action, notes = '' } = req.body || {};
    const inst = await get('SELECT * FROM governance_instances WHERE id = ?', [req.params.id]);
    if (!inst) return res.status(404).json({ error: 'Instance not found' });
    const policy = await get('SELECT * FROM governance_policies WHERE id = ?', [inst.policy_id]);
    const stages = safeParse(policy.stages_json, []);
    let idx = inst.current_stage_index;
    let status = inst.status;

    if (action === 'approve') {
      idx += 1;
      status = idx >= stages.length ? 'approved' : 'pending';
    } else if (action === 'reject') {
      status = 'rejected';
    } else if (action === 'exception' && policy.exception_allowed) {
      status = 'exception-approved';
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    await run('UPDATE governance_instances SET current_stage_index = ?, status = ?, updated_at = ? WHERE id = ?', [idx, status, nowIso(), req.params.id]);
    await run('INSERT INTO governance_actions (instance_id, action_type, actor, notes, sla_due_at, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [req.params.id, action, req.user.id, notes, new Date(Date.now() + (policy.sla_hours * 3600 * 1000)).toISOString(), nowIso()]);
    res.json({ ok: true, status, nextStage: stages[idx] || null });
  });

  router.post('/marketplace/templates/publish', requireRole('admin', 'architect'), async (req, res) => {
    const { name, tags = [], boardData, version = '1.0.0', status = 'pending' } = req.body || {};
    if (!name || !boardData) return res.status(400).json({ error: 'name and boardData required' });
    const tpl = await run('INSERT INTO marketplace_templates (name, owner_id, tags_json, approval_status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [name, req.user.id, JSON.stringify(tags), status, nowIso(), nowIso()]);
    await run('INSERT INTO marketplace_template_versions (template_id, version, board_data_json, changelog, created_at) VALUES (?, ?, ?, ?, ?)',
      [tpl.lastID, version, JSON.stringify(boardData), 'Initial publish', nowIso()]);
    res.json({ ok: true, templateId: tpl.lastID, version });
  });

  router.post('/marketplace/templates/:id/rate', requireRole('admin', 'architect', 'viewer'), async (req, res) => {
    const { rating = 5, comment = '' } = req.body || {};
    await run('INSERT INTO marketplace_ratings (template_id, user_id, rating, comment, created_at) VALUES (?, ?, ?, ?, ?)',
      [req.params.id, req.user.id, Math.max(1, Math.min(5, Number(rating))), comment, nowIso()]);
    const agg = await get('SELECT AVG(rating) AS avgRating, COUNT(*) AS total FROM marketplace_ratings WHERE template_id = ?', [req.params.id]);
    res.json({ ok: true, ...agg });
  });

  router.get('/integrations/settings/:provider', requireRole('admin', 'architect'), async (req, res) => {
    const provider = String(req.params.provider || '');
    const row = await get('SELECT * FROM integration_settings WHERE provider = ?', [provider]);
    if (!row) return res.json({ provider, exists: false });
    res.json({
      provider,
      exists: true,
      baseUrl: row.base_url,
      projectKey: row.project_key,
      apiVersion: row.api_version,
      enabled: !!row.enabled,
      fieldMapping: safeParse(row.field_mapping_json, {}),
      secretRefs: safeParse(row.secret_refs_json, {}),
      updatedAt: row.updated_at,
    });
  });

  router.post('/integrations/settings/:provider', requireRole('admin'), async (req, res) => {
    try {
      const provider = String(req.params.provider || '');
      const validated = validateIntegrationSettings(provider, req.body || {});
      const secretRefs = normalizeCredentialPayload(validated.credentials);
      await run(
        `INSERT INTO integration_settings (provider, base_url, project_key, api_version, enabled, field_mapping_json, secret_refs_json, updated_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(provider) DO UPDATE SET base_url=excluded.base_url, project_key=excluded.project_key, api_version=excluded.api_version, enabled=excluded.enabled, field_mapping_json=excluded.field_mapping_json, secret_refs_json=excluded.secret_refs_json, updated_by=excluded.updated_by, updated_at=excluded.updated_at`,
        [provider, validated.baseUrl, validated.projectKey, validated.apiVersion, validated.enabled ? 1 : 0, JSON.stringify(validated.fieldMapping), JSON.stringify(secretRefs), req.user.id, nowIso(), nowIso()]
      );
      res.json({ ok: true, provider, enabled: validated.enabled, secretRefs });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  router.post('/integrations/sync/mapping', requireRole('admin', 'architect'), async (req, res) => {
    const { boardId, provider, mapping = {}, direction = 'bidirectional' } = req.body || {};
    if (!boardId || !provider) return res.status(400).json({ error: 'boardId and provider required' });
    await run(
      `INSERT INTO integration_mappings (board_id, provider, direction, mapping_json, enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, ?, ?)
       ON CONFLICT(board_id, provider) DO UPDATE SET direction=excluded.direction, mapping_json=excluded.mapping_json, updated_at=excluded.updated_at`,
      [boardId, provider, direction, JSON.stringify(mapping), nowIso(), nowIso()]
    );
    res.json({ ok: true, boardId, provider });
  });

  router.post('/integrations/sync/queue', requireRole('admin', 'architect'), async (req, res) => {
    const { boardId, provider, payload = {} } = req.body || {};
    if (!boardId || !provider) return res.status(400).json({ error: 'boardId and provider required' });
    const item = await run('INSERT INTO integration_sync_queue (board_id, provider, payload_json, status, retry_count, next_retry_at, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?, ?)',
      [boardId, provider, JSON.stringify(payload), 'queued', nowIso(), nowIso(), nowIso()]);
    res.json({ ok: true, queueId: item.lastID });
  });

  router.post('/integrations/sync/queue/:id/process', requireRole('admin', 'architect'), async (req, res) => {
    const { simulate = 'success' } = req.body || {};
    const q = await get('SELECT * FROM integration_sync_queue WHERE id = ?', [req.params.id]);
    if (!q) return res.status(404).json({ error: 'Queue item not found' });

    if (simulate === 'conflict') {
      await run('UPDATE integration_sync_queue SET status = ?, updated_at = ? WHERE id = ?', ['conflict', nowIso(), req.params.id]);
      await run('INSERT INTO integration_conflict_logs (queue_id, board_id, provider, conflict_json, resolved, created_at) VALUES (?, ?, ?, ?, 0, ?)',
        [req.params.id, q.board_id, q.provider, JSON.stringify({ reason: 'Remote changed same field' }), nowIso()]);
      return res.json({ ok: true, status: 'conflict' });
    }

    if (simulate === 'fail') {
      const retries = (q.retry_count || 0) + 1;
      await run('UPDATE integration_sync_queue SET status = ?, retry_count = ?, next_retry_at = ?, updated_at = ? WHERE id = ?',
        ['retry', retries, new Date(Date.now() + retries * 60000).toISOString(), nowIso(), req.params.id]);
      return res.json({ ok: true, status: 'retry', retryCount: retries });
    }

    await run('UPDATE integration_sync_queue SET status = ?, updated_at = ? WHERE id = ?', ['done', nowIso(), req.params.id]);
    res.json({ ok: true, status: 'done' });
  });

  router.post('/compliance/mappings', requireRole('admin', 'architect'), async (req, res) => {
    const { boardId, framework, controlId, controlTitle, status = 'mapped', evidenceLinks = [] } = req.body || {};
    if (!boardId || !framework || !controlId) return res.status(400).json({ error: 'boardId, framework, controlId required' });
    await run('INSERT INTO compliance_mappings (board_id, framework, control_id, control_title, mapping_status, evidence_links_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [boardId, framework, controlId, controlTitle || controlId, status, JSON.stringify(evidenceLinks), nowIso(), nowIso()]);
    res.json({ ok: true });
  });

  router.get('/analytics/portfolio', requireRole('admin', 'architect', 'viewer'), async (req, res) => {
    const boards = await all('SELECT id, name, data_json, updated_at FROM boards ORDER BY id DESC LIMIT 100');
    const byBoard = await Promise.all(boards.map(async (b) => {
      const metrics = computeBoardMetrics(b);
      const versions = await all('SELECT version_number, data_json FROM board_versions WHERE board_id = ? ORDER BY version_number ASC', [b.id]);
      const trend = versions.slice(-12).map((v) => ({ version: v.version_number, risk: computeBoardMetrics({ data_json: v.data_json }).currentRiskScore }));
      const n = trend.length;
      const slope = n > 1 ? (trend[n - 1].risk - trend[0].risk) / (n - 1) : 0;
      const forecastRisk = Math.max(1, Math.min(100, Math.round((trend[n - 1]?.risk || metrics.currentRiskScore) + slope * 3)));
      return { boardId: b.id, boardName: b.name, metrics, trend, forecastRisk };
    }));

    const summary = {
      boards: byBoard.length,
      avgCompleteness: Math.round(byBoard.reduce((a, b) => a + b.metrics.architectureCompleteness, 0) / Math.max(1, byBoard.length)),
      avgRisk: Math.round(byBoard.reduce((a, b) => a + b.metrics.currentRiskScore, 0) / Math.max(1, byBoard.length)),
      avgForecastRisk: Math.round(byBoard.reduce((a, b) => a + b.forecastRisk, 0) / Math.max(1, byBoard.length)),
    };
    res.json({ summary, boards: byBoard });
  });

  router.get('/exports/branding', requireRole('admin', 'architect', 'viewer'), async (req, res) => {
    res.json({ branding: loadBranding() });
  });

  router.put('/exports/branding', requireRole('admin'), async (req, res) => {
    const current = loadBranding();
    const next = {
      ...current,
      ...(req.body || {}),
      colors: { ...(current.colors || {}), ...((req.body || {}).colors || {}) },
      exportTheme: { ...(current.exportTheme || {}), ...((req.body || {}).exportTheme || {}) },
    };
    saveBranding(next);
    res.json({ ok: true, branding: next });
  });

  router.post('/exports/board/:id', requireRole('admin', 'architect', 'viewer'), async (req, res) => {
    const board = await get('SELECT * FROM boards WHERE id = ?', [req.params.id]);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    const data = safeParse(board.data_json, { nodes: [], links: [] });
    const metrics = computeBoardMetrics(board);
    const branding = loadBranding();
    const title = renderTemplate(branding.exportTheme.titleTemplate, branding);
    const footer = renderTemplate(branding.exportTheme.footerTemplate, branding);
    const narrative = [
      `# ${title}`,
      '',
      `## Board: ${board.name}`,
      `- Completeness: ${metrics.architectureCompleteness}%`,
      `- Release readiness: ${metrics.releaseReadiness}%`,
      `- Current risk score: ${metrics.currentRiskScore}`,
      `- Components: ${data.nodes.length}, Dependencies: ${data.links.length}`,
      '',
      '## Recommended Storyline',
      '1. Current quality architecture baseline',
      '2. Governance and compliance posture',
      '3. Integration and delivery risk trajectory',
      '4. 90-day improvement roadmap',
      '',
      `---\n${footer}`,
    ].join('\n');

    res.json({
      boardId: board.id,
      branding,
      exports: {
        pdfArtifact: { type: 'pdf-ready-markdown', theme: branding.exportTheme.pptSlideTheme, content: narrative },
        pptArtifact: {
          type: 'ppt-ready-outline',
          theme: branding.exportTheme.pptSlideTheme,
          slides: [
            `${title} - KPI snapshot`,
            'Architecture coverage and test depth',
            'Risk trend and forecast',
            'Roadmap, dependencies, executive asks',
          ],
        },
        jsonArtifact: { board: data, metrics, branding },
      },
    });
  });

  router.post('/ai/draft-from-requirements', requireRole('admin', 'architect'), async (req, res) => {
    const { requirementText = '', requirementFileContent = '' } = req.body || {};
    const text = `${requirementText}\n${requirementFileContent}`.toLowerCase();
    if (!text.trim()) return res.status(400).json({ error: 'requirementText or requirementFileContent required' });

    const componentMap = [
      ['Requirements', ['requirement', 'user story', 'acceptance']],
      ['Test Strategy', ['strategy', 'quality gate']],
      ['Test Cases', ['scenario', 'test case']],
      ['API Testing', ['api', 'service', 'endpoint']],
      ['UI Testing', ['ui', 'frontend', 'screen']],
      ['Security', ['security', 'owasp', 'vulnerability']],
      ['Performance', ['performance', 'latency', 'load']],
      ['Accessibility', ['accessibility', 'wcag', 'a11y']],
      ['CI/CD', ['pipeline', 'deploy', 'cicd']],
      ['Release Gate', ['release', 'approval', 'go-live']],
    ];

    const picked = componentMap.filter(([, keys]) => keys.some((k) => text.includes(k))).map(([c]) => c);
    const nodes = (picked.length ? picked : ['Requirements', 'Test Strategy', 'Test Cases', 'CI/CD', 'Release Gate'])
      .map((c, i) => ({ id: `ai_${i + 1}`, type: c, label: c, x: 80 + (i % 4) * 220, y: 80 + Math.floor(i / 4) * 160 }));
    const links = nodes.slice(1).map((n, i) => ({ from: nodes[i].id, to: n.id }));

    const critical = ['Security', 'Performance', 'Accessibility'];
    const gaps = critical.filter((c) => !picked.includes(c));

    res.json({
      draftBoard: { nodes, links },
      gapReport: gaps.map((g) => ({ area: g, severity: 'high', recommendation: `Add ${g} block with measurable gate` })),
      roadmap: buildRoadmap(gaps),
      summary: `Generated draft with ${nodes.length} components from requirement input.`,
    });
  });

  return router;
}

module.exports = { createWave3Router };