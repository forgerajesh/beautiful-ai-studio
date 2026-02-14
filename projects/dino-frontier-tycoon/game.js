const els = {
  money: document.getElementById('money'), guests: document.getElementById('guests'), power: document.getElementById('power'), research: document.getElementById('research'), rep: document.getElementById('rep'), year: document.getElementById('year'),
  map: document.getElementById('map'), feed: document.getElementById('feed'), overview: document.getElementById('overview'), unlocks: document.getElementById('unlocks')
};

const costs = {
  build: { enclosure: 1200, power: 900, lab: 1500, hotel: 1800, security: 1400 },
  hatch: { herbivore: 500, carnivore: 1000 },
  op: { marketing: 600, patrol: 350, heal: 450 },
  research: { geno1: 80, fence1: 100, tour1: 120, med1: 140 }
};

let state = {
  money: 6000, guests: 120, power: 40, research: 0, rep: 50, year: 1,
  buildings: { enclosure: 1, power: 1, lab: 0, hotel: 0, security: 0 },
  dinos: { herbivore: 2, carnivore: 0 },
  incidents: [],
  unlocks: [],
  buffs: { safety: 0, medicine: 0, tours: 0, genome: 0 }
};

function log(msg){
  const p=document.createElement('p');
  p.textContent=`• ${msg}`;
  els.feed.prepend(p);
  while(els.feed.children.length>80) els.feed.removeChild(els.feed.lastChild);
}

function canAfford(v){ return state.money >= v; }
function spend(v){ state.money -= v; }

function recalcDerived(){
  const cap = state.buildings.hotel * 120 + 200;
  if(state.guests > cap) state.guests = cap;

  const demandPower = state.buildings.enclosure*8 + state.buildings.hotel*10 + state.dinos.herbivore*2 + state.dinos.carnivore*4 + state.buildings.lab*4;
  state.power = Math.max(0, state.buildings.power*60 - demandPower);

  if(state.power===0){ state.rep = Math.max(0, state.rep-2); state.guests = Math.max(20, state.guests-8); }

  state.rep = Math.max(0, Math.min(100, state.rep));
}

function render(){
  recalcDerived();
  els.money.textContent = Math.round(state.money);
  els.guests.textContent = Math.round(state.guests);
  els.power.textContent = Math.round(state.power);
  els.research.textContent = Math.round(state.research);
  els.rep.textContent = Math.round(state.rep);
  els.year.textContent = state.year;

  const tiles = [
    ['Enclosures', state.buildings.enclosure, '🦕'],
    ['Power Plants', state.buildings.power, '⚡'],
    ['Research Labs', state.buildings.lab, '🧪'],
    ['Hotels', state.buildings.hotel, '🏨'],
    ['Security', state.buildings.security, '🛡️'],
    ['Herbivores', state.dinos.herbivore, '🌿'],
    ['Carnivores', state.dinos.carnivore, '🥩'],
    ['Incidents', state.incidents.length, '🚨'],
    ['Reputation', `${state.rep}%`, '⭐'],
    ['Guests', state.guests, '😊'],
    ['Research', state.research, '🧬'],
    ['Year', state.year, '⏱️'],
  ];
  els.map.innerHTML = '';
  tiles.forEach(([name,val,icon])=>{
    const d=document.createElement('div'); d.className='tile';
    d.innerHTML=`<b>${icon} ${name}</b><span>${val}</span>`;
    els.map.appendChild(d);
  });

  els.overview.innerHTML = `
    <li>Revenue / tick: $${Math.round(state.guests*0.9 + state.rep*1.5)}</li>
    <li>Ops cost / tick: $${Math.round(60 + state.dinos.herbivore*4 + state.dinos.carnivore*9 + state.buildings.security*8)}</li>
    <li>Safety index: ${Math.max(0,Math.min(100, 45 + state.buildings.security*12 + state.buffs.safety*15 - state.dinos.carnivore*8))}</li>
    <li>Genome quality: ${50 + state.buffs.genome*20}%</li>
  `;

  els.unlocks.innerHTML = state.unlocks.length ? state.unlocks.map(u=>`<li>${u}</li>`).join('') : '<li>No unlocks yet</li>';
}

function doBuild(kind){
  const c = costs.build[kind];
  if(!canAfford(c)) return log('Not enough money.');
  spend(c);
  state.buildings[kind]++;
  state.rep += 1;
  log(`${kind} constructed successfully.`);
  render();
}

function hatch(kind){
  if(state.buildings.enclosure < 1) return log('Build an enclosure first.');
  const c = costs.hatch[kind];
  if(!canAfford(c)) return log('Not enough money.');
  if(kind==='carnivore' && !state.unlocks.includes('Genome Stability I')) return log('Research Genome Stability I first for carnivores.');
  spend(c);
  state.dinos[kind]++;
  state.rep += kind==='carnivore' ? 3 : 1;
  state.guests += kind==='carnivore' ? 20 : 10;
  log(`${kind} added to park.`);
  render();
}

function operation(kind){
  const c = costs.op[kind];
  if(!canAfford(c)) return log('Not enough money.');
  spend(c);
  if(kind==='marketing'){ state.guests += 35; state.rep += 2; log('Marketing increased footfall.'); }
  if(kind==='patrol'){ state.buffs.safety += 1; log('Rangers improved park safety.'); }
  if(kind==='heal'){ state.buffs.medicine += 1; state.incidents = state.incidents.filter(i=>i!=='Sickness'); log('Veterinary response completed.'); }
  render();
}

function research(kind){
  const c = costs.research[kind];
  if(state.research < c) return log('Not enough research points.');
  if(state.unlocks.includes(label(kind))) return log('Already researched.');
  state.research -= c;
  if(kind==='geno1'){ state.buffs.genome=1; state.unlocks.push('Genome Stability I'); }
  if(kind==='fence1'){ state.buffs.safety=2; state.unlocks.push('Advanced Fencing'); }
  if(kind==='tour1'){ state.buffs.tours=1; state.unlocks.push('Guest Tours'); state.guests += 40; }
  if(kind==='med1'){ state.buffs.medicine=2; state.unlocks.push('Medical Protocols'); }
  log(`Research complete: ${label(kind)}`);
  render();
}

function label(k){ return ({geno1:'Genome Stability I', fence1:'Advanced Fencing', tour1:'Guest Tours', med1:'Medical Protocols'})[k]; }

function incidentCheck(){
  const roll = Math.random();
  const risk = Math.max(0.03, 0.18 - state.buildings.security*0.015 - state.buffs.safety*0.02 + state.dinos.carnivore*0.02);
  if(roll > risk) return;

  const pool = ['Storm', 'Sickness', 'Fence Breach'];
  const ev = pool[Math.floor(Math.random()*pool.length)];
  state.incidents.push(ev);

  if(ev==='Storm'){
    state.money -= 500;
    state.rep -= 5;
    log('🌩️ Storm damaged facilities. Quick repairs required.');
  }
  if(ev==='Sickness'){
    state.rep -= 4;
    state.guests = Math.max(20, state.guests - 25);
    log('🧫 Dino sickness detected. Trigger vet response.');
  }
  if(ev==='Fence Breach'){
    const loss = 300 + state.dinos.carnivore*120;
    state.money -= loss;
    state.rep -= 8;
    state.guests = Math.max(10, state.guests - 40);
    log('🚨 Fence breach! Security and patrol needed.');
  }
  render();
}

function gameTick(){
  const revenue = state.guests*0.9 + state.rep*1.5 + state.buffs.tours*20;
  const ops = 60 + state.dinos.herbivore*4 + state.dinos.carnivore*9 + state.buildings.security*8 + state.buildings.lab*6;
  state.money += revenue - ops;
  state.research += state.buildings.lab*6 + 1;

  if(state.money < -1000){
    log('💥 Bankruptcy warning. Emergency funding injected.');
    state.money = 1500;
    state.rep = Math.max(20, state.rep-8);
  }

  state.guests += (state.rep>60 ? 3 : -1) + state.buffs.tours;
  if(state.guests < 20) state.guests = 20;

  incidentCheck();
  render();
}

function yearTick(){
  state.year += 1;
  state.rep += 2;
  log(`📈 Year ${state.year} started. Market demand increased.`);
  render();
}

function save(){
  localStorage.setItem('dino-frontier-save', JSON.stringify(state));
  log('Game saved.');
}

function load(){
  const raw = localStorage.getItem('dino-frontier-save');
  if(!raw) return;
  try { state = JSON.parse(raw); log('Save loaded.'); } catch {}
}

function reset(){
  localStorage.removeItem('dino-frontier-save');
  location.reload();
}

document.addEventListener('click',(e)=>{
  const btn = e.target.closest('button[data-action]');
  if(!btn) return;
  const { action, kind } = btn.dataset;
  if(action==='build') doBuild(kind);
  if(action==='hatch') hatch(kind);
  if(action==='op') operation(kind);
  if(action==='research') research(kind);
  if(action==='save') save();
  if(action==='reset') reset();
});

load();
render();
log('Welcome Director. Build your world-class dinosaur park.');
setInterval(gameTick, 2200);
setInterval(yearTick, 28000);
