const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const GROUND_Y = canvas.height - 90;
let best = Number(localStorage.getItem('skyline-best') || 0);
bestEl.textContent = best;

let running = false;
let paused = false;
let score = 0;
let speed = 6;
let frame = 0;

const player = {
  x: 120,
  y: GROUND_Y,
  w: 44,
  h: 64,
  vy: 0,
  gravity: 0.9,
  jump: -16,
  onGround: true,
};

const obstacles = [];
const orbs = [];

function reset() {
  score = 0;
  speed = 6;
  frame = 0;
  obstacles.length = 0;
  orbs.length = 0;
  player.y = GROUND_Y;
  player.vy = 0;
  player.onGround = true;
}

function startGame() {
  reset();
  running = true;
  paused = false;
  overlay.style.display = 'none';
}

function endGame() {
  running = false;
  best = Math.max(best, score);
  localStorage.setItem('skyline-best', String(best));
  bestEl.textContent = best;
  overlay.style.display = 'grid';
  overlay.querySelector('h1').textContent = 'Game Over';
  overlay.querySelector('p').textContent = `Score: ${score} · Best: ${best}`;
  startBtn.textContent = 'Play Again';
}

function jump() {
  if (!running || paused) return;
  if (player.onGround) {
    player.vy = player.jump;
    player.onGround = false;
  }
}

function spawn() {
  if (frame % 80 === 0) {
    const h = 30 + Math.random() * 50;
    obstacles.push({ x: canvas.width + 20, y: GROUND_Y + (64 - h), w: 34 + Math.random() * 20, h });
  }
  if (frame % 140 === 0) {
    orbs.push({ x: canvas.width + 20, y: 220 + Math.random() * 140, r: 10 });
  }
}

function collide(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function update() {
  if (!running || paused) return;
  frame++;
  speed += 0.0015;

  player.vy += player.gravity;
  player.y += player.vy;
  if (player.y >= GROUND_Y) {
    player.y = GROUND_Y;
    player.vy = 0;
    player.onGround = true;
  }

  spawn();

  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i];
    o.x -= speed;
    if (o.x + o.w < 0) obstacles.splice(i, 1);
    if (collide(player, o)) return endGame();
  }

  for (let i = orbs.length - 1; i >= 0; i--) {
    const o = orbs[i];
    o.x -= speed;
    if (o.x + o.r < 0) orbs.splice(i, 1);
    const hit = player.x < o.x + o.r && player.x + player.w > o.x - o.r && player.y < o.y + o.r && player.y + player.h > o.y - o.r;
    if (hit) {
      score += 25;
      orbs.splice(i, 1);
    }
  }

  score += 1;
  scoreEl.textContent = score;
}

function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  g.addColorStop(0, '#0b1835');
  g.addColorStop(1, '#090f1f');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#142448';
  for (let i = 0; i < 9; i++) {
    const x = ((i * 130) - (frame * speed * 0.3)) % (canvas.width + 100);
    ctx.fillRect(x, 180 + (i % 3) * 20, 70, 220);
  }

  ctx.fillStyle = '#111b33';
  ctx.fillRect(0, GROUND_Y + player.h, canvas.width, 90);
}

function drawPlayer() {
  ctx.fillStyle = '#60a5fa';
  ctx.fillRect(player.x, player.y, player.w, player.h);
  ctx.fillStyle = '#dbeafe';
  ctx.fillRect(player.x + 26, player.y + 12, 10, 10);
}

function draw() {
  drawBackground();

  ctx.strokeStyle = 'rgba(255,255,255,.07)';
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y + player.h + 1);
  ctx.lineTo(canvas.width, GROUND_Y + player.h + 1);
  ctx.stroke();

  drawPlayer();

  ctx.fillStyle = '#f43f5e';
  obstacles.forEach((o) => ctx.fillRect(o.x, o.y, o.w, o.h));

  orbs.forEach((o) => {
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
    ctx.fillStyle = '#22d3ee';
    ctx.fill();
  });

  if (paused && running) {
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 46px Inter';
    ctx.fillText('Paused', canvas.width / 2 - 80, canvas.height / 2);
  }
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

startBtn.addEventListener('click', startGame);
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    e.preventDefault();
    jump();
  }
  if (e.key.toLowerCase() === 'p' && running) paused = !paused;
});

loop();
