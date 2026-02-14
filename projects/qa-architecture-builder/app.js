const canvas = document.getElementById('canvas');
const qualityMatrix = document.getElementById('qualityMatrix');
const importJson = document.getElementById('importJson');
const riskScoreEl = document.getElementById('riskScore');
const riskLabelEl = document.getElementById('riskLabel');
const strategyOutput = document.getElementById('strategyOutput');
const effortOutput = document.getElementById('effortOutput');
const validationOutput = document.getElementById('validationOutput');

let state = { nodes: [], links: [] };
let selectedForLink = null;
let dragMeta = null;
let history = [];
let future = [];

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

function generateStrategyText() {
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

  return [
    `QA Architecture Strategy (${state.nodes.length} blocks, ${state.links.length} connections)`,
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
    '4) Recommended next step:',
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

// seed board
state.nodes.push(createNode('Requirements', 70, 70));
state.nodes.push(createNode('Test Strategy', 330, 70));
state.nodes.push(createNode('Test Cases', 590, 70));
state.nodes.push(createNode('Automation Framework', 330, 240));
state.nodes.push(createNode('CI/CD', 590, 240));
state.links.push({ from: state.nodes[0].id, to: state.nodes[1].id });
state.links.push({ from: state.nodes[1].id, to: state.nodes[2].id });
state.links.push({ from: state.nodes[1].id, to: state.nodes[3].id });
state.links.push({ from: state.nodes[3].id, to: state.nodes[4].id });

render();
strategyOutput.textContent = generateStrategyText();
renderEffort();
validateArchitecture();
