const path = require('path');
const PptxGenJS = require('/home/vnc/.openclaw/workspace/.tmp/ppt/node_modules/pptxgenjs');

const out = '/home/vnc/.openclaw/workspace/projects/testops-platform/deliverables/TestOps_Architecture_Deck_Presentable.pptx';

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = 'OpenClaw';
pptx.company = 'TestOps Platform';
pptx.subject = 'Unified AI Testing Platform Architecture';
pptx.title = 'TestOps Platform Architecture';
pptx.lang = 'en-US';
pptx.theme = {
  headFontFace: 'Aptos Display',
  bodyFontFace: 'Aptos',
  lang: 'en-US'
};

const C = {
  bg: '0E1117',
  panel: '161B22',
  panel2: '1F2937',
  txt: 'E6EDF3',
  muted: '9DA7B3',
  accent: '58A6FF',
  green: '3FB950',
  orange: 'F0883E',
  purple: 'A371F7'
};

function title(slide, t, s) {
  slide.background = { color: C.bg };
  slide.addText(t, { x: 0.6, y: 0.4, w: 12.2, h: 0.6, fontSize: 30, bold: true, color: C.txt });
  if (s) slide.addText(s, { x: 0.6, y: 1.05, w: 12.2, h: 0.45, fontSize: 14, color: C.muted });
}

function footer(slide, t='Confidential • TestOps Platform') {
  slide.addShape(pptx.ShapeType.line, { x: 0.6, y: 7.0, w: 12.1, h: 0, line: { color: '2D333B', pt: 1 } });
  slide.addText(t, { x: 0.6, y: 7.05, w: 6, h: 0.2, fontSize: 9, color: '6E7681' });
}

function pill(slide, text, x, y, color) {
  slide.addShape(pptx.ShapeType.roundRect, { x, y, w: 1.9, h: 0.36, rectRadius: 0.08, fill: { color }, line: { color } });
  slide.addText(text, { x: x+0.07, y: y+0.07, w: 1.75, h: 0.2, fontSize: 10, bold: true, color: 'FFFFFF', align: 'center' });
}

// 1 cover
{
  const s = pptx.addSlide();
  title(s, 'TestOps Platform', 'Unified AI Testing Architecture — Executive Deck');
  s.addText('From requirement intake to governed release promotion, with multi-agent orchestration, self-healing execution, and enterprise observability.',
    { x: 0.8, y: 2.0, w: 11.6, h: 1.0, fontSize: 17, color: C.txt, valign: 'mid' });
  pill(s, 'AI-Driven', 0.8, 3.25, '1F6FEB');
  pill(s, 'Policy-Governed', 2.9, 3.25, '6F42C1');
  pill(s, 'Enterprise Ready', 5.0, 3.25, '238636');
  pill(s, 'Channel Native', 7.1, 3.25, 'B54708');

  s.addShape(pptx.ShapeType.roundRect, { x: 0.8, y: 4.15, w: 11.4, h: 2.1, rectRadius: 0.12, fill: { color: C.panel }, line: { color: '2D333B', pt: 1 } });
  s.addText('Architecture scope in this deck', { x: 1.1, y: 4.45, w: 4.5, h: 0.3, fontSize: 13, bold: true, color: C.txt });
  s.addText('• Channel & API control plane\n• Agentic intelligence modules\n• Queue, execution, healing, and evaluation\n• Artifacts, telemetry, traceability, analytics\n• Enterprise integrations and delivery lifecycle',
    { x: 1.1, y: 4.8, w: 10.6, h: 1.5, fontSize: 12, color: C.muted, breakLine: true });
  footer(s);
}

// 2 lifecycle
{
  const s = pptx.addSlide();
  title(s, 'End-to-End Lifecycle', 'Business flow across product teams, QA, and release governance');
  const steps = [
    ['1. Intake', 'Requirements, risks, acceptance criteria'],
    ['2. Strategy', 'AI planner selects test strategy & scope'],
    ['3. Build', 'Generate/update tests, data and environments'],
    ['4. Execute', 'Run web/API/mobile + security/accessibility'],
    ['5. Heal', 'Auto-repair fragile selectors and retry'],
    ['6. Evaluate', 'Quality gates, contracts, policy checks'],
    ['7. Promote', 'Approval workflow + release decision'],
  ];
  let y=1.6;
  for (const [i, d] of steps) {
    s.addShape(pptx.ShapeType.roundRect, { x: 0.8, y, w: 11.4, h: 0.68, rectRadius: 0.08, fill: { color: C.panel }, line: { color: '2D333B', pt: 1 } });
    s.addText(i, { x: 1.0, y: y+0.14, w: 2.2, h: 0.3, fontSize: 13, bold: true, color: C.accent });
    s.addText(d, { x: 3.0, y: y+0.14, w: 8.9, h: 0.3, fontSize: 12, color: C.txt });
    y += 0.82;
  }
  footer(s);
}

// 3 architecture layers
{
  const s = pptx.addSlide();
  title(s, 'Layered Reference Architecture', 'Separation of concerns for scale, governance, and maintainability');
  const layers = [
    ['Channel & UI Layer', 'Web React Studio, Telegram, WhatsApp, API clients', '1F6FEB'],
    ['Control Plane', 'FastAPI gateway, workflow orchestration, auth/RBAC, channel routing', '6F42C1'],
    ['Intelligence Layer', 'Playwright/API/Security/Accessibility agents, planner, policy engine, doctor', 'A371F7'],
    ['Execution Layer', 'Queue backends, runners, self-healing, eval harness, promotion gates', 'F0883E'],
    ['Data & Observability', 'Artifacts, traceability matrix, telemetry/logbus, executive analytics', '238636'],
    ['Enterprise Integrations', 'Jira, TestRail, CI/CD, repos, external quality/security tools', '3FB950'],
  ];
  let y=1.6;
  for (const [t,d,c] of layers){
    s.addShape(pptx.ShapeType.roundRect,{x:0.9,y,w:11.2,h:0.78,rectRadius:0.08,fill:{color:C.panel2},line:{color:'2D333B',pt:1}});
    s.addShape(pptx.ShapeType.roundRect,{x:1.0,y:y+0.08,w:2.5,h:0.62,rectRadius:0.06,fill:{color:c},line:{color:c}});
    s.addText(t,{x:1.05,y:y+0.26,w:2.4,h:0.2,fontSize:10.5,bold:true,color:'FFFFFF',align:'center'});
    s.addText(d,{x:3.8,y:y+0.22,w:7.9,h:0.34,fontSize:11.5,color:C.txt});
    y+=0.88;
  }
  footer(s);
}

// 4 control plane
{
  const s = pptx.addSlide();
  title(s, 'Control Plane Deep Dive', 'How requests are ingested, authorized, and orchestrated');
  const box = (x,y,w,h,hdr,lines)=>{
    s.addShape(pptx.ShapeType.roundRect,{x,y,w,h,rectRadius:0.08,fill:{color:C.panel},line:{color:'2D333B',pt:1}});
    s.addText(hdr,{x:x+0.2,y:y+0.12,w:w-0.4,h:0.25,fontSize:12,bold:true,color:C.accent});
    s.addText(lines,{x:x+0.2,y:y+0.42,w:w-0.4,h:h-0.5,fontSize:10.8,color:C.muted,breakLine:true});
  };
  box(0.8,1.6,3.8,2.3,'Ingress','• React UI and chat channels\n• External API triggers\n• Unified request model');
  box(4.9,1.6,3.8,2.3,'Governance','• JWT/authN\n• RBAC + tenant guard\n• Policy pre-checks');
  box(9.0,1.6,3.3,2.3,'Orchestration','• Workflow engine\n• Agent routing\n• Run-state tracking');
  s.addShape(pptx.ShapeType.chevron,{x:4.45,y:2.45,w:0.4,h:0.3,fill:{color:'2D333B'},line:{color:'2D333B'}});
  s.addShape(pptx.ShapeType.chevron,{x:8.55,y:2.45,w:0.4,h:0.3,fill:{color:'2D333B'},line:{color:'2D333B'}});
  s.addShape(pptx.ShapeType.roundRect,{x:0.8,y:4.3,w:11.5,h:1.9,rectRadius:0.08,fill:{color:'111827'},line:{color:'2D333B',pt:1}});
  s.addText('Outcome: predictable, auditable control flow before any execution starts.',{x:1.1,y:4.55,w:10.8,h:0.35,fontSize:14,bold:true,color:C.txt});
  s.addText('This allows enterprise teams to enforce quality, security, and compliance controls consistently across all test runs.',{x:1.1,y:4.95,w:10.8,h:0.8,fontSize:12,color:C.muted});
  footer(s);
}

// 5 intelligence layer
{
  const s = pptx.addSlide();
  title(s, 'Agentic Intelligence Layer', 'Specialized agents coordinated by strategy and governance');
  const agents = ['Playwright Agent','API Agent','Security Agent','Accessibility Agent','Non-Functional Agent'];
  s.addShape(pptx.ShapeType.roundRect,{x:4.45,y:1.55,w:3.0,h:0.75,rectRadius:0.08,fill:{color:'6F42C1'},line:{color:'6F42C1'}});
  s.addText('Agent Service + Registry',{x:4.55,y:1.83,w:2.8,h:0.25,fontSize:12,bold:true,color:'FFFFFF',align:'center'});
  let x=0.8;
  for (const a of agents){
    s.addShape(pptx.ShapeType.roundRect,{x,y:3.0,w:2.35,h:0.85,rectRadius:0.08,fill:{color:C.panel},line:{color:'2D333B',pt:1}});
    s.addText(a,{x:x+0.08,y:3.25,w:2.18,h:0.3,fontSize:10.5,bold:true,color:C.txt,align:'center'});
    s.addShape(pptx.ShapeType.line,{x:x+1.175,y:2.3,w:0,h:0.65,line:{color:'4B5563',pt:1.3}});
    x += 2.45;
  }
  s.addShape(pptx.ShapeType.roundRect,{x:1.1,y:4.5,w:5.5,h:1.5,rectRadius:0.08,fill:{color:'0F172A'},line:{color:'2D333B',pt:1}});
  s.addText('Strategy Planner',{x:1.35,y:4.72,w:2.2,h:0.3,fontSize:12,bold:true,color:C.accent});
  s.addText('Chooses risk-based test mix, depth, and prioritization per change set.',{x:1.35,y:5.02,w:4.9,h:0.7,fontSize:10.8,color:C.muted});
  s.addShape(pptx.ShapeType.roundRect,{x:6.9,y:4.5,w:5.3,h:1.5,rectRadius:0.08,fill:{color:'0F172A'},line:{color:'2D333B',pt:1}});
  s.addText('Policy + Doctor Engines',{x:7.15,y:4.72,w:2.8,h:0.3,fontSize:12,bold:true,color:C.green});
  s.addText('Enforces governance rules and generates next-best actions for faster remediation.',{x:7.15,y:5.02,w:4.7,h:0.7,fontSize:10.8,color:C.muted});
  footer(s);
}

// 6 execution & healing
{
  const s = pptx.addSlide();
  title(s, 'Execution, Healing & Promotion', 'Reliability architecture for stable and trustworthy automation');
  const nodes = [
    ['Queue Backends',0.9,2.0],['Runners (Web/API/Mobile)',3.5,2.0],['Self-Healing Engine',6.4,2.0],['Evaluation Harness',9.0,2.0],['Promotion Gates',4.9,4.0]
  ];
  for (const [n,x,y] of nodes){
    s.addShape(pptx.ShapeType.roundRect,{x,y,w:2.3,h:0.85,rectRadius:0.08,fill:{color:C.panel},line:{color:'2D333B',pt:1}});
    s.addText(n,{x:x+0.08,y:y+0.28,w:2.15,h:0.28,fontSize:10.5,bold:true,color:C.txt,align:'center'});
  }
  const arrow=(x,y,w,h)=>s.addShape(pptx.ShapeType.chevron,{x,y,w,h,fill:{color:'4B5563'},line:{color:'4B5563'}});
  arrow(3.0,2.27,0.35,0.25); arrow(5.95,2.27,0.35,0.25); arrow(8.55,2.27,0.35,0.25);
  s.addShape(pptx.ShapeType.line,{x:10.1,y:2.85,w:-2.9,h:1.1,line:{color:'4B5563',pt:1}});
  s.addShape(pptx.ShapeType.chevron,{x:7.18,y:3.83,w:0.25,h:0.3,rotate:180,fill:{color:'4B5563'},line:{color:'4B5563'}});
  s.addShape(pptx.ShapeType.chevron,{x:6.2,y:4.27,w:-0.9,h:-0.25,fill:{color:'4B5563'},line:{color:'4B5563'}});
  s.addText('Feedback loop repairs flaky selectors and improves resilience over time.',{x:1.0,y:5.45,w:11.0,h:0.35,fontSize:12,color:C.muted,align:'center'});
  footer(s);
}

// 7 observability
{
  const s = pptx.addSlide();
  title(s, 'Data, Artifacts & Observability', 'Make test execution explainable, traceable, and executive-readable');
  const cards = [
    ['Artifacts Store','Reports, screenshots, logs, SARIF outputs','58A6FF'],
    ['Traceability Matrix','Requirement → test → defect → release linkage','A371F7'],
    ['Telemetry + LogBus','Runtime signals, structured events, exporters','F0883E'],
    ['Executive Analytics','Maturity trends, pass rates, risk posture','3FB950']
  ];
  let x=0.8;
  for(const [h,b,c] of cards){
    s.addShape(pptx.ShapeType.roundRect,{x,y:2.0,w:2.85,h:3.8,rectRadius:0.08,fill:{color:C.panel},line:{color:'2D333B',pt:1}});
    s.addShape(pptx.ShapeType.roundRect,{x:x+0.25,y:2.25,w:2.35,h:0.45,rectRadius:0.05,fill:{color:c},line:{color:c}});
    s.addText(h,{x:x+0.3,y:2.37,w:2.25,h:0.2,fontSize:10,bold:true,color:'FFFFFF',align:'center'});
    s.addText(b,{x:x+0.25,y:3.0,w:2.35,h:2.5,fontSize:10.5,color:C.muted,valign:'top'});
    x+=3.05;
  }
  footer(s);
}

// 8 integrations
{
  const s = pptx.addSlide();
  title(s, 'Enterprise Integration Surface', 'Embed TestOps into existing SDLC and governance systems');
  const left=['Jira sync','TestRail updates','CI/CD pipeline hooks','Git provider events'];
  const right=['Security tooling (Semgrep/Bandit/Trivy/ZAP)','Artifact export & retention','Policy compliance evidence','Release audit trail'];
  s.addShape(pptx.ShapeType.roundRect,{x:0.8,y:1.8,w:5.6,h:4.8,rectRadius:0.08,fill:{color:C.panel},line:{color:'2D333B',pt:1}});
  s.addText('Ecosystem Connectors',{x:1.1,y:2.05,w:5.0,h:0.3,fontSize:13,bold:true,color:C.accent});
  s.addShape(pptx.ShapeType.roundRect,{x:6.6,y:1.8,w:5.6,h:4.8,rectRadius:0.08,fill:{color:C.panel},line:{color:'2D333B',pt:1}});
  s.addText('Governance Outputs',{x:6.9,y:2.05,w:5.0,h:0.3,fontSize:13,bold:true,color:C.green});
  let y=2.55;
  for(const i of left){s.addText('• '+i,{x:1.2,y,w:4.9,h:0.35,fontSize:11.5,color:C.txt}); y+=0.75;}
  y=2.55;
  for(const i of right){s.addText('• '+i,{x:7.0,y,w:4.9,h:0.35,fontSize:11.5,color:C.txt}); y+=0.75;}
  footer(s);
}

// 9 roadmap
{
  const s = pptx.addSlide();
  title(s, 'Implementation Roadmap', 'Pragmatic rollout to production-grade operations');
  const phases = [
    ['Phase 1 (0-4 weeks)','Core control plane, baseline agents, run pipeline'],
    ['Phase 2 (4-8 weeks)','Self-healing + policy gates + integrations'],
    ['Phase 3 (8-12 weeks)','Executive analytics + traceability + governance'],
    ['Phase 4 (12+ weeks)','Optimization, cost control, scale-out operations']
  ];
  let y=1.8;
  let i=1;
  for (const [p,d] of phases){
    s.addShape(pptx.ShapeType.roundRect,{x:0.8,y,w:11.4,h:1.08,rectRadius:0.08,fill:{color:C.panel},line:{color:'2D333B',pt:1}});
    s.addShape(pptx.ShapeType.roundRect,{x:1.0,y:y+0.18,w:0.65,h:0.65,rectRadius:0.32,fill:{color:'1F6FEB'},line:{color:'1F6FEB'}});
    s.addText(String(i++),{x:1.0,y:y+0.39,w:0.65,h:0.2,fontSize:11,bold:true,color:'FFFFFF',align:'center'});
    s.addText(p,{x:1.85,y:y+0.24,w:4.5,h:0.25,fontSize:12,bold:true,color:C.txt});
    s.addText(d,{x:1.85,y:y+0.55,w:9.8,h:0.25,fontSize:11,color:C.muted});
    y += 1.22;
  }
  footer(s);
}

// 10 close
{
  const s = pptx.addSlide();
  title(s, 'Thank You', 'TestOps Platform Architecture — Ready for stakeholder review');
  s.addShape(pptx.ShapeType.roundRect,{x:1.2,y:2.0,w:10.3,h:3.2,rectRadius:0.12,fill:{color:C.panel},line:{color:'2D333B',pt:1}});
  s.addText('Key Takeaways',{x:1.6,y:2.35,w:3.2,h:0.35,fontSize:16,bold:true,color:C.accent});
  s.addText('• Unified architecture across channels, agents, execution, and governance\n• Designed for enterprise controls, reliability, and traceability\n• Executive-ready reporting and integration with existing SDLC stack\n• Clear phased rollout path from pilot to scale',
    {x:1.6,y:2.85,w:9.5,h:1.8,fontSize:13,color:C.txt,breakLine:true});
  s.addText('Deliverable: TestOps_Architecture_Deck_Presentable.pptx',{x:1.6,y:5.0,w:9.5,h:0.35,fontSize:11,color:C.muted});
  footer(s,'Prepared by OpenClaw • '+new Date().toISOString().slice(0,10));
}

pptx.writeFile({ fileName: out })
  .then(() => console.log(out))
  .catch((e) => { console.error(e); process.exit(1); });
