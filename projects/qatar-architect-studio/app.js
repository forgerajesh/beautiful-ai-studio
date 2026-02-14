const templates = [
  {
    name: 'Concept Design Package',
    content: {
      sections: ['Design Intent', 'Massing Options', 'Climate Response', 'Client Brief Alignment'],
      deliverables: ['Concept drawings', 'Mood board', 'Preliminary area schedule']
    }
  },
  {
    name: 'Schematic Design Package',
    content: {
      sections: ['Floor plans', 'Elevations', 'Core strategy', 'Parking & circulation'],
      deliverables: ['Schematic BIM model', 'Coordination matrix', 'Cost estimate v1']
    }
  },
  {
    name: 'Construction Documentation',
    content: {
      sections: ['Detailed architecture drawings', 'Specifications', 'BOQ alignment', 'Authority compliance'],
      deliverables: ['IFC set', 'Material schedule', 'RFI tracker']
    }
  },
  {
    name: 'Authority Submission Kit (Qatar)',
    content: {
      sections: ['QCD requirements', 'Municipality compliance', 'Accessibility checklist', 'Permit package'],
      deliverables: ['Submission forms', 'Stamped drawings', 'Compliance declaration']
    }
  }
];

const testingTypes = [
  ['Functional Testing', 'Template logic, plan generation, CRUD behavior', 'Ready'],
  ['UI/UX Testing', 'Layout, readability, responsiveness, interactions', 'Ready'],
  ['API Testing', 'Backend endpoints for project/template sync', 'Planned'],
  ['Integration Testing', 'Template + plan + export flows', 'Ready'],
  ['System Testing', 'End-to-end user workflow', 'Ready'],
  ['Smoke Testing', 'Critical path sanity checks per release', 'Ready'],
  ['Regression Testing', 'No breakage after feature updates', 'Ready'],
  ['Performance Testing', 'Large project data rendering and export', 'Planned'],
  ['Security Testing', 'Auth, role access, input validation', 'Planned'],
  ['Accessibility Testing', 'Keyboard nav, contrast, semantic structure', 'Ready'],
  ['Compatibility Testing', 'Chrome/Edge/Firefox + mobile screens', 'Ready'],
  ['Usability Testing', 'Architect workflow efficiency', 'Ready'],
  ['UAT', 'Architect and PM stakeholder validation', 'Planned']
];

const qualityGates = [
  'Gate 1: Client brief completeness',
  'Gate 2: Climate & sustainability strategy reviewed',
  'Gate 3: Code & authority pre-check passed',
  'Gate 4: BIM coordination sign-off',
  'Gate 5: Constructability and cost alignment',
  'Gate 6: Submission readiness checklist'
];

const templatesEl = document.getElementById('templates');
const previewEl = document.getElementById('templatePreview');
const planEl = document.getElementById('executionPlan');
const testingRows = document.getElementById('testingRows');
const qualityWrap = document.getElementById('qualityGates');

let currentPlan = null;

templates.forEach((t) => {
  const btn = document.createElement('button');
  btn.className = 'template-btn';
  btn.textContent = t.name;
  btn.onclick = () => {
    previewEl.textContent = JSON.stringify(t.content, null, 2);
  };
  templatesEl.appendChild(btn);
});

for (const [type, scope, status] of testingTypes) {
  const tr = document.createElement('tr');
  tr.innerHTML = `<td>${type}</td><td>${scope}</td><td><span class="badge">${status}</span></td>`;
  testingRows.appendChild(tr);
}

qualityGates.forEach((g) => {
  const d = document.createElement('div');
  d.className = 'chip';
  d.textContent = g;
  qualityWrap.appendChild(d);
});

function generatePlan() {
  const projectName = document.getElementById('projectName').value.trim();
  const projectType = document.getElementById('projectType').value;
  const siteLocation = document.getElementById('siteLocation').value.trim();
  const standard = document.getElementById('standard').value;

  currentPlan = {
    project: { projectName, projectType, siteLocation, standard },
    phases: [
      { phase: 'Phase 1 - Discovery', tasks: ['Client workshop', 'Site constraints', 'Codes baseline'] },
      { phase: 'Phase 2 - Concept & Schematic', tasks: ['Concept options', 'Massing and facade', 'Stakeholder review'] },
      { phase: 'Phase 3 - Detailed Design', tasks: ['BIM coordination', 'Detailed drawings', 'Specification drafting'] },
      { phase: 'Phase 4 - Authority & Tender', tasks: ['Authority submission', 'Tender package', 'RFI management'] },
      { phase: 'Phase 5 - Construction Support', tasks: ['Site queries', 'Design clarifications', 'As-built closeout'] }
    ],
    testing: testingTypes.map(([type, scope, status]) => ({ type, scope, status })),
    qualityGates
  };

  planEl.textContent = JSON.stringify(currentPlan, null, 2);
}

document.getElementById('createPlan').onclick = generatePlan;
document.getElementById('exportPlan').onclick = () => {
  if (!currentPlan) generatePlan();
  const blob = new Blob([JSON.stringify(currentPlan, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'qatar-architect-project-plan.json';
  a.click();
};

generatePlan();
