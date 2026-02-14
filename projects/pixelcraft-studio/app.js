const canvas = new fabric.Canvas('canvas', { preserveObjectStacking: true });
const stage = document.getElementById('stage');
const stageSize = document.getElementById('stageSize');
const autosaveStatus = document.getElementById('autosaveStatus');

const palette = ['#111827','#4f46e5','#3b82f6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#e5e7eb','#ffffff'];
const paletteWrap = document.getElementById('palette');
const projectListEl = document.getElementById('projectList');
const sharedTemplateListEl = document.getElementById('sharedTemplateList');

let currentUser = localStorage.getItem('pc_user') || '';
let currentProjectId = null;
let autosaveTimer = null;

function keyProjects() { return `pc_projects_${currentUser || 'guest'}`; }
function keySharedTemplates() { return `pc_shared_templates`; }
function getProjects() { return JSON.parse(localStorage.getItem(keyProjects()) || '[]'); }
function setProjects(v) { localStorage.setItem(keyProjects(), JSON.stringify(v)); }
function getSharedTemplates() { return JSON.parse(localStorage.getItem(keySharedTemplates()) || '[]'); }
function setSharedTemplates(v) { localStorage.setItem(keySharedTemplates(), JSON.stringify(v)); }

function setSize(w, h) {
  canvas.setWidth(w);
  canvas.setHeight(h);
  stageSize.textContent = `${w} x ${h}`;
  canvas.requestRenderAll();
}

function addText(txt = 'Edit me', size = 36, weight = 600) {
  const t = new fabric.Textbox(txt, { left: 180, top: 160, width: 360, fontSize: size, fontWeight: weight, fill: '#1f2937', fontFamily: 'Inter' });
  canvas.add(t).setActiveObject(t);
}

function addShape(kind) {
  let obj;
  if (kind === 'rect') obj = new fabric.Rect({ left: 220, top: 220, width: 220, height: 120, rx: 10, ry: 10, fill: '#4f46e5' });
  if (kind === 'circle') obj = new fabric.Circle({ left: 260, top: 220, radius: 70, fill: '#06b6d4' });
  if (kind === 'line') obj = new fabric.Line([220, 260, 520, 260], { stroke: '#111827', strokeWidth: 4 });
  canvas.add(obj).setActiveObject(obj);
}

function template(kind) {
  canvas.clear();
  if (kind === 'instagram') {
    setSize(1080, 1080); canvas.setBackgroundColor('#f8fafc', canvas.renderAll.bind(canvas));
    addShape('rect'); canvas.getActiveObject().set({ left: 80, top: 120, width: 920, height: 460, fill: '#111827' });
    addText('Launch your brand campaign', 74, 800); canvas.getActiveObject().set({ left: 120, top: 180, fill: '#ffffff', width: 860 });
    addText('PixelCraft Studio', 38, 600); canvas.getActiveObject().set({ left: 120, top: 660, fill: '#1f2937' });
  }
  if (kind === 'presentation') {
    setSize(1600, 900); canvas.setBackgroundColor('#ffffff', canvas.renderAll.bind(canvas));
    addShape('rect'); canvas.getActiveObject().set({ left: 0, top: 0, width: 520, height: 900, fill: '#111827', selectable: false, evented: false });
    addText('QBR 2026', 78, 800); canvas.getActiveObject().set({ left: 80, top: 170, fill: '#ffffff' });
    addText('Growth with clarity', 42, 500); canvas.getActiveObject().set({ left: 80, top: 300, fill: '#dbeafe' });
    addText('Drop your charts and visuals here', 44, 600); canvas.getActiveObject().set({ left: 620, top: 420, fill: '#1f2937', width: 900 });
  }
  if (kind === 'poster') {
    setSize(1080, 1520); canvas.setBackgroundColor('#0f172a', canvas.renderAll.bind(canvas));
    addText('MUSIC NIGHT', 120, 900); canvas.getActiveObject().set({ left: 90, top: 180, fill: '#f8fafc' });
    addText('Live at Skyline Arena', 52, 500); canvas.getActiveObject().set({ left: 90, top: 380, fill: '#a5b4fc' });
    addShape('rect'); canvas.getActiveObject().set({ left: 90, top: 980, width: 900, height: 280, fill: '#4f46e5' });
    addText('FRIDAY · 8 PM', 88, 800); canvas.getActiveObject().set({ left: 130, top: 1060, fill: '#ffffff' });
  }
  canvas.requestRenderAll();
  queueAutosave();
}

function exportDesignJson() {
  return { width: canvas.width, height: canvas.height, data: canvas.toJSON() };
}

function importDesignJson(parsed) {
  setSize(parsed.width || 1080, parsed.height || 1080);
  canvas.loadFromJSON(parsed.data, () => canvas.renderAll());
}

function renderProjects() {
  const items = getProjects();
  projectListEl.innerHTML = '';
  items.forEach((p) => {
    const row = document.createElement('div');
    row.className = 'project-item';
    row.innerHTML = `<span>${p.name}</span><button data-open="${p.id}">Open</button><button data-del="${p.id}">Del</button>`;
    projectListEl.appendChild(row);
  });
}

function saveProject(manual = false) {
  if (!currentUser) return;
  const name = document.getElementById('projectName').value.trim() || 'Untitled Project';
  const items = getProjects();
  const payload = exportDesignJson();
  if (!currentProjectId) currentProjectId = `p_${Date.now()}`;
  const idx = items.findIndex((x) => x.id === currentProjectId);
  const row = { id: currentProjectId, name, updatedAt: Date.now(), design: payload };
  if (idx >= 0) items[idx] = row; else items.unshift(row);
  setProjects(items);
  autosaveStatus.textContent = manual ? 'Saved manually' : 'Autosaved';
  renderProjects();
}

function openProject(id) {
  const p = getProjects().find((x) => x.id === id);
  if (!p) return;
  currentProjectId = p.id;
  document.getElementById('projectName').value = p.name;
  importDesignJson(p.design);
  autosaveStatus.textContent = `Loaded: ${p.name}`;
}

function deleteProject(id) {
  setProjects(getProjects().filter((x) => x.id !== id));
  if (currentProjectId === id) currentProjectId = null;
  renderProjects();
}

function queueAutosave() {
  if (!currentUser) return;
  autosaveStatus.textContent = 'Autosave: pending...';
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => saveProject(false), 900);
}

function renderSharedTemplates() {
  const list = getSharedTemplates();
  sharedTemplateListEl.innerHTML = '';
  list.slice(0, 20).forEach((t) => {
    const row = document.createElement('div');
    row.className = 'project-item';
    row.innerHTML = `<span>${t.name}</span><button data-loadtpl="${t.id}">Use</button><button data-deltpl="${t.id}">Del</button>`;
    sharedTemplateListEl.appendChild(row);
  });
}

function saveSharedTemplate() {
  const name = document.getElementById('sharedTemplateName').value.trim();
  if (!name) return;
  const list = getSharedTemplates();
  list.unshift({ id: `tpl_${Date.now()}`, name, design: exportDesignJson(), createdBy: currentUser || 'guest' });
  setSharedTemplates(list);
  document.getElementById('sharedTemplateName').value = '';
  renderSharedTemplates();
}

function loadSharedTemplate(id) {
  const t = getSharedTemplates().find((x) => x.id === id);
  if (!t) return;
  importDesignJson(t.design);
  autosaveStatus.textContent = `Template loaded: ${t.name}`;
  queueAutosave();
}

palette.forEach((c) => {
  const sw = document.createElement('button');
  sw.className = 'sw';
  sw.style.background = c;
  sw.addEventListener('click', () => {
    const obj = canvas.getActiveObject();
    if (!obj) return;
    obj.set('fill', c);
    canvas.requestRenderAll();
    queueAutosave();
  });
  paletteWrap.appendChild(sw);
});

// Events
document.querySelectorAll('[data-template]').forEach((b) => b.addEventListener('click', () => template(b.dataset.template)));
document.getElementById('addText').onclick = () => addText();
document.getElementById('addHeading').onclick = () => addText('Heading', 72, 800);
document.getElementById('addRect').onclick = () => addShape('rect');
document.getElementById('addCircle').onclick = () => addShape('circle');
document.getElementById('addLine').onclick = () => addShape('line');

document.getElementById('bringFront').onclick = () => { const o = canvas.getActiveObject(); if (o) canvas.bringToFront(o), queueAutosave(); };
document.getElementById('sendBack').onclick = () => { const o = canvas.getActiveObject(); if (o) canvas.sendToBack(o), queueAutosave(); };
document.getElementById('duplicate').onclick = () => {
  const o = canvas.getActiveObject();
  if (!o) return;
  o.clone((cl) => { cl.set({ left: o.left + 22, top: o.top + 22 }); canvas.add(cl).setActiveObject(cl); queueAutosave(); });
};
document.getElementById('delete').onclick = () => { const o = canvas.getActiveObject(); if (o) canvas.remove(o), queueAutosave(); };

document.getElementById('applyProps').onclick = () => {
  const o = canvas.getActiveObject();
  if (!o) return;
  o.set({ fill: document.getElementById('fill').value, stroke: document.getElementById('stroke').value, strokeWidth: Number(document.getElementById('strokeWidth').value), opacity: Number(document.getElementById('opacity').value) / 100 });
  if (o.type === 'textbox' || o.type === 'text') o.set({ fontSize: Number(document.getElementById('fontSize').value), fontWeight: document.getElementById('fontWeight').value });
  canvas.requestRenderAll();
  queueAutosave();
};

document.getElementById('applyBrand').onclick = () => {
  const p = document.getElementById('brandPrimary').value;
  const s = document.getElementById('brandSecondary').value;
  const a = document.getElementById('brandAccent').value;
  const objs = canvas.getObjects();
  objs.forEach((o, i) => { if (o.type !== 'image') o.set('fill', [p, s, a][i % 3]); });
  canvas.requestRenderAll();
  queueAutosave();
};

document.getElementById('zoom').oninput = (e) => {
  const z = Number(e.target.value) / 100;
  stage.style.transform = `scale(${z})`;
  stage.style.transformOrigin = 'top center';
};

document.getElementById('newDesign').onclick = () => { currentProjectId = null; template('instagram'); autosaveStatus.textContent = 'New design created'; };
document.getElementById('saveProject').onclick = () => saveProject(true);

document.getElementById('saveJson').onclick = () => {
  const blob = new Blob([JSON.stringify(exportDesignJson(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'pixelcraft-design.json'; a.click();
};

document.getElementById('loadJson').onclick = () => document.getElementById('jsonFile').click();
document.getElementById('jsonFile').onchange = async (e) => {
  const f = e.target.files[0]; if (!f) return;
  importDesignJson(JSON.parse(await f.text()));
  queueAutosave();
};

document.getElementById('uploadImage').onclick = () => document.getElementById('imageFile').click();
document.getElementById('imageFile').onchange = (e) => {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => fabric.Image.fromURL(r.result, (img) => { img.set({ left: 260, top: 220, scaleX: 0.45, scaleY: 0.45 }); canvas.add(img).setActiveObject(img); queueAutosave(); });
  r.readAsDataURL(f);
};

document.getElementById('exportPng').onclick = () => {
  const a = document.createElement('a'); a.href = canvas.toDataURL({ format: 'png', quality: 1 }); a.download = 'pixelcraft-export.png'; a.click();
};

document.getElementById('loginBtn').onclick = () => {
  const n = document.getElementById('userName').value.trim();
  if (!n) return;
  currentUser = n;
  localStorage.setItem('pc_user', n);
  autosaveStatus.textContent = `Logged in as ${n}`;
  renderProjects();
};

document.getElementById('saveSharedTemplate').onclick = saveSharedTemplate;

projectListEl.addEventListener('click', (e) => {
  const openId = e.target.getAttribute('data-open');
  const delId = e.target.getAttribute('data-del');
  if (openId) openProject(openId);
  if (delId) deleteProject(delId);
});

sharedTemplateListEl.addEventListener('click', (e) => {
  const id = e.target.getAttribute('data-loadtpl');
  const del = e.target.getAttribute('data-deltpl');
  if (id) loadSharedTemplate(id);
  if (del) { setSharedTemplates(getSharedTemplates().filter((x) => x.id !== del)); renderSharedTemplates(); }
});

canvas.on('object:modified', queueAutosave);
canvas.on('object:added', queueAutosave);
canvas.on('object:removed', queueAutosave);
canvas.on('selection:created', syncProps);
canvas.on('selection:updated', syncProps);

function syncProps() {
  const o = canvas.getActiveObject();
  if (!o) return;
  if (o.fill) document.getElementById('fill').value = o.fill;
  document.getElementById('stroke').value = o.stroke || '#000000';
  document.getElementById('strokeWidth').value = o.strokeWidth || 0;
  document.getElementById('opacity').value = Math.round((o.opacity ?? 1) * 100);
  if (o.fontSize) document.getElementById('fontSize').value = o.fontSize;
  if (o.fontWeight) document.getElementById('fontWeight').value = o.fontWeight.toString();
}

if (currentUser) document.getElementById('userName').value = currentUser;
template('instagram');
renderProjects();
renderSharedTemplates();
autosaveStatus.textContent = currentUser ? `Logged in as ${currentUser}` : 'Login for autosave';
