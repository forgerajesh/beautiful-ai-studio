const API = 'http://localhost:8795/api';
const canvas = new fabric.Canvas('canvas', { preserveObjectStacking: true });
const stage = document.getElementById('stage');
const stageSize = document.getElementById('stageSize');
const autosaveStatus = document.getElementById('autosaveStatus');

const palette = ['#111827','#4f46e5','#3b82f6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#e5e7eb','#ffffff'];
const paletteWrap = document.getElementById('palette');
const projectListEl = document.getElementById('projectList');
const sharedTemplateListEl = document.getElementById('sharedTemplateList');
const commentListEl = document.getElementById('commentList');
const versionListEl = document.getElementById('versionList');

let token = localStorage.getItem('pc_token') || '';
let currentProjectId = null;
let autosaveTimer = null;

const authFetch = (url, opts={}) => fetch(url, { ...opts, headers: { 'Content-Type':'application/json', ...(opts.headers||{}), Authorization: `Bearer ${token}` } });

function setSize(w, h) {
  canvas.setWidth(w);
  canvas.setHeight(h);
  stageSize.textContent = `${w} x ${h}`;
  canvas.requestRenderAll();
}
function exportDesignJson() { return { width: canvas.width, height: canvas.height, data: canvas.toJSON() }; }
function importDesignJson(parsed) { setSize(parsed.width || 1080, parsed.height || 1080); canvas.loadFromJSON(parsed.data, () => canvas.renderAll()); }

function addText(txt='Edit me', size=36, weight=600){
  const t = new fabric.Textbox(txt,{left:180,top:160,width:360,fontSize:size,fontWeight:weight,fill:'#1f2937',fontFamily:'Inter'});
  canvas.add(t).setActiveObject(t);
}
function addShape(kind){
  let obj;
  if(kind==='rect') obj=new fabric.Rect({left:220,top:220,width:220,height:120,rx:10,ry:10,fill:'#4f46e5'});
  if(kind==='circle') obj=new fabric.Circle({left:260,top:220,radius:70,fill:'#06b6d4'});
  if(kind==='line') obj=new fabric.Line([220,260,520,260],{stroke:'#111827',strokeWidth:4});
  canvas.add(obj).setActiveObject(obj);
}

function template(kind){
  canvas.clear();
  if(kind==='instagram'){
    setSize(1080,1080); canvas.setBackgroundColor('#f8fafc', canvas.renderAll.bind(canvas));
    addShape('rect'); canvas.getActiveObject().set({left:80,top:120,width:920,height:460,fill:'#111827'});
    addText('Launch your brand campaign',74,800); canvas.getActiveObject().set({left:120,top:180,fill:'#ffffff',width:860});
    addText('PixelCraft Studio',38,600); canvas.getActiveObject().set({left:120,top:660,fill:'#1f2937'});
  }
  if(kind==='presentation'){
    setSize(1600,900); canvas.setBackgroundColor('#ffffff', canvas.renderAll.bind(canvas));
    addShape('rect'); canvas.getActiveObject().set({left:0,top:0,width:520,height:900,fill:'#111827',selectable:false,evented:false});
    addText('QBR 2026',78,800); canvas.getActiveObject().set({left:80,top:170,fill:'#ffffff'});
    addText('Growth with clarity',42,500); canvas.getActiveObject().set({left:80,top:300,fill:'#dbeafe'});
    addText('Drop your charts and visuals here',44,600); canvas.getActiveObject().set({left:620,top:420,fill:'#1f2937',width:900});
  }
  if(kind==='poster'){
    setSize(1080,1520); canvas.setBackgroundColor('#0f172a', canvas.renderAll.bind(canvas));
    addText('MUSIC NIGHT',120,900); canvas.getActiveObject().set({left:90,top:180,fill:'#f8fafc'});
    addText('Live at Skyline Arena',52,500); canvas.getActiveObject().set({left:90,top:380,fill:'#a5b4fc'});
    addShape('rect'); canvas.getActiveObject().set({left:90,top:980,width:900,height:280,fill:'#4f46e5'});
    addText('FRIDAY · 8 PM',88,800); canvas.getActiveObject().set({left:130,top:1060,fill:'#ffffff'});
  }
  canvas.requestRenderAll();
  queueAutosave();
}

async function register(){
  const name = document.getElementById('authName').value.trim();
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const r = await fetch(`${API}/auth/register`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,email,password})});
  const d = await r.json();
  if(d.token){ token=d.token; localStorage.setItem('pc_token', token); autosaveStatus.textContent='Registered & logged in'; await loadProjects(); await loadTemplates(); }
  else alert(d.error || 'Register failed');
}
async function login(){
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const r = await fetch(`${API}/auth/login`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
  const d = await r.json();
  if(d.token){ token=d.token; localStorage.setItem('pc_token', token); autosaveStatus.textContent='Logged in'; await loadProjects(); await loadTemplates(); }
  else alert(d.error || 'Login failed');
}
function logout(){ token=''; localStorage.removeItem('pc_token'); autosaveStatus.textContent='Logged out'; projectListEl.innerHTML=''; sharedTemplateListEl.innerHTML=''; }

async function saveProject(manual=false){
  if(!token) return;
  const name = document.getElementById('projectName').value.trim() || 'Untitled Project';
  const payload = exportDesignJson();
  const r = await authFetch(`${API}/projects`, { method:'POST', body: JSON.stringify({ id: currentProjectId, name, width: payload.width, height: payload.height, design: payload, note: manual ? 'Manual save' : 'Autosave' }) });
  const d = await r.json();
  if(d.id){ currentProjectId = d.id; autosaveStatus.textContent = manual ? 'Saved manually' : 'Autosaved'; await loadProjects(); if (currentProjectId) { await loadVersions(); } }
}

async function loadProjects(){
  if(!token) return;
  const r = await authFetch(`${API}/projects`); const d = await r.json();
  projectListEl.innerHTML='';
  (d.projects||[]).forEach((p)=>{
    const row=document.createElement('div'); row.className='project-item';
    row.innerHTML=`<span>${p.name} <small>(${p.my_role})</small></span><button data-open="${p.id}">Open</button>`;
    projectListEl.appendChild(row);
  });
}

async function openProject(id){
  const r = await authFetch(`${API}/projects/${id}`); const d = await r.json();
  if(!d.project) return;
  currentProjectId = d.project.id;
  document.getElementById('projectName').value = d.project.name;
  importDesignJson(d.project.design);
  autosaveStatus.textContent = `Loaded: ${d.project.name}`;
  await loadComments();
  await loadVersions();
}

async function shareProject(){
  if(!currentProjectId) return alert('Open/save a project first');
  const email = document.getElementById('shareEmail').value.trim();
  const role = document.getElementById('shareRole').value;
  const r = await authFetch(`${API}/projects/${currentProjectId}/share`, { method:'POST', body: JSON.stringify({ email, role }) });
  const d = await r.json();
  if(d.ok) autosaveStatus.textContent = `Shared with ${email} as ${role}`;
  else alert(d.error || 'Share failed');
}

async function loadVersions(){
  if(!currentProjectId) return;
  const r = await authFetch(`${API}/projects/${currentProjectId}/versions`); const d = await r.json();
  versionListEl.innerHTML='';
  (d.versions||[]).forEach(v=>{
    const row=document.createElement('div'); row.className='project-item';
    row.innerHTML=`<span>${v.note || 'Version'}<br/><small>${v.by_name} · ${new Date(v.created_at).toLocaleString()}</small></span>`;
    versionListEl.appendChild(row);
  });
}

async function addComment(){
  if(!currentProjectId) return;
  const text = document.getElementById('commentText').value.trim();
  if(!text) return;
  await authFetch(`${API}/projects/${currentProjectId}/comments`, { method:'POST', body: JSON.stringify({ comment: text }) });
  document.getElementById('commentText').value='';
  await loadComments();
}

async function loadComments(){
  if(!currentProjectId) return;
  const r = await authFetch(`${API}/projects/${currentProjectId}/comments`); const d = await r.json();
  commentListEl.innerHTML='';
  (d.comments||[]).forEach(c=>{
    const row=document.createElement('div'); row.className='project-item';
    row.innerHTML=`<span>${c.comment}<br/><small>${c.by_name} · ${new Date(c.created_at).toLocaleString()}</small></span>`;
    commentListEl.appendChild(row);
  });
}

async function saveSharedTemplate(){
  if(!token) return alert('login first');
  const name = document.getElementById('sharedTemplateName').value.trim();
  if(!name) return;
  const design = exportDesignJson();
  const r = await authFetch(`${API}/templates`, { method:'POST', body: JSON.stringify({ name, design }) });
  const d = await r.json();
  if(d.id){ document.getElementById('sharedTemplateName').value=''; await loadTemplates(); }
}

async function loadTemplates(){
  if(!token) return;
  const r = await authFetch(`${API}/templates`); const d = await r.json();
  sharedTemplateListEl.innerHTML='';
  (d.templates||[]).forEach(t=>{
    const row=document.createElement('div'); row.className='project-item';
    row.innerHTML=`<span>${t.name}</span><button data-loadtpl="${t.id}">Use</button>`;
    sharedTemplateListEl.appendChild(row);
  });
}

async function useTemplate(id){
  const r = await authFetch(`${API}/templates/${id}`); const d = await r.json();
  if(d.template){ importDesignJson(d.template.design); queueAutosave(); }
}



async function applyAIDesign(design, noteText) {
  if (!design) return;
  canvas.clear();
  setSize(1080, 1080);
  canvas.setBackgroundColor(design.background || '#ffffff', canvas.renderAll.bind(canvas));
  (design.objects || []).forEach((o) => {
    let obj;
    if (o.type === 'rect') obj = new fabric.Rect({ left:o.left||100, top:o.top||100, width:o.width||300, height:o.height||120, fill:o.fill||'#111827', opacity:o.opacity ?? 1, rx:10, ry:10 });
    if (o.type === 'circle') obj = new fabric.Circle({ left:o.left||100, top:o.top||100, radius:o.radius||80, fill:o.fill||'#4f46e5', opacity:o.opacity ?? 1 });
    if (o.type === 'text') obj = new fabric.Textbox(o.text || 'AI Text', { left:o.left||120, top:o.top||120, width:o.width||700, fill:o.fill||'#111827', fontSize:o.fontSize||48, fontWeight:o.fontWeight||'700', fontFamily:'Inter', opacity:o.opacity ?? 1 });
    if (obj) canvas.add(obj);
  });
  canvas.requestRenderAll();
  autosaveStatus.textContent = noteText;
  queueAutosave();
}

function queueAutosave(){
  if(!token) return;
  autosaveStatus.textContent = 'Autosave: pending...';
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => saveProject(false), 1000);
}

palette.forEach((c)=>{ const sw=document.createElement('button'); sw.className='sw'; sw.style.background=c; sw.onclick=()=>{ const o=canvas.getActiveObject(); if(!o) return; o.set('fill',c); canvas.requestRenderAll(); queueAutosave(); }; paletteWrap.appendChild(sw); });

// UI actions
document.querySelectorAll('[data-template]').forEach((b)=>b.onclick=()=>template(b.dataset.template));
document.getElementById('addText').onclick=()=>addText();
document.getElementById('addHeading').onclick=()=>addText('Heading',72,800);
document.getElementById('addRect').onclick=()=>addShape('rect');
document.getElementById('addCircle').onclick=()=>addShape('circle');
document.getElementById('addLine').onclick=()=>addShape('line');
document.getElementById('bringFront').onclick=()=>{const o=canvas.getActiveObject(); if(o){canvas.bringToFront(o);queueAutosave();}};
document.getElementById('sendBack').onclick=()=>{const o=canvas.getActiveObject(); if(o){canvas.sendToBack(o);queueAutosave();}};
document.getElementById('duplicate').onclick=()=>{const o=canvas.getActiveObject(); if(!o) return; o.clone((cl)=>{cl.set({left:o.left+20,top:o.top+20}); canvas.add(cl).setActiveObject(cl); queueAutosave();});};
document.getElementById('delete').onclick=()=>{const o=canvas.getActiveObject(); if(o){canvas.remove(o);queueAutosave();}};

document.getElementById('applyProps').onclick=()=>{
  const o=canvas.getActiveObject(); if(!o) return;
  o.set({ fill:document.getElementById('fill').value, stroke:document.getElementById('stroke').value, strokeWidth:Number(document.getElementById('strokeWidth').value), opacity:Number(document.getElementById('opacity').value)/100 });
  if(o.type==='textbox' || o.type==='text') o.set({ fontSize:Number(document.getElementById('fontSize').value), fontWeight:document.getElementById('fontWeight').value });
  canvas.requestRenderAll(); queueAutosave();
};

document.getElementById('applyBrand').onclick=()=>{const p=document.getElementById('brandPrimary').value,s=document.getElementById('brandSecondary').value,a=document.getElementById('brandAccent').value; canvas.getObjects().forEach((o,i)=>{if(o.type!=='image') o.set('fill',[p,s,a][i%3]);}); canvas.requestRenderAll(); queueAutosave();};

document.getElementById('zoom').oninput=(e)=>{const z=Number(e.target.value)/100; stage.style.transform=`scale(${z})`; stage.style.transformOrigin='top center';};
document.getElementById('newDesign').onclick=()=>{currentProjectId=null; template('instagram'); autosaveStatus.textContent='New design created';};
document.getElementById('saveProject').onclick=()=>saveProject(true);
document.getElementById('registerBtn').onclick=register;
document.getElementById('loginBtn').onclick=login;
document.getElementById('logoutBtn').onclick=logout;
document.getElementById('shareProject').onclick=shareProject;
document.getElementById('addComment').onclick=addComment;
document.getElementById('saveSharedTemplate').onclick=saveSharedTemplate;

document.getElementById('aiGenerate').onclick = async () => {
  if (!token) return alert('Login first to use AI Designer');
  const prompt = document.getElementById('aiPrompt').value.trim();
  const tone = document.getElementById('aiTone').value;
  if (!prompt) return alert('Enter AI prompt');
  autosaveStatus.textContent = 'AI generating layout...';
  const r = await authFetch(`${API}/ai/design`, { method: 'POST', body: JSON.stringify({ prompt, tone }) });
  const d = await r.json();
  if (!d.design) return alert(d.error || 'AI generation failed');
  await applyAIDesign(d.design, d.fallback ? 'AI fallback applied (set LLM key on server)' : 'AI layout generated');
};

document.getElementById('aiCopy').onclick = async () => {
  if (!token) return alert('Login first to use AI Copywriter');
  const prompt = document.getElementById('aiPrompt').value.trim();
  const tone = document.getElementById('aiTone').value;
  if (!prompt) return alert('Enter AI prompt');
  const r = await authFetch(`${API}/ai/copy`, { method: 'POST', body: JSON.stringify({ prompt, tone }) });
  const d = await r.json();
  if (!d.copy) return alert(d.error || 'AI copy failed');
  const t = new fabric.Textbox(d.copy.headline || 'AI Headline', { left: 120, top: 120, width: 820, fontSize: 68, fontWeight: '800', fill: '#111827' });
  const b = new fabric.Textbox(d.copy.body || '', { left: 120, top: 240, width: 760, fontSize: 34, fontWeight: '500', fill: '#334155' });
  canvas.add(t); canvas.add(b); canvas.setActiveObject(t); canvas.requestRenderAll();
  autosaveStatus.textContent = d.fallback ? 'AI copy fallback applied' : 'AI copy generated';
  queueAutosave();
};

document.getElementById('aiPalette').onclick = async () => {
  if (!token) return alert('Login first to use AI Palette');
  const prompt = document.getElementById('aiPrompt').value.trim();
  const tone = document.getElementById('aiTone').value;
  const r = await authFetch(`${API}/ai/palette`, { method: 'POST', body: JSON.stringify({ prompt, tone }) });
  const d = await r.json();
  const colors = d.colors || [];
  if (!colors.length) return alert('No palette generated');
  const ids = ['brandPrimary','brandSecondary','brandAccent'];
  ids.forEach((id, i) => { if (colors[i]) document.getElementById(id).value = colors[i]; });
  document.getElementById('applyBrand').click();
  autosaveStatus.textContent = d.fallback ? 'AI palette fallback applied' : 'AI palette generated';
};

document.getElementById('aiVariants').onclick = async () => {
  if (!token) return alert('Login first to create variants');
  const prompt = document.getElementById('aiPrompt').value.trim();
  const tone = document.getElementById('aiTone').value;
  if (!prompt) return alert('Enter AI prompt');
  const r = await authFetch(`${API}/ai/variants`, { method: 'POST', body: JSON.stringify({ prompt, tone }) });
  const d = await r.json();
  const vars = d.variants || [];
  if (!vars.length) return alert('No variants generated');
  await applyAIDesign(vars[0], d.fallback ? 'Variant fallback applied (first of 3)' : 'AI variants generated (applied variant 1/3)');
};

projectListEl.onclick=(e)=>{const id=e.target.getAttribute('data-open'); if(id) openProject(id);};
sharedTemplateListEl.onclick=(e)=>{const id=e.target.getAttribute('data-loadtpl'); if(id) useTemplate(id);};

document.getElementById('saveJson').onclick=()=>{const blob=new Blob([JSON.stringify(exportDesignJson(),null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='pixelcraft-design.json'; a.click();};
document.getElementById('loadJson').onclick=()=>document.getElementById('jsonFile').click();
document.getElementById('jsonFile').onchange=async(e)=>{const f=e.target.files[0]; if(!f) return; importDesignJson(JSON.parse(await f.text())); queueAutosave();};
document.getElementById('uploadImage').onclick=()=>document.getElementById('imageFile').click();
document.getElementById('imageFile').onchange=(e)=>{const f=e.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=()=>fabric.Image.fromURL(r.result,(img)=>{img.set({left:260,top:220,scaleX:.45,scaleY:.45}); canvas.add(img).setActiveObject(img); queueAutosave();}); r.readAsDataURL(f);};
document.getElementById('exportPng').onclick=()=>{const a=document.createElement('a'); a.href=canvas.toDataURL({format:'png',quality:1}); a.download='pixelcraft-export.png'; a.click();};

canvas.on('object:modified', queueAutosave);
canvas.on('object:added', queueAutosave);
canvas.on('object:removed', queueAutosave);

template('instagram');
if (token) { autosaveStatus.textContent = 'Authenticated · loading projects'; loadProjects(); loadTemplates(); }
else autosaveStatus.textContent = 'Login to use cloud collaboration';
