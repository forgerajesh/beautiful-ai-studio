const PptxGenJS = require('/home/vnc/.openclaw/workspace/.tmp/ppt/node_modules/pptxgenjs');

const out = '/home/vnc/.openclaw/workspace/projects/etl-testing-framework/ETL_AI_Automation_Architecture_Deck.pptx';
const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = 'OpenClaw';
pptx.company = 'ETLQ';
pptx.subject = 'ETL Automation using AI';
pptx.title = 'ETL AI Automation Architecture';

const C = {
  bg: '0B1220',
  card: '111827',
  line: '263244',
  txt: 'E5E7EB',
  mut: '9CA3AF',
  blue: '3B82F6',
  green: '10B981',
  purple: '8B5CF6',
  orange: 'F59E0B'
};

function title(s, t, st) {
  s.background = { color: C.bg };
  s.addText(t, { x: 0.6, y: 0.3, w: 12, h: 0.5, fontSize: 30, bold: true, color: C.txt });
  if (st) s.addText(st, { x: 0.6, y: 0.9, w: 12, h: 0.35, fontSize: 13, color: C.mut });
}
function footer(s) {
  s.addShape(pptx.ShapeType.line, { x: 0.6, y: 7.0, w: 12.1, h: 0, line: { color: C.line, pt: 1 } });
  s.addText('ETLQ Architecture • Confidential', { x: 0.6, y: 7.05, w: 4, h: 0.2, fontSize: 9, color: '6B7280' });
}
function card(s, x, y, w, h, htxt, btxt, hc = C.blue) {
  s.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.08, fill: { color: C.card }, line: { color: C.line, pt: 1 } });
  s.addShape(pptx.ShapeType.roundRect, { x: x + 0.16, y: y + 0.14, w: w - 0.32, h: 0.38, rectRadius: 0.05, fill: { color: hc }, line: { color: hc } });
  s.addText(htxt, { x: x + 0.2, y: y + 0.24, w: w - 0.4, h: 0.2, fontSize: 10.5, bold: true, color: 'FFFFFF', align: 'center' });
  s.addText(btxt, { x: x + 0.2, y: y + 0.62, w: w - 0.4, h: h - 0.72, fontSize: 10.5, color: C.mut, breakLine: true });
}

// 1 Cover
{
  const s = pptx.addSlide();
  title(s, 'ETL Automation using AI', 'Presentable Architecture Deck');
  s.addText('A config-driven, enterprise-ready ETL testing platform with AI triage, intelligent planning, and executive reporting.',
    { x: 0.8, y: 2.0, w: 11.5, h: 0.9, fontSize: 17, color: C.txt });
  card(s, 0.8, 3.2, 2.8, 1.5, 'AI Triage', 'Root-cause hints and remediation actions', C.blue);
  card(s, 3.9, 3.2, 2.8, 1.5, 'Config First', 'Contracts + tests as versioned config', C.purple);
  card(s, 7.0, 3.2, 2.8, 1.5, 'Ops Ready', 'CI/CD, reports, notifications', C.green);
  card(s, 10.1, 3.2, 2.2, 1.5, 'MCP', 'Agent tool surface', C.orange);
  footer(s);
}

// 2 Business value
{
  const s = pptx.addSlide();
  title(s, 'Why this Architecture', 'Business and engineering outcomes');
  const items = [
    ['Faster detection', 'Catch data quality regressions before BI/ML impact'],
    ['Lower MTTR', 'AI-guided triage shortens incident diagnosis time'],
    ['Auditability', 'Evidence-rich artifacts for governance and compliance'],
    ['Scalability', 'Adapter pattern avoids warehouse lock-in'],
    ['Adoption', 'Executive-ready HTML/PDF/JUnit outputs for all stakeholders']
  ];
  let y = 1.6;
  for (const [h, b] of items) {
    s.addShape(pptx.ShapeType.roundRect, { x: 0.8, y, w: 11.4, h: 0.85, rectRadius: 0.07, fill: { color: C.card }, line: { color: C.line, pt: 1 } });
    s.addText(h, { x: 1.1, y: y + 0.16, w: 2.6, h: 0.25, fontSize: 12.5, bold: true, color: C.txt });
    s.addText(b, { x: 3.4, y: y + 0.16, w: 8.5, h: 0.35, fontSize: 11.5, color: C.mut });
    y += 1.0;
  }
  footer(s);
}

// 3 Layered architecture
{
  const s = pptx.addSlide();
  title(s, 'Layered ETL AI Architecture', 'Reference view from channels to execution and delivery');
  const layers = [
    ['Input Layer', 'ETL configs, contracts, metadata, lineage', C.blue],
    ['Core Engine', 'Config loader, planner, assertion engine, adapter interface', C.purple],
    ['Execution Adapters', 'SQLite now; Snowflake/BigQuery/Databricks planned', C.orange],
    ['Intelligence Layer', 'AI triage, severity ranker, test generation agent', '0EA5E9'],
    ['Delivery Layer', 'CLI, MCP server, JUnit/HTML/PDF, email notifications', C.green]
  ];
  let y = 1.55;
  for (const [h, b, c] of layers) {
    s.addShape(pptx.ShapeType.roundRect, { x: 0.9, y, w: 11.2, h: 0.95, rectRadius: 0.07, fill: { color: C.card }, line: { color: C.line, pt: 1 } });
    s.addShape(pptx.ShapeType.roundRect, { x: 1.05, y: y + 0.14, w: 2.4, h: 0.68, rectRadius: 0.05, fill: { color: c }, line: { color: c } });
    s.addText(h, { x: 1.1, y: y + 0.36, w: 2.3, h: 0.2, fontSize: 10.5, bold: true, color: 'FFFFFF', align: 'center' });
    s.addText(b, { x: 3.7, y: y + 0.34, w: 7.9, h: 0.3, fontSize: 11.2, color: C.txt });
    y += 1.06;
  }
  footer(s);
}

// 4 Runtime sequence
{
  const s = pptx.addSlide();
  title(s, 'Runtime Flow (Operational Sequence)', 'How a run executes from trigger to report');
  const cols = ['User/CI', 'ETLQ CLI', 'Runner', 'Adapter', 'AI Triage', 'Reporter', 'Notifier'];
  let x = 0.65;
  for (const c of cols) {
    s.addShape(pptx.ShapeType.roundRect, { x, y: 1.4, w: 1.65, h: 0.5, rectRadius: 0.05, fill: { color: C.card }, line: { color: C.line, pt: 1 } });
    s.addText(c, { x: x + 0.03, y: 1.57, w: 1.6, h: 0.2, fontSize: 9.2, bold: true, color: C.txt, align: 'center' });
    s.addShape(pptx.ShapeType.line, { x: x + 0.83, y: 1.95, w: 0, h: 4.6, line: { color: '1F2937', pt: 1, dash: 'dot' } });
    x += 1.75;
  }
  const arrow = (x, y, w, text) => {
    s.addShape(pptx.ShapeType.line, { x, y, w, h: 0, line: { color: '4B5563', pt: 1.2, endArrowType: 'triangle' } });
    s.addText(text, { x: x + 0.03, y: y - 0.18, w: Math.max(w - 0.1, 1.2), h: 0.15, fontSize: 8.5, color: C.mut, align: 'center' });
  };
  arrow(1.45, 2.35, 1.65, 'run command');
  arrow(3.2, 2.75, 1.65, 'load + plan');
  arrow(4.95, 3.15, 1.65, 'execute checks');
  arrow(6.7, 3.55, -1.65, 'results');
  arrow(4.95, 3.95, 3.5, 'failures → triage');
  arrow(8.45, 4.35, -3.5, 'remediation hints');
  arrow(4.95, 4.75, 5.25, 'build artifacts');
  arrow(10.2, 5.15, 1.65, 'policy-based email');
  footer(s);
}

// 5 AI module view
{
  const s = pptx.addSlide();
  title(s, 'AI Intelligence Modules', 'Evidence-first AI that assists, not overrides, test truth');
  card(s, 0.8, 1.7, 3.6, 2.3, 'AI Triage Helper', 'Consumes failed checks and evidence snippets to suggest probable causes and next actions.', C.blue);
  card(s, 4.8, 1.7, 3.6, 2.3, 'Test Generator Agent', 'Uses schema + lineage context to propose missing tests and contract checks.', C.purple);
  card(s, 8.8, 1.7, 3.4, 2.3, 'Severity Ranker', 'Prioritizes failures by business impact and policy thresholds.', C.orange);
  s.addShape(pptx.ShapeType.roundRect, { x: 0.8, y: 4.4, w: 11.4, h: 1.8, rectRadius: 0.08, fill: { color: '0F172A' }, line: { color: C.line, pt: 1 } });
  s.addText('Guardrails', { x: 1.1, y: 4.65, w: 2, h: 0.2, fontSize: 13, bold: true, color: C.green });
  s.addText('• AI suggestions are advisory; assertions remain deterministic\n• Reports include evidence and reproducible checks\n• No sensitive values in logs/artifacts by design',
    { x: 1.1, y: 5.0, w: 10.6, h: 1.0, fontSize: 11.2, color: C.mut, breakLine: true });
  footer(s);
}

// 6 Deployment topology
{
  const s = pptx.addSlide();
  title(s, 'Deployment Topology', 'Dev, CI, and Data Platform responsibilities');
  card(s, 0.8, 2.0, 3.6, 3.0, 'Dev Workspace', 'ETLQ CLI\nLocal adapter (SQLite)\nAuthoring configs & rules', C.blue);
  card(s, 4.7, 2.0, 3.6, 3.0, 'CI/CD', 'Pipeline trigger\nAutomated runs\nJUnit/HTML/PDF artifacts', C.purple);
  card(s, 8.6, 2.0, 3.6, 3.0, 'Data Platform', 'Warehouse/Lakehouse\nSecrets manager\nOrchestrator hooks', C.green);
  s.addShape(pptx.ShapeType.line, { x: 4.4, y: 3.45, w: 0.25, h: 0, line: { color: '4B5563', pt: 1.4, endArrowType: 'triangle' } });
  s.addShape(pptx.ShapeType.line, { x: 8.3, y: 3.45, w: 0.25, h: 0, line: { color: '4B5563', pt: 1.4, endArrowType: 'triangle' } });
  footer(s);
}

// 7 Roadmap
{
  const s = pptx.addSlide();
  title(s, 'Roadmap to Enterprise Scale', 'Phased maturation of ETL AI automation');
  const phases = [
    ['Phase 1 (Now)', 'Core engine + SQLite + AI triage + reports + MCP'],
    ['Phase 2', 'Warehouse adapters + CI policy gates + flaky quarantine'],
    ['Phase 3', 'Lineage API integration + anomaly detection + cost-aware planning'],
    ['Phase 4', 'Enterprise RBAC, audit dashboards, broader notification channels']
  ];
  let y = 1.8;
  let n = 1;
  for (const [h, b] of phases) {
    s.addShape(pptx.ShapeType.roundRect, { x: 0.9, y, w: 11.2, h: 1.1, rectRadius: 0.08, fill: { color: C.card }, line: { color: C.line, pt: 1 } });
    s.addShape(pptx.ShapeType.roundRect, { x: 1.1, y: y + 0.2, w: 0.6, h: 0.68, rectRadius: 0.34, fill: { color: C.blue }, line: { color: C.blue } });
    s.addText(String(n++), { x: 1.1, y: y + 0.45, w: 0.6, h: 0.2, fontSize: 11, bold: true, color: 'FFFFFF', align: 'center' });
    s.addText(h, { x: 1.9, y: y + 0.25, w: 3.4, h: 0.22, fontSize: 12.5, bold: true, color: C.txt });
    s.addText(b, { x: 1.9, y: y + 0.57, w: 9.9, h: 0.25, fontSize: 11.2, color: C.mut });
    y += 1.28;
  }
  footer(s);
}

// 8 Close
{
  const s = pptx.addSlide();
  title(s, 'ETL AI Automation — Ready to Present', 'Architecture is aligned for implementation, operations, and leadership reporting');
  s.addShape(pptx.ShapeType.roundRect, { x: 1.0, y: 2.0, w: 10.9, h: 3.2, rectRadius: 0.1, fill: { color: C.card }, line: { color: C.line, pt: 1 } });
  s.addText('Deliverable', { x: 1.4, y: 2.35, w: 2.5, h: 0.25, fontSize: 15, bold: true, color: C.blue });
  s.addText('ETL_AI_Automation_Architecture_Deck.pptx', { x: 1.4, y: 2.75, w: 8.5, h: 0.4, fontSize: 20, bold: true, color: C.txt });
  s.addText('Use this deck for stakeholder alignment, technical planning, and release governance discussions.', { x: 1.4, y: 3.4, w: 9.8, h: 0.5, fontSize: 12.5, color: C.mut });
  footer(s);
}

pptx.writeFile({ fileName: out }).then(() => console.log(out)).catch((e) => { console.error(e); process.exit(1); });
