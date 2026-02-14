function safeParse(json, fallback) {
  try { return JSON.parse(json); } catch { return fallback; }
}

function computeBoardMetrics(board) {
  const data = typeof board.data_json === 'string' ? safeParse(board.data_json, { nodes: [], links: [] }) : board.data_json;
  const nodes = data.nodes || [];
  const links = data.links || [];
  const types = new Set(nodes.map((n) => n.type));

  const critical = ['Requirements', 'Test Strategy', 'Test Cases', 'API Testing', 'UI Testing', 'Security', 'Performance', 'Accessibility', 'CI/CD', 'Release Gate'];
  const represented = critical.filter((c) => types.has(c)).length;
  const architectureCompleteness = Math.round((represented / critical.length) * 100);

  const automationReadiness = Math.min(100,
    (types.has('Automation Framework') ? 25 : 0)
    + (types.has('CI/CD') ? 25 : 0)
    + (types.has('API Testing') ? 20 : 0)
    + (types.has('UI Testing') ? 20 : 0)
    + (types.has('Reporting Dashboard') ? 10 : 0)
  );

  const connectivity = links.length / Math.max(1, nodes.length);
  const releaseReadiness = Math.max(0, Math.min(100,
    20
    + (types.has('Release Gate') ? 25 : 0)
    + (types.has('CI/CD') ? 20 : 0)
    + (types.has('Security') ? 15 : 0)
    + (types.has('Performance') ? 10 : 0)
    + Math.round(connectivity * 10)
  ));

  const risk = Math.max(5, Math.min(100,
    100 - Math.round(architectureCompleteness * 0.6) + (types.has('Security') ? 0 : 10) + (types.has('Release Gate') ? 0 : 8)
  ));

  return {
    architectureCompleteness,
    automationReadiness,
    releaseReadiness,
    currentRiskScore: risk,
  };
}

function diffBoards(prev, next) {
  const p = typeof prev === 'string' ? safeParse(prev, { nodes: [], links: [] }) : prev;
  const n = typeof next === 'string' ? safeParse(next, { nodes: [], links: [] }) : next;

  const pNodes = new Set((p.nodes || []).map((x) => x.id || `${x.type}:${x.label}`));
  const nNodes = new Set((n.nodes || []).map((x) => x.id || `${x.type}:${x.label}`));

  const addedNodes = [...nNodes].filter((id) => !pNodes.has(id));
  const removedNodes = [...pNodes].filter((id) => !nNodes.has(id));

  const pLinks = new Set((p.links || []).map((l) => `${l.from}->${l.to}`));
  const nLinks = new Set((n.links || []).map((l) => `${l.from}->${l.to}`));

  const addedLinks = [...nLinks].filter((id) => !pLinks.has(id));
  const removedLinks = [...pLinks].filter((id) => !nLinks.has(id));

  return { addedNodes, removedNodes, addedLinks, removedLinks };
}

module.exports = { computeBoardMetrics, diffBoards, safeParse };
