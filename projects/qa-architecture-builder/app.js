const canvas = document.getElementById('canvas');
const qualityMatrix = document.getElementById('qualityMatrix');
const importJson = document.getElementById('importJson');
const riskScoreEl = document.getElementById('riskScore');
const riskLabelEl = document.getElementById('riskLabel');
const strategyOutput = document.getElementById('strategyOutput');
const effortOutput = document.getElementById('effortOutput');
const validationOutput = document.getElementById('validationOutput');
const simulationOutput = document.getElementById('simulationOutput');
const aiOutput = document.getElementById('aiOutput');
const blueprintSummary = document.getElementById('blueprintSummary');

let state = { nodes: [], links: [] };
let selectedForLink = null;
let dragMeta = null;
let history = [];
let future = [];

const environmentGuidance = {
  dev: 'Fast feedback, shift-left checks, lightweight gates.',
  qa: 'Functional + integration depth with stable data and repeatability.',
  uat: 'Business scenario validation and traceable sign-off.',
  staging: 'Production-like validation including non-functional and deployment checks.',
  prod: 'Risk-controlled smoke, observability and rollback readiness.'
};

const agileTemplates = {
  'scrum-sprint': {
    name: 'Scrum Sprint QA Template',
    nodes: [
      ['Requirements', 60, 70], ['Test Strategy', 280, 70], ['Test Cases', 500, 70], ['Test Data', 720, 70],
      ['API Testing', 220, 250], ['UI Testing', 440, 250], ['Automation Framework', 660, 250],
      ['CI/CD', 440, 430], ['Reporting Dashboard', 660, 430], ['Release Gate', 660, 560]
    ],
    links: [[0,1],[1,2],[2,4],[2,5],[3,4],[5,6],[4,7],[6,7],[7,8],[8,9]]
  },
  'kanban-flow': {
    name: 'Kanban Continuous QA Template',
    nodes: [
      ['Requirements', 60, 70], ['Test Cases', 280, 70], ['API Testing', 500, 70], ['UI Testing', 720, 70],
      ['Automation Framework', 220, 250], ['CI/CD', 440, 250], ['Security', 660, 250],
      ['Performance', 220, 430], ['Reporting Dashboard', 440, 430], ['Release Gate', 660, 430]
    ],
    links: [[0,1],[1,2],[1,3],[2,4],[3,4],[4,5],[5,6],[5,7],[6,9],[7,9],[5,8],[8,9]]
  },
  'safe-release-train': {
    name: 'SAFe Release Train QA Template',
    nodes: [
      ['Requirements', 60, 70], ['Test Strategy', 280, 70], ['Test Cases', 500, 70], ['Test Data', 720, 70],
      ['API Testing', 220, 250], ['UI Testing', 440, 250], ['Performance', 660, 250], ['Security', 880, 250],
      ['Automation Framework', 220, 430], ['CI/CD', 440, 430], ['Reporting Dashboard', 660, 430], ['Release Gate', 880, 430]
    ],
    links: [[0,1],[1,2],[2,4],[2,5],[2,6],[2,7],[3,4],[4,8],[5,8],[8,9],[9,10],[6,11],[7,11],[10,11]]
  }
};

const referenceTemplates = [
  {
    name: 'Enterprise Web/API QA E2E',
    category: 'full',
    nodes: [
      ['Requirements', 70, 70], ['Test Strategy', 300, 70], ['Test Cases', 530, 70],
      ['Test Data', 760, 70], ['API Testing', 240, 230], ['UI Testing', 460, 230],
      ['Automation Framework', 680, 230], ['CI/CD', 460, 380], ['Reporting Dashboard', 680, 380],
      ['Security', 240, 380], ['Performance', 240, 520], ['Accessibility', 460, 520], ['Release Gate', 680, 520]
    ],
    links: [[0,1],[1,2],[2,4],[2,5],[3,4],[4,7],[5,7],[6,7],[7,8],[9,12],[10,12],[11,12],[8,12]]
  },
  {
    name: 'Mobile App QA Architecture',
    category: 'full',
    nodes: [
      ['Requirements', 70, 70], ['Test Strategy', 320, 70], ['Test Cases', 570, 70],
      ['Test Data', 820, 70], ['UI Testing', 300, 250], ['API Testing', 520, 250],
      ['Performance', 740, 250], ['Security', 300, 430], ['Accessibility', 520, 430],
      ['CI/CD', 740, 430], ['Reporting Dashboard', 520, 560], ['Release Gate', 740, 560]
    ],
    links: [[0,1],[1,2],[2,4],[2,5],[2,6],[5,9],[4,9],[6,9],[7,11],[8,11],[9,10],[10,11]]
  },
  {
    name: 'Data/ETL QA Architecture',
    category: 'full',
    nodes: [
      ['Requirements', 70, 70], ['Test Strategy', 320, 70], ['Test Cases', 570, 70],
      ['Test Data', 820, 70], ['API Testing', 280, 250], ['Performance', 520, 250],
      ['Security', 760, 250], ['Automation Framework', 280, 430], ['CI/CD', 520, 430],
      ['Reporting Dashboard', 760, 430], ['Release Gate', 760, 560]
    ],
    links: [[0,1],[1,2],[2,3],[2,4],[2,5],[2,6],[4,7],[5,8],[6,8],[7,8],[8,9],[9,10]]
  }
];

const matrixRules = [
  ['Requirements', 'Traceability to tests'],
  ['Test Strategy', 'Coverage model defined'],
  ['Test Cases', 'Functional completeness'],
  ['Test Data', 'Data quality and masking'],
  ['API Testing', 'Contract and response validation'],
  ['UI Testing', 'Critical path automation'],
  ['Performance', 'Load/stress baseline'],
  ['Security', 'SAST/DAST checks'],
  ['Accessibility', 'WCAG baseline'],
  ['CI/CD', 'Gated execution'],
  ['Reporting Dashboard', 'Live quality metrics'],
  ['Release Gate', 'Go/No-Go governance']
];

const laneNames = ['Plan', 'Design', 'Build', 'Validate', 'Release'];

const laneMap = {
  Requirements: 0,
  'Test Strategy': 0,
  'Test Cases': 1,
  'Test Data': 1,
  'Automation Framework': 1,
  'API Testing': 2,
  'UI Testing': 2,
  Performance: 2,
  Security: 2,
  Accessibility: 2,
  'CI/CD': 3,
  'Defect Tracking': 3,
  'Reporting Dashboard': 3,
  'Release Gate': 4,
};

function laneY(i) {
  const h = canvas.clientHeight || 700;
  return Math.floor((h / laneNames.length) * i);
}

function uid() {
  return 'n_' + Math.random().toString(36).slice(2, 10);
}

function createNode(type, x, y) {
  return { id: uid(), type, label: type, x, y };
}

function templateToState(tpl) {
  const nodes = tpl.nodes.map(([type, x, y]) => createNode(type, x, y));
  const links = tpl.links.map(([fromIdx, toIdx]) => ({ from: nodes[fromIdx].id, to: nodes[toIdx].id }));
  return { nodes, links };
}

function getTemplateCatalog() {
  const agileCatalog = [
    { ...agileTemplates['scrum-sprint'], category: 'sprint' },
    { ...agileTemplates['kanban-flow'], category: 'sprint' },
    { ...agileTemplates['safe-release-train'], category: 'hybrid' },
  ];
  const fullCatalog = referenceTemplates.map((t) => ({ ...t, category: t.category || 'full' }));
  return [...fullCatalog, ...agileCatalog];
}

function refreshTemplateOptions() {
  const category = document.getElementById('templateCategory')?.value || 'all';
  const catalog = getTemplateCatalog().filter((t) => category === 'all' || t.category === category);
  const select = document.getElementById('referenceTemplate');
  select.innerHTML = '';
  catalog.forEach((t) => {
    const opt = document.createElement('option');
    opt.value = t.name;
    opt.textContent = `${t.name} [${t.category.toUpperCase()}]`;
    select.appendChild(opt);
  });
}

function applyReferenceTemplateByName(name) {
  const tpl = getTemplateCatalog().find((t) => t.name === name);
  if (!tpl) return;
  snapshot();
  state = templateToState(tpl);
  selectedForLink = null;
  render();
  strategyOutput.textContent = generateStrategyText();
  renderEffort();
  validateArchitecture();
}

function snapshot() {
  history.push(JSON.stringify(state));
  if (history.length > 100) history.shift();
  future = [];
}

function restore(serialized) {
  state = JSON.parse(serialized);
  selectedForLink = null;
  render();
  strategyOutput.textContent = generateStrategyText();
  renderEffort();
  validateArchitecture();
}

function renderMatrix() {
  qualityMatrix.innerHTML = '';
  const set = new Set(state.nodes.map((n) => n.type));
  matrixRules.forEach(([k, v]) => {
    const li = document.createElement('li');
    li.innerHTML = `${set.has(k) ? '✅' : '⬜'} <b>${k}</b>: ${v}`;
    qualityMatrix.appendChild(li);
  });

  const coverage = [...set].length;
  const penalty =
    (state.links.length < Math.max(1, state.nodes.length - 2) ? 20 : 0) +
    (set.has('Security') ? 0 : 15) +
    (set.has('Performance') ? 0 : 10) +
    (set.has('Release Gate') ? 0 : 10);
  const risk = Math.max(5, Math.min(100, 100 - coverage * 6 + penalty));
  riskScoreEl.textContent = risk;
  riskLabelEl.textContent =
    risk < 35 ? 'Low risk architecture' : risk < 65 ? 'Moderate risk architecture' : 'High risk architecture';
}

function renderEffort() {
  const t = state.nodes.map((n) => n.type);
  const has = (x) => t.includes(x);
  const effort = [
    ['Functional', has('Test Cases') ? 6 : 2],
    ['API', has('API Testing') ? 5 : 1],
    ['UI', has('UI Testing') ? 5 : 1],
    ['Performance', has('Performance') ? 4 : 0],
    ['Security', has('Security') ? 4 : 0],
    ['Accessibility', has('Accessibility') ? 3 : 0],
    ['Automation Framework', has('Automation Framework') ? 5 : 2],
    ['CI/CD Integration', has('CI/CD') ? 3 : 1],
  ];
  const total = effort.reduce((a, [, v]) => a + v, 0);
  effortOutput.textContent = [
    'Estimated QA effort (person-days):',
    ...effort.map(([k, v]) => `- ${k}: ${v}`),
    '',
    `Total Estimated Effort: ${total} PD`,
  ].join('\n');
}

function validateArchitecture() {
  const types = state.nodes.map((n) => n.type);
  const has = (x) => types.includes(x);
  const issues = [];
  if (!has('Requirements')) issues.push('Missing Requirements block');
  if (!has('Test Strategy')) issues.push('Missing Test Strategy block');
  if (!has('Test Cases')) issues.push('Missing Test Cases block');
  if (!has('CI/CD')) issues.push('Missing CI/CD integration block');
  if (!has('Release Gate')) issues.push('Missing Release Gate block');
  if (state.links.length < Math.max(1, state.nodes.length - 2)) issues.push('Insufficient architecture connectivity');

  validationOutput.textContent = issues.length
    ? ['Validation Result: Needs Improvement', ...issues.map((i) => `- ${i}`)].join('\n')
    : 'Validation Result: PASS\n- Architecture includes key QA controls and connectivity.';
}

function detectAntiPatterns() {
  const types = state.nodes.map((n) => n.type);
  const has = (x) => types.includes(x);
  const anti = [];
  if (has('Automation Framework') && !has('Test Strategy')) anti.push('Automation-first without strategy baseline');
  if (has('CI/CD') && !has('Release Gate')) anti.push('CI/CD present but no formal release gate');
  if (has('Test Cases') && !has('Test Data')) anti.push('Test cases without explicit test data management');
  if (!has('Security') || !has('Performance') || !has('Accessibility')) anti.push('Missing non-functional testing triad (Security/Performance/Accessibility)');
  if (state.links.length < Math.max(1, state.nodes.length - 2)) anti.push('Low architecture connectivity can create silos');
  return anti;
}

function runAICopilotAnalysis(mode) {
  const env = document.getElementById('environmentProfile')?.value || 'qa';
  const types = state.nodes.map((n) => n.type);
  const has = (x) => types.includes(x);
  const linkDensity = state.links.length / Math.max(1, state.nodes.length);
  const anti = detectAntiPatterns();

  if (mode === 'risk') {
    const topRisks = [
      !has('Security') && 'Security validation is missing from architecture',
      !has('Performance') && 'Performance baseline is not represented',
      !has('Release Gate') && 'Release governance control is absent',
      linkDensity < 0.8 && 'Low connectivity may create team silos and handoff failures',
    ].filter(Boolean);
    return ['AI Copilot · Risk Advisor', `- Environment: ${env.toUpperCase()} (${environmentGuidance[env]})`, ...topRisks.map((r) => `- ${r}`), '', topRisks.length ? 'Recommendation: prioritize controls before scaling automation.' : 'Risk posture looks balanced.'].join('\n');
  }

  if (mode === 'coverage') {
    const critical = ['Requirements','Test Strategy','Test Cases','API Testing','UI Testing','Security','Performance','Accessibility','CI/CD','Release Gate'];
    const missing = critical.filter((c) => !has(c));
    return ['AI Copilot · Coverage Optimizer', `- Critical coverage represented: ${critical.length - missing.length}/${critical.length}`, ...(missing.length ? missing.map((m) => `- Add missing area: ${m}`) : ['- Coverage is comprehensive across critical QA domains.'])].join('\n');
  }

  if (mode === 'automation') {
    const score = (has('Automation Framework') ? 25 : 0) + (has('CI/CD') ? 25 : 0) + (has('API Testing') ? 20 : 0) + (has('UI Testing') ? 20 : 0) + (has('Reporting Dashboard') ? 10 : 0);
    return ['AI Copilot · Automation Planner', `- Automation readiness score: ${score}/100`, `- Suggested next wave: ${score < 60 ? 'Establish framework + CI/CD gate + API suite first.' : 'Expand to flaky analysis, self-healing and release analytics.'}`].join('\n');
  }

  return [
    'AI Copilot · Release Readiness',
    `- Anti-patterns detected: ${anti.length}`,
    anti.length ? `- Blockers: ${anti.join('; ')}` : '- No major blockers detected for release readiness.',
    `- Decision: ${anti.length > 2 ? 'NO-GO until critical controls are addressed.' : 'GO with monitored risk and mitigation plan.'}`,
  ].join('\n');
}

function generateStrategyText() {
  const env = document.getElementById('environmentProfile')?.value || 'qa';
  const types = state.nodes.map((n) => n.type);
  const has = (x) => types.includes(x);
  const areas = [];
  if (has('Requirements')) areas.push('requirements traceability model');
  if (has('Test Strategy')) areas.push('risk-based test strategy definition');
  if (has('Test Cases')) areas.push('functional and negative case coverage');
  if (has('API Testing')) areas.push('API contract and service validation');
  if (has('UI Testing')) areas.push('critical UI journey automation');
  if (has('Performance')) areas.push('performance and load baseline');
  if (has('Security')) areas.push('security validation gates');
  if (has('Accessibility')) areas.push('accessibility compliance checks');
  if (has('CI/CD')) areas.push('CI/CD quality gate orchestration');
  if (has('Release Gate')) areas.push('formal go/no-go release checkpoint');
  const missing = ['Security', 'Performance', 'Accessibility', 'Release Gate'].filter((k) => !has(k));
  const anti = detectAntiPatterns();

  return [
    `QA Architecture Strategy (${state.nodes.length} blocks, ${state.links.length} connections)`,
    `Environment Focus: ${env.toUpperCase()} - ${environmentGuidance[env]}`,
    '',
    '1) Core coverage areas:',
    areas.length ? `- ${areas.join('\n- ')}` : '- Add architecture blocks to generate coverage',
    '',
    '2) Execution approach:',
    '- Shift-left validation from requirements through CI/CD',
    '- Layered testing: API + UI + non-functional + governance',
    '- Evidence-driven reporting via dashboard and release gates',
    '',
    '3) Risk focus:',
    missing.length ? `- Missing controls to prioritize: ${missing.join(', ')}` : '- Critical controls are represented in the architecture board.',
    '',
    '4) Anti-pattern scan:',
    anti.length ? `- ${anti.join('\n- ')}` : '- No major anti-patterns detected in current architecture graph.',
    '',
    '5) Recommended next step:',
    '- Convert this architecture into milestone-based implementation plan with owners and SLAs.',
  ].join('\n');
}

function autoLayout() {
  const groups = [[], [], [], [], []];
  state.nodes.forEach((n) => groups[laneMap[n.type] ?? 2].push(n));
  groups.forEach((arr, lane) => {
    arr.forEach((n, idx) => {
      n.x = 50 + idx * 190;
      n.y = laneY(lane) + 35;
    });
  });
  render();
  renderEffort();
  validateArchitecture();
}

function render() {
  canvas.innerHTML = '';

  laneNames.forEach((name, i) => {
    const lane = document.createElement('div');
    lane.className = 'lane';
    lane.style.top = `${laneY(i)}px`;
    lane.style.height = `${Math.floor((canvas.clientHeight || 700) / laneNames.length)}px`;
    lane.textContent = name;
    canvas.appendChild(lane);
  });

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('links');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');

  state.links.forEach((l) => {
    const a = state.nodes.find((n) => n.id === l.from);
    const b = state.nodes.find((n) => n.id === l.to);
    if (!a || !b) return;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', a.x + 80);
    line.setAttribute('y1', a.y + 24);
    line.setAttribute('x2', b.x + 80);
    line.setAttribute('y2', b.y + 24);
    line.setAttribute('stroke', '#7dd3fc');
    line.setAttribute('stroke-width', '2');
    svg.appendChild(line);
  });
  canvas.appendChild(svg);

  state.nodes.forEach((node) => {
    const el = document.createElement('div');
    el.className = 'node';
    if (selectedForLink === node.id) el.classList.add('selected');
    el.style.left = `${node.x}px`;
    el.style.top = `${node.y}px`;
    el.dataset.id = node.id;
    el.innerHTML = `<b>${node.label}</b><small>${node.type}</small>`;

    el.onmousedown = (e) => {
      dragMeta = { id: node.id, ox: e.clientX - node.x, oy: e.clientY - node.y };
    };

    el.onclick = (e) => {
      e.stopPropagation();
      if (!selectedForLink) selectedForLink = node.id;
      else if (selectedForLink !== node.id) {
        const exists = state.links.some((l) => l.from === selectedForLink && l.to === node.id);
        if (!exists) {
          snapshot();
          state.links.push({ from: selectedForLink, to: node.id });
        }
        selectedForLink = null;
      } else selectedForLink = null;
      render();
      renderEffort();
      validateArchitecture();
    };

    el.ondblclick = () => {
      const v = prompt('Edit block label', node.label);
      if (v) {
        snapshot();
        node.label = v;
        render();
      }
    };

    el.oncontextmenu = (e) => {
      e.preventDefault();
      snapshot();
      state.links = state.links.filter((l) => l.from !== node.id && l.to !== node.id);
      state.nodes = state.nodes.filter((n) => n.id !== node.id);
      if (selectedForLink === node.id) selectedForLink = null;
      render();
      renderEffort();
      validateArchitecture();
    };

    canvas.appendChild(el);
  });

  renderMatrix();
}

document.addEventListener('mousemove', (e) => {
  if (!dragMeta) return;
  const n = state.nodes.find((x) => x.id === dragMeta.id);
  if (!n) return;
  n.x = Math.max(10, e.clientX - canvas.getBoundingClientRect().left - dragMeta.ox);
  n.y = Math.max(10, e.clientY - canvas.getBoundingClientRect().top - dragMeta.oy);
  render();
});

document.addEventListener('mouseup', () => {
  if (dragMeta) {
    snapshot();
    dragMeta = null;
    renderEffort();
    validateArchitecture();
  }
});

canvas.onclick = () => {
  selectedForLink = null;
  render();
};

document.querySelectorAll('.item').forEach((item) => {
  item.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', item.dataset.type));
});

canvas.addEventListener('dragover', (e) => e.preventDefault());
canvas.addEventListener('drop', (e) => {
  e.preventDefault();
  const type = e.dataTransfer.getData('text/plain');
  const rect = canvas.getBoundingClientRect();
  snapshot();
  state.nodes.push(createNode(type, e.clientX - rect.left, e.clientY - rect.top));
  render();
  renderEffort();
  validateArchitecture();
});

document.getElementById('newBoard').onclick = () => {
  snapshot();
  state = { nodes: [], links: [] };
  selectedForLink = null;
  render();
  strategyOutput.textContent = 'Board cleared. Add components and generate strategy.';
  renderEffort();
  validateArchitecture();
};

document.getElementById('exportJson').onclick = () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'qa-architecture-board.json';
  a.click();
};

document.getElementById('importJsonBtn').onclick = () => importJson.click();
importJson.onchange = async (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  const data = JSON.parse(await f.text());
  snapshot();
  state = { nodes: data.nodes || [], links: data.links || [] };
  render();
  strategyOutput.textContent = generateStrategyText();
  renderEffort();
  validateArchitecture();
};

const referenceTemplateSelect = document.getElementById('referenceTemplate');
refreshTemplateOptions();

document.getElementById('templateCategory').onchange = () => {
  refreshTemplateOptions();
};

document.getElementById('applyReference').onclick = () => {
  applyReferenceTemplateByName(referenceTemplateSelect.value);
};

document.getElementById('applyAgileTemplate').onclick = () => {
  const key = document.getElementById('agileTemplate').value;
  const tpl = agileTemplates[key];
  if (!tpl) return;
  snapshot();
  state = templateToState(tpl);
  render();
  strategyOutput.textContent = generateStrategyText();
  renderEffort();
  validateArchitecture();
  aiOutput.textContent = runAICopilotAnalysis(document.getElementById('aiMode').value || 'risk');
};

document.getElementById('environmentProfile').onchange = () => {
  strategyOutput.textContent = generateStrategyText();
  aiOutput.textContent = runAICopilotAnalysis(document.getElementById('aiMode').value || 'risk');
};

document.getElementById('exportTemplate').onclick = () => {
  const idToIndex = new Map(state.nodes.map((n, i) => [n.id, i]));
  const nodes = state.nodes.map((n) => [n.type, n.x, n.y]);
  const links = state.links
    .map((l) => [idToIndex.get(l.from), idToIndex.get(l.to)])
    .filter(([a, b]) => Number.isInteger(a) && Number.isInteger(b));
  const template = {
    name: `Custom Template ${new Date().toISOString().slice(0, 10)}`,
    nodes,
    links,
  };
  const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'qa-architecture-template.json';
  a.click();
};

const importExternalTemplate = document.getElementById('importExternalTemplate');
document.getElementById('importExternalTemplateBtn').onclick = () => importExternalTemplate.click();
importExternalTemplate.onchange = async (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  const tpl = JSON.parse(await f.text());
  if (!tpl?.nodes || !tpl?.links) {
    alert('Invalid template format. Expected {name,nodes,links}.');
    return;
  }
  snapshot();
  state = templateToState(tpl);
  render();
  strategyOutput.textContent = generateStrategyText();
  renderEffort();
  validateArchitecture();
};

document.getElementById('generateStrategy').onclick = () => {
  strategyOutput.textContent = generateStrategyText();
};

document.getElementById('undoBtn').onclick = () => {
  if (!history.length) return;
  future.push(JSON.stringify(state));
  restore(history.pop());
};

document.getElementById('redoBtn').onclick = () => {
  if (!future.length) return;
  history.push(JSON.stringify(state));
  restore(future.pop());
};

document.getElementById('autoLayoutBtn').onclick = () => {
  snapshot();
  autoLayout();
};

document.getElementById('validateBtn').onclick = () => {
  validateArchitecture();
};

document.getElementById('runAICopilot').onclick = () => {
  const mode = document.getElementById('aiMode').value;
  aiOutput.textContent = runAICopilotAnalysis(mode);
};

document.getElementById('runSimulation').onclick = () => {
  const team = Number(document.getElementById('simTeam').value);
  const release = Number(document.getElementById('simRelease').value);
  const leakage = Number(document.getElementById('simLeakage').value);
  const componentCoverage = new Set(state.nodes.map((n) => n.type)).size;
  const connectivityFactor = Math.min(1, state.links.length / Math.max(1, state.nodes.length));

  const predictedCycle = Math.max(3, (42 - team * 0.9 - componentCoverage * 0.6 + release * 0.7));
  const predictedEscapes = Math.max(1, Math.round(leakage * (1.2 - connectivityFactor) + (12 - componentCoverage * 0.4)));
  const qualityIndex = Math.max(0, Math.min(100, Math.round(100 - predictedEscapes * 2 - predictedCycle * 0.8 + componentCoverage * 1.2)));

  simulationOutput.textContent = [
    'Simulation Result',
    `- Team Capacity: ${team}`,
    `- Release Frequency: ${release}/month`,
    `- Defect Leakage Input: ${leakage}%`,
    '',
    `Predicted Test Cycle Time: ${predictedCycle.toFixed(1)} days`,
    `Predicted Escaped Defects / release: ${predictedEscapes}`,
    `Projected Quality Index: ${qualityIndex}/100`,
    '',
    qualityIndex >= 80 ? 'Recommendation: Architecture is scale-ready.' : 'Recommendation: Strengthen controls (security/performance/release gates) and improve flow connectivity.'
  ].join('\n');
};

document.getElementById('exportBlueprintPack').onclick = () => {
  const blueprint = {
    metadata: {
      exportedAt: new Date().toISOString(),
      app: 'QA Architecture Builder',
      version: '2.0-innovation-pack',
      environment: document.getElementById('environmentProfile')?.value || 'qa'
    },
    board: state,
    strategy: generateStrategyText(),
    effort: effortOutput.textContent,
    validation: validationOutput.textContent,
    simulation: simulationOutput.textContent,
    antiPatterns: detectAntiPatterns(),
    aiCopilot: aiOutput.textContent,
  };
  const blob = new Blob([JSON.stringify(blueprint, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'qa-architecture-blueprint-pack.json';
  a.click();
  blueprintSummary.textContent = `Blueprint exported with ${state.nodes.length} nodes, ${state.links.length} links, anti-patterns: ${detectAntiPatterns().length}.`;
};

// v2 enterprise integration panel (optional; degrades gracefully)
const v2 = {
  token: null,
  boardId: null,
  ws: null,
};

const v2Status = document.getElementById('v2Status');
const v2Dashboard = document.getElementById('v2Dashboard');
const v2Presence = document.getElementById('v2Presence');

async function v2Api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (v2.token) headers.Authorization = `Bearer ${v2.token}`;
  const res = await fetch(path, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${text}`);
  }
  return res.json();
}

async function v2EnsureBoard() {
  if (v2.boardId) return v2.boardId;
  const created = await v2Api('/api/v2/boards', {
    method: 'POST',
    body: JSON.stringify({
      name: `QA Board ${new Date().toISOString().slice(0, 10)}`,
      description: 'Enterprise v2 board snapshot',
      data: state,
    }),
  });
  v2.boardId = created.id;
  return v2.boardId;
}

function connectV2Ws(boardId) {
  if (v2.ws) v2.ws.close();
  const wsProtocol = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${wsProtocol}://${location.host}/ws/v2`);
  v2.ws = ws;

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: 'join', boardId, user: 'architect-ui' }));
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'presence') {
      v2Presence.textContent = `Presence (${msg.users.length}): ${msg.users.join(', ')}`;
    }
    if (msg.type === 'board:update' && msg.by !== 'architect-ui' && msg.data) {
      state = msg.data;
      render();
      renderEffort();
      validateArchitecture();
      strategyOutput.textContent = generateStrategyText();
    }
  };
}

document.getElementById('v2LoginBtn')?.addEventListener('click', async () => {
  try {
    const auth = await v2Api('/api/v2/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'architect', password: 'architect' }),
    });
    v2.token = auth.token;
    v2Status.textContent = `v2 login success as ${auth.user.username} (${auth.user.role})`;
  } catch (e) {
    v2Status.textContent = `v2 login failed: ${e.message}`;
  }
});

document.getElementById('v2SaveBoardBtn')?.addEventListener('click', async () => {
  try {
    const boardId = await v2EnsureBoard();
    await v2Api(`/api/v2/boards/${boardId}`, {
      method: 'PUT',
      body: JSON.stringify({ data: state, summary: 'UI save snapshot' }),
    });
    v2Status.textContent = `Board ${boardId} saved with ${state.nodes.length} nodes.`;

    if (v2.ws?.readyState !== WebSocket.OPEN) connectV2Ws(boardId);
    if (v2.ws?.readyState === WebSocket.OPEN) {
      v2.ws.send(JSON.stringify({ type: 'board:update', data: state }));
    }
  } catch (e) {
    v2Status.textContent = `Save failed: ${e.message}`;
  }
});

document.getElementById('v2LoadDashboardBtn')?.addEventListener('click', async () => {
  try {
    const boardId = await v2EnsureBoard();
    const dash = await v2Api(`/api/v2/dashboard/board/${boardId}`);
    v2Dashboard.textContent = [
      `Board: ${dash.boardId}`,
      `Completeness: ${dash.metrics.architectureCompleteness}%`,
      `Automation readiness: ${dash.metrics.automationReadiness}%`,
      `Release readiness: ${dash.metrics.releaseReadiness}%`,
      `Risk score: ${dash.metrics.currentRiskScore}`,
      `Workflow: ${dash.workflowState}`,
      '',
      'Risk trend (last versions):',
      ...dash.riskTrend.map((r) => `- v${r.version}: ${r.risk}`),
    ].join('\n');
  } catch (e) {
    v2Dashboard.textContent = `Dashboard load failed: ${e.message}`;
  }
});

document.getElementById('v2JiraPushBtn')?.addEventListener('click', async () => {
  try {
    const boardId = await v2EnsureBoard();
    const result = await v2Api(`/api/v2/integrations/jira/push/${boardId}`, { method: 'POST' });
    v2Status.textContent = `Jira push: ${result.message || 'ok'} (${result.mocked ? 'mock' : 'stub'})`;
  } catch (e) {
    v2Status.textContent = `Jira push failed: ${e.message}`;
  }
});

document.getElementById('v2JiraPullBtn')?.addEventListener('click', async () => {
  try {
    const boardId = await v2EnsureBoard();
    const result = await v2Api(`/api/v2/integrations/jira/pull/${boardId}`, { method: 'POST' });
    v2Status.textContent = `Jira pull: ${result.message || 'ok'} (${result.mocked ? 'mock' : 'stub'})`;
  } catch (e) {
    v2Status.textContent = `Jira pull failed: ${e.message}`;
  }
});

// seed board from first reference template
state = templateToState(referenceTemplates[0]);

render();
strategyOutput.textContent = generateStrategyText();
renderEffort();
validateArchitecture();
simulationOutput.textContent = 'Run simulation to see projected QA health.';
blueprintSummary.textContent = 'Export full blueprint pack for governance, planning, and audit review.';
aiOutput.textContent = runAICopilotAnalysis('risk');
