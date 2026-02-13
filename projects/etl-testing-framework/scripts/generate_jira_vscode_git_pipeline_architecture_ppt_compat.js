const PptxGenJS = require('/home/vnc/.openclaw/workspace/.tmp/ppt/node_modules/pptxgenjs');

const out = '/home/vnc/.openclaw/workspace/projects/etl-testing-framework/Jira_VSCode_Git_Pipeline_Architecture_Compat.pptx';
const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = 'OpenClaw';
pptx.title = 'Jira VSCode Git Pipeline Architecture';

const slide = pptx.addSlide();
slide.background = { color: 'FFFFFF' };

slide.addText('Jira → VS Code → Git → CI/CD Pipeline → Test Execution → Reporting', {
  x: 0.4, y: 0.25, w: 12.5, h: 0.5, fontSize: 22, bold: true, color: '1F2937'
});
slide.addText('Simple compatible architecture diagram', {
  x: 0.4, y: 0.75, w: 12.5, h: 0.25, fontSize: 11, color: '6B7280'
});

function box(x, y, title, body, color) {
  slide.addShape(pptx.ShapeType.rect, {
    x, y, w: 1.95, h: 2.0,
    fill: { color: 'F9FAFB' },
    line: { color: color, pt: 1.5 }
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: x + 0.08, y: y + 0.08, w: 1.79, h: 0.35,
    fill: { color: color },
    line: { color: color, pt: 1 }
  });
  slide.addText(title, {
    x: x + 0.1, y: y + 0.17, w: 1.75, h: 0.18, fontSize: 10, bold: true, color: 'FFFFFF', align: 'center'
  });
  slide.addText(body, {
    x: x + 0.1, y: y + 0.55, w: 1.75, h: 1.35, fontSize: 9, color: '374151', valign: 'top'
  });
}

box(0.35, 2.0, '1) Jira', 'Requirements\nUser stories\nTest case mapping', '0052CC');
box(2.55, 2.0, '2) VS Code', 'Author tests\nAI-assisted design\nLocal validation', '007ACC');
box(4.75, 2.0, '3) Git', 'Commit + branch\nPR review\nMerge controls', 'F14E32');
box(6.95, 2.0, '4) Pipeline', 'Build + lint\nTest stages\nQuality gates', '6D28D9');
box(9.15, 2.0, '5) Execution', 'UI/API/ETL runs\nRetries\nArtifacts', '059669');
box(11.35, 2.0, '6) Reporting', 'Dashboards\nNotifications\nFeedback to Jira', 'D97706');

function connector(x1, x2) {
  slide.addShape(pptx.ShapeType.line, {
    x: x1, y: 3.0, w: x2 - x1, h: 0,
    line: { color: '6B7280', pt: 1.25, endArrowType: 'triangle' }
  });
}
connector(2.3, 2.5);
connector(4.5, 4.7);
connector(6.7, 6.9);
connector(8.9, 9.1);
connector(11.1, 11.3);

slide.addShape(pptx.ShapeType.rect, {
  x: 3.4, y: 5.0, w: 6.0, h: 1.0,
  fill: { color: 'EFF6FF' },
  line: { color: '93C5FD', pt: 1 }
});
slide.addText('Continuous feedback loop: Reporting outcomes create/annotate Jira defects and refine future test design.', {
  x: 3.55, y: 5.3, w: 5.7, h: 0.45, fontSize: 10, color: '1E3A8A', align: 'center'
});

slide.addShape(pptx.ShapeType.line, {
  x: 11.9, y: 4.05, w: -9.5, h: 0.95,
  line: { color: '9CA3AF', pt: 1, endArrowType: 'triangle' }
});

pptx.writeFile({ fileName: out }).then(() => console.log(out)).catch((e) => { console.error(e); process.exit(1); });
