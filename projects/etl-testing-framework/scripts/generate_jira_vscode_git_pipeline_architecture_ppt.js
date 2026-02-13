const PptxGenJS = require('/home/vnc/.openclaw/workspace/.tmp/ppt/node_modules/pptxgenjs');

const out = '/home/vnc/.openclaw/workspace/projects/etl-testing-framework/Jira_VSCode_Git_Pipeline_Architecture.pptx';
const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = 'OpenClaw';
pptx.title = 'Jira to Pipeline Architecture';

const C = {
  bg: '0B1020',
  card: '121A2C',
  line: '2A3552',
  txt: 'EAF0FF',
  mut: 'A8B3CF',
  jira: '0052CC',
  code: '007ACC',
  git: 'F14E32',
  pipe: '7C3AED',
  run: '10B981',
  obs: 'F59E0B'
};

const s = pptx.addSlide();
s.background = { color: C.bg };

s.addText('Beautiful Delivery Architecture', { x: 0.5, y: 0.25, w: 12.3, h: 0.45, fontSize: 28, bold: true, color: C.txt });
s.addText('Jira → VS Code → Git → CI/CD Pipeline → Test Execution → Reporting & Feedback', { x: 0.5, y: 0.75, w: 12.3, h: 0.3, fontSize: 12, color: C.mut });

function node(x, y, w, h, title, body, color) {
  s.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.08, fill: { color: C.card }, line: { color: C.line, pt: 1.2 }, shadow: { type: 'outer', color: '000000', blur: 3, angle: 45, distance: 2, opacity: 0.2 } });
  s.addShape(pptx.ShapeType.roundRect, { x: x + 0.12, y: y + 0.12, w: w - 0.24, h: 0.35, rectRadius: 0.05, fill: { color }, line: { color } });
  s.addText(title, { x: x + 0.16, y: y + 0.21, w: w - 0.32, h: 0.17, fontSize: 10.5, bold: true, color: 'FFFFFF', align: 'center' });
  s.addText(body, { x: x + 0.16, y: y + 0.58, w: w - 0.32, h: h - 0.66, fontSize: 9.5, color: C.mut, valign: 'top', breakLine: true });
}

function arrow(x, y, w) {
  s.addShape(pptx.ShapeType.line, { x, y, w, h: 0, line: { color: '6B7AA8', pt: 1.6, endArrowType: 'triangle' } });
}

const y = 2.0;
const w = 2.15;
const h = 2.0;
const gap = 0.32;
let x = 0.5;

node(x, y, w, h, '1) Jira', 'User stories\nAcceptance criteria\nTest case linkage', C.jira);
x += w + gap;
node(x, y, w, h, '2) VS Code', 'Author automation\nAI-assisted test design\nLocal validation', C.code);
arrow(x - 0.2, y + 1.0, 0.18);
x += w + gap;
node(x, y, w, h, '3) Git', 'Branch strategy\nPull requests\nCode review gates', C.git);
arrow(x - 0.2, y + 1.0, 0.18);
x += w + gap;
node(x, y, w, h, '4) CI/CD Pipeline', 'Build + lint + security\nUnit/API/UI test stages\nQuality thresholds', C.pipe);
arrow(x - 0.2, y + 1.0, 0.18);
x += w + gap;
node(x, y, w, h, '5) Execution', 'Parallel test runners\nSelf-healing retries\nEnvironment matrix', C.run);
arrow(x - 0.2, y + 1.0, 0.18);

// Bottom observability and feedback loop
node(4.25, 4.8, 4.2, 1.6, '6) Reporting & Observability', 'Dashboards, trend analytics, artifacts, notifications (Telegram/Email), and defect creation back to Jira', C.obs);
s.addShape(pptx.ShapeType.line, { x: 10.9, y: 3.95, w: -2.3, h: 0.95, line: { color: '6B7AA8', pt: 1.4 } });
s.addShape(pptx.ShapeType.line, { x: 4.25, y: 5.6, w: -2.8, h: -1.65, line: { color: '6B7AA8', pt: 1.4, endArrowType: 'triangle' } });
s.addText('Continuous feedback loop', { x: 1.2, y: 4.1, w: 2.8, h: 0.25, fontSize: 9.5, italic: true, color: C.mut });

// Footer
s.addShape(pptx.ShapeType.line, { x: 0.5, y: 7.0, w: 12.3, h: 0, line: { color: C.line, pt: 1 } });
s.addText('Reference architecture • Adaptable for ETL / API / UI / Security testing programs', { x: 0.5, y: 7.05, w: 10, h: 0.2, fontSize: 8.5, color: '7F8DB0' });

pptx.writeFile({ fileName: out }).then(() => console.log(out)).catch((e) => { console.error(e); process.exit(1); });
