import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#091427');
scene.fog = new THREE.Fog('#091427', 40, 180);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 500);
camera.position.set(30, 26, 34);

const hemi = new THREE.HemisphereLight(0x89b4ff, 0x1b2b18, 0.8);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 1.1);
sun.position.set(40, 60, 20);
sun.castShadow = true;
scene.add(sun);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(220, 220, 64, 64),
  new THREE.MeshStandardMaterial({ color: '#284d2a', roughness: 0.95, metalness: 0.05 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

function addFence(x, z, w, d) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: '#5d729f' });
  const postGeo = new THREE.BoxGeometry(0.5, 2.4, 0.5);
  const railGeo = new THREE.BoxGeometry(1, 0.2, 0.2);
  for (let i = -w / 2; i <= w / 2; i += 2.5) {
    const p1 = new THREE.Mesh(postGeo, mat); p1.position.set(x + i, 1.2, z - d / 2); g.add(p1);
    const p2 = new THREE.Mesh(postGeo, mat); p2.position.set(x + i, 1.2, z + d / 2); g.add(p2);
  }
  for (let i = -d / 2; i <= d / 2; i += 2.5) {
    const p1 = new THREE.Mesh(postGeo, mat); p1.position.set(x - w / 2, 1.2, z + i); g.add(p1);
    const p2 = new THREE.Mesh(postGeo, mat); p2.position.set(x + w / 2, 1.2, z + i); g.add(p2);
  }
  for (let i = -w / 2; i <= w / 2; i += 1) {
    const r1 = new THREE.Mesh(railGeo, mat); r1.position.set(x + i, 1.9, z - d / 2); g.add(r1);
    const r2 = new THREE.Mesh(railGeo, mat); r2.position.set(x + i, 1.9, z + d / 2); g.add(r2);
  }
  for (let i = -d / 2; i <= d / 2; i += 1) {
    const r1 = new THREE.Mesh(railGeo, mat); r1.rotation.y = Math.PI / 2; r1.position.set(x - w / 2, 1.9, z + i); g.add(r1);
    const r2 = new THREE.Mesh(railGeo, mat); r2.rotation.y = Math.PI / 2; r2.position.set(x + w / 2, 1.9, z + i); g.add(r2);
  }
  scene.add(g);
}
addFence(0, 0, 120, 120);

const dinoEntities = [];

function makeLeg(mat, s = 1) {
  const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.35 * s, 1.2 * s, 4, 8), mat);
  leg.castShadow = true;
  return leg;
}

function createDino(type, pos = new THREE.Vector3((Math.random() - 0.5) * 80, 0, (Math.random() - 0.5) * 80)) {
  const cfg = {
    trex: { color: '#6b4a2d', scale: 1.6, speed: 0.028, mood: 'predator', tail: 2.4, neck: 0.6 },
    raptor: { color: '#4f5f3a', scale: 1.1, speed: 0.046, mood: 'hunter', tail: 1.8, neck: 0.5 },
    trike: { color: '#5b6b58', scale: 1.5, speed: 0.022, mood: 'herbivore', tail: 1.2, neck: 0.7 },
    brachio: { color: '#62735f', scale: 2.0, speed: 0.016, mood: 'giant', tail: 1.8, neck: 1.8 },
  }[type];

  const mat = new THREE.MeshStandardMaterial({ color: cfg.color, roughness: 0.85, metalness: 0.05 });
  const g = new THREE.Group();
  g.position.copy(pos);

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(1.4 * cfg.scale, 2.2 * cfg.scale, 8, 14), mat);
  body.rotation.z = Math.PI / 2;
  body.castShadow = true;
  g.add(body);

  const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.45 * cfg.scale, 1.3 * cfg.scale * cfg.neck, 6, 12), mat);
  neck.position.set(1.8 * cfg.scale, 1.1 * cfg.scale, 0);
  neck.rotation.z = -0.6;
  neck.castShadow = true;
  g.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.65 * cfg.scale, 12, 12), mat);
  head.position.set(2.5 * cfg.scale, 1.7 * cfg.scale * cfg.neck, 0);
  head.castShadow = true;
  g.add(head);

  const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.32 * cfg.scale, 2.0 * cfg.scale * cfg.tail, 6, 10), mat);
  tail.position.set(-2.3 * cfg.scale, 0.7 * cfg.scale, 0);
  tail.rotation.z = 0.9;
  tail.castShadow = true;
  g.add(tail);

  const legs = [makeLeg(mat, cfg.scale), makeLeg(mat, cfg.scale), makeLeg(mat, cfg.scale), makeLeg(mat, cfg.scale)];
  legs[0].position.set(1.2 * cfg.scale, -1.0 * cfg.scale, 0.8 * cfg.scale);
  legs[1].position.set(1.2 * cfg.scale, -1.0 * cfg.scale, -0.8 * cfg.scale);
  legs[2].position.set(-0.9 * cfg.scale, -1.0 * cfg.scale, 0.8 * cfg.scale);
  legs[3].position.set(-0.9 * cfg.scale, -1.0 * cfg.scale, -0.8 * cfg.scale);
  legs.forEach((l) => g.add(l));

  scene.add(g);

  const entity = { type, cfg, g, body, head, neck, tail, legs, t: Math.random() * 1000, dir: Math.random() * Math.PI * 2, targetTurn: (Math.random() - 0.5) * 0.2 };
  dinoEntities.push(entity);
  addFeed(`New ${type.toUpperCase()} entered the park enclosure.`);
}

const moneyEl = document.getElementById('money');
const guestsEl = document.getElementById('guests');
const repEl = document.getElementById('rep');
const powerEl = document.getElementById('power');
const feed = document.getElementById('feed');

let money = 9000, guests = 240, rep = 61, power = 74;

function addFeed(text) {
  const d = document.createElement('div');
  d.className = 'event';
  d.textContent = text;
  feed.prepend(d);
  while (feed.children.length > 20) feed.removeChild(feed.lastChild);
}

function refreshStats() {
  moneyEl.textContent = Math.round(money);
  guestsEl.textContent = Math.round(guests);
  repEl.textContent = Math.round(rep);
  powerEl.textContent = Math.round(power);
}

function economyTick() {
  money += guests * 0.18 + rep * 0.9 - dinoEntities.length * 6;
  guests += (rep - 55) * 0.06 + Math.max(0, dinoEntities.length - 2) * 0.4;
  rep += (dinoEntities.length > 0 ? 0.06 : -0.08);
  power -= dinoEntities.length * 0.02;
  if (power < 30) rep -= 0.08;
  if (Math.random() < 0.02) addFeed('Tour buses are arriving. Guest demand increased.');
  if (Math.random() < 0.01) addFeed('Ranger team completed routine health inspection.');
  rep = Math.max(0, Math.min(100, rep));
  power = Math.max(0, Math.min(100, power));
  guests = Math.max(0, Math.min(1800, guests));
  refreshStats();
}
setInterval(economyTick, 1200);
refreshStats();

let storm = false;
const rain = new THREE.Group();
for (let i = 0; i < 220; i++) {
  const drop = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8), new THREE.MeshBasicMaterial({ color: '#8ac7ff', transparent: true, opacity: 0.6 }));
  drop.position.set((Math.random() - 0.5) * 180, Math.random() * 60 + 20, (Math.random() - 0.5) * 180);
  rain.add(drop);
}
scene.add(rain);
rain.visible = false;

function triggerStorm() {
  storm = !storm;
  rain.visible = storm;
  addFeed(storm ? '⚠️ Tropical storm entering the island.' : '✅ Storm cleared. Operations normalized.');
  if (storm) { rep -= 5; guests -= 30; power -= 8; refreshStats(); }
}

let tourCamera = false;

document.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const { action, kind } = btn.dataset;
  if (action === 'spawn') {
    const cost = { trex: 1800, raptor: 1300, trike: 1500, brachio: 2100 }[kind];
    if (money < cost) return addFeed('Insufficient funds for dino incubation.');
    money -= cost;
    createDino(kind);
    rep += 2;
    guests += 15;
    refreshStats();
  }
  if (action === 'camera') {
    if (kind === 'tour') { tourCamera = true; addFeed('Tour camera activated.'); }
    if (kind === 'top') { tourCamera = false; camera.position.set(30, 26, 34); addFeed('Top camera activated.'); }
  }
  if (action === 'weather' && kind === 'storm') triggerStorm();
});

createDino('trike', new THREE.Vector3(-20, 0, -10));
createDino('raptor', new THREE.Vector3(15, 0, 12));
createDino('brachio', new THREE.Vector3(-6, 0, 24));

const clock = new THREE.Clock();

function animate() {
  const dt = clock.getDelta();
  const t = performance.now() * 0.001;

  for (const e of dinoEntities) {
    e.t += dt;
    e.dir += e.targetTurn * 0.01;
    if (Math.random() < 0.008) e.targetTurn = (Math.random() - 0.5) * 0.7;

    const vx = Math.cos(e.dir) * e.cfg.speed * 60 * dt;
    const vz = Math.sin(e.dir) * e.cfg.speed * 60 * dt;

    e.g.position.x += vx;
    e.g.position.z += vz;

    // keep inside park
    if (Math.abs(e.g.position.x) > 56 || Math.abs(e.g.position.z) > 56) {
      e.dir += Math.PI * 0.6;
    }

    e.g.rotation.y = -e.dir;

    // species-specific animation
    const walk = Math.sin((e.t * 8) + e.g.position.x * 0.2);
    const run = Math.sin((e.t * 16) + e.g.position.z * 0.4);

    if (e.type === 'trex') {
      e.legs[0].rotation.x = walk * 0.4; e.legs[1].rotation.x = -walk * 0.4;
      e.legs[2].rotation.x = -walk * 0.3; e.legs[3].rotation.x = walk * 0.3;
      e.tail.rotation.y = Math.sin(e.t * 3) * 0.22;
      e.head.rotation.x = Math.sin(e.t * 2) * 0.05;
    } else if (e.type === 'raptor') {
      e.legs[0].rotation.x = run * 0.8; e.legs[1].rotation.x = -run * 0.8;
      e.legs[2].rotation.x = -run * 0.6; e.legs[3].rotation.x = run * 0.6;
      e.tail.rotation.y = Math.sin(e.t * 8) * 0.33;
      e.head.rotation.x = Math.sin(e.t * 6) * 0.09;
    } else if (e.type === 'trike') {
      e.legs[0].rotation.x = walk * 0.28; e.legs[1].rotation.x = -walk * 0.28;
      e.legs[2].rotation.x = -walk * 0.25; e.legs[3].rotation.x = walk * 0.25;
      e.head.rotation.y = Math.sin(e.t * 2.5) * 0.16;
      e.tail.rotation.y = Math.sin(e.t * 2.8) * 0.12;
    } else if (e.type === 'brachio') {
      e.legs[0].rotation.x = walk * 0.2; e.legs[1].rotation.x = -walk * 0.2;
      e.legs[2].rotation.x = -walk * 0.18; e.legs[3].rotation.x = walk * 0.18;
      e.neck.rotation.z = -0.6 + Math.sin(e.t * 1.6) * 0.07;
      e.head.rotation.x = Math.sin(e.t * 1.2) * 0.04;
      e.tail.rotation.y = Math.sin(e.t * 1.8) * 0.1;
    }
  }

  if (storm) {
    rain.children.forEach((d) => {
      d.position.y -= 1.4;
      if (d.position.y < 0) d.position.y = Math.random() * 60 + 30;
    });
  }

  if (tourCamera && dinoEntities.length) {
    const lead = dinoEntities[0].g.position;
    camera.position.lerp(new THREE.Vector3(lead.x + 10, 8, lead.z + 10), 0.03);
    camera.lookAt(lead.x, 2, lead.z);
  } else {
    camera.lookAt(0, 0, 0);
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();

addFeed('Welcome, Director. Build your 3D dinosaur destination.');

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});
