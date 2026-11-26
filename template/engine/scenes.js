// Fondos procedurales con estética "ilustración cálida pintada".
const { createCanvas } = require('@napi-rs/canvas');
const W = 1080, H = 1920;

function vignette(ctx, strength = 0.55) {
  const g = ctx.createRadialGradient(W / 2, H * 0.48, H * 0.25, W / 2, H * 0.5, H * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(20,8,0,${strength})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function grain(ctx, n = 9000, a = 0.05) {
  let s = 7;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = r() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`;
    ctx.fillRect(r() * W, r() * H, 2 + r() * 5, 2 + r() * 5);
  }
}
function lin(ctx, y0, y1, stops) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}
const INK = '#2a1a10';

// ---------------------------------------------------------------- COCINA (noche)
function paintKitchen(ctx) {
  const floorY = 1330;
  ctx.fillStyle = lin(ctx, 0, floorY, [[0, '#c98a45'], [0.5, '#e8bd72'], [1, '#d9a45a']]);
  ctx.fillRect(0, 0, W, floorY);
  // azulejos
  ctx.fillStyle = '#efe0b8'; ctx.fillRect(0, 760, 470, 570);
  ctx.strokeStyle = 'rgba(120,80,30,.35)'; ctx.lineWidth = 3;
  for (let x = 0; x <= 470; x += 62) { ctx.beginPath(); ctx.moveTo(x, 760); ctx.lineTo(x, 1330); ctx.stroke(); }
  for (let y = 760; y <= 1330; y += 62) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(470, y); ctx.stroke(); }
  // campana
  ctx.fillStyle = '#8d9096'; ctx.strokeStyle = INK; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(30, 520); ctx.lineTo(370, 520); ctx.lineTo(430, 700); ctx.lineTo(0, 700); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#6f7378'; ctx.fillRect(130, 330, 130, 190); ctx.strokeRect(130, 330, 130, 190);
  // estantería con plantas y botes
  ctx.fillStyle = '#7a4a22'; ctx.fillRect(30, 740, 400, 18); ctx.strokeRect(30, 740, 400, 18);
  ctx.fillStyle = '#b9c9b0'; ctx.strokeStyle = INK; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.roundRect(310, 650, 52, 90, 10); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#c0432b'; ctx.beginPath(); ctx.roundRect(90, 690, 80, 50, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#3f7a3b';
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(130 + (i - 3) * 14, 650 - Math.abs(i - 2.5) * 6, 14, 46, (i - 2.5) * 0.35, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  // ventana noche
  ctx.fillStyle = '#5b3a1c'; ctx.fillRect(690, 330, 330, 430);
  const sky = ctx.createLinearGradient(0, 350, 0, 740); sky.addColorStop(0, '#0b1230'); sky.addColorStop(1, '#2a3c78');
  ctx.fillStyle = sky; ctx.fillRect(710, 350, 290, 390);
  ctx.fillStyle = '#fff';
  [[740, 400], [800, 470], [880, 410], [940, 520], [770, 590], [900, 640], [960, 400], [830, 700]].forEach(([x, y], i) => {
    ctx.globalAlpha = 0.6 + (i % 3) * 0.15; ctx.fillRect(x, y, 5, 5); ctx.fillRect(x - 3, y + 1, 11, 3); ctx.fillRect(x + 1, y - 3, 3, 11);
  });
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#5b3a1c'; ctx.fillRect(845, 350, 12, 390); ctx.fillRect(710, 540, 290, 12);
  ctx.fillStyle = '#8a5528'; ctx.fillRect(670, 740, 370, 26);
  // maceta
  ctx.fillStyle = '#b4572b'; ctx.strokeStyle = INK; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(930, 700); ctx.lineTo(990, 700); ctx.lineTo(980, 742); ctx.lineTo(940, 742); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#2f6b34';
  for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(960 + (i - 2) * 12, 672, 11, 34, (i - 2) * 0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  // reloj
  ctx.fillStyle = '#fdf4de'; ctx.strokeStyle = '#4a2a12'; ctx.lineWidth = 9;
  ctx.beginPath(); ctx.arc(560, 470, 84, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = INK; ctx.lineWidth = 4;
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(560 + Math.cos(a) * 68, 470 + Math.sin(a) * 68); ctx.lineTo(560 + Math.cos(a) * 77, 470 + Math.sin(a) * 77); ctx.stroke(); }
  ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(560, 470); ctx.lineTo(560 + 34, 470 + 30); ctx.stroke();
  ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(560, 470); ctx.lineTo(560 - 5, 470 - 56); ctx.stroke();
  // suelo de madera
  ctx.fillStyle = lin(ctx, floorY, H, [[0, '#8a5a30'], [1, '#5a3418']]); ctx.fillRect(0, floorY, W, H - floorY);
  ctx.strokeStyle = 'rgba(30,12,2,.4)'; ctx.lineWidth = 3;
  for (let i = -8; i <= 18; i++) { ctx.beginPath(); ctx.moveTo(540 + i * 36, floorY); ctx.lineTo(540 + i * 120 - 540 * 0.3, H); ctx.stroke(); }
  for (let y = floorY + 70; y < H; y += 110 + (y - floorY) * 0.12) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.strokeStyle = '#3b2210'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(0, floorY); ctx.lineTo(W, floorY); ctx.stroke();
  // alfombra
  ctx.fillStyle = '#9b5a3a'; ctx.strokeStyle = INK; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(40, 1560); ctx.lineTo(430, 1560); ctx.lineTo(470, 1690); ctx.lineTo(0, 1690); ctx.closePath(); ctx.fill(); ctx.stroke();
  // fogón
  ctx.fillStyle = '#7e8288'; ctx.strokeStyle = INK; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.roundRect(10, 1120, 420, 440, 12); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#4a4d52'; ctx.fillRect(10, 1120, 420, 34);
  ctx.fillStyle = '#1f2022'; ctx.beginPath(); ctx.roundRect(60, 1280, 320, 230, 12); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#3c3e42'; ctx.beginPath(); ctx.roundRect(78, 1298, 284, 160, 8); ctx.fill();
  ctx.strokeStyle = '#b9bcc1'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(90, 1262); ctx.lineTo(350, 1262); ctx.stroke();
  ctx.fillStyle = '#2c2d30'; for (const bx of [90, 190, 290, 360]) { ctx.beginPath(); ctx.arc(bx, 1200, 14, 0, 7); ctx.fill(); }
  // sartén
  ctx.fillStyle = '#26272a'; ctx.strokeStyle = INK; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.ellipse(160, 1112, 130, 26, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#d99b4d'; ctx.beginPath(); ctx.ellipse(160, 1108, 96, 17, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#26272a'; ctx.beginPath(); ctx.roundRect(278, 1098, 110, 18, 8); ctx.fill(); ctx.stroke();
  // isla/mostrador derecha
  ctx.fillStyle = '#7f4f26'; ctx.strokeStyle = INK; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(690, 1200); ctx.lineTo(1080, 1180); ctx.lineTo(1080, 1290); ctx.lineTo(650, 1300); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#9a6330'; ctx.beginPath(); ctx.moveTo(690, 1200); ctx.lineTo(1080, 1180); ctx.lineTo(1080, 1200); ctx.lineTo(680, 1230); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#5c3618'; ctx.beginPath(); ctx.moveTo(650, 1300); ctx.lineTo(1080, 1290); ctx.lineTo(1080, 1760); ctx.lineTo(670, 1760); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#c28a4a'; ctx.beginPath(); ctx.roundRect(940, 1130, 130, 36, 18); ctx.fill(); ctx.stroke(); // rodillo
  // taburete
  ctx.fillStyle = '#6b3d1c'; ctx.beginPath(); ctx.ellipse(970, 1560, 70, 24, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = INK; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(920, 1580); ctx.lineTo(900, 1800); ctx.moveTo(1020, 1580); ctx.lineTo(1040, 1800); ctx.stroke();
}
function kitchenDynamic(ctx, t) {
  // luz cálida de la lámpara colgante (parpadeo suave) + cable y bombilla
  ctx.save();
  ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(150, 0); ctx.lineTo(150, 170); ctx.stroke();
  ctx.fillStyle = '#2f2f33'; ctx.beginPath(); ctx.moveTo(95, 250); ctx.quadraticCurveTo(150, 130, 205, 250); ctx.closePath(); ctx.fill(); ctx.stroke();
  const k = 0.95 + Math.sin(t * 3) * 0.03;
  const g = ctx.createRadialGradient(150, 260, 10, 150, 330, 560 * k);
  g.addColorStop(0, 'rgba(255,236,170,.75)'); g.addColorStop(0.4, 'rgba(255,200,110,.24)'); g.addColorStop(1, 'rgba(255,190,90,0)');
  ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(0, 0, W, 1000);
  ctx.restore();
}

// ---------------------------------------------------------------- AULA
function paintClassroom(ctx) {
  const floorY = 1380;
  ctx.fillStyle = lin(ctx, 0, floorY, [[0, '#efe2c2'], [1, '#d8c08e']]); ctx.fillRect(0, 0, W, floorY);
  ctx.fillStyle = '#e9dcc0';
  for (let x = 0; x < W; x += 180) { ctx.fillRect(x, 0, 170, 180); }
  ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 3;
  for (let x = 0; x <= W; x += 180) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 180); ctx.stroke(); }
  // pizarra
  ctx.fillStyle = '#8a5a2c'; ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.fillRect(40, 300, 1000, 620); ctx.strokeRect(40, 300, 1000, 620);
  const gb = ctx.createLinearGradient(0, 320, 0, 900); gb.addColorStop(0, '#2d5a45'); gb.addColorStop(1, '#244a39');
  ctx.fillStyle = gb; ctx.fillRect(62, 322, 956, 576);
  ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 7; ctx.lineCap = 'round';
  [[120, 420, 360], [120, 500, 260], [620, 430, 280], [620, 520, 340]].forEach(([x, y, l]) => { ctx.beginPath(); ctx.moveTo(x, y); for (let i = 0; i < l; i += 40) ctx.lineTo(x + i + 20, y + (i % 80 ? 10 : -10)); ctx.stroke(); });
  ctx.fillStyle = '#7a4a22'; ctx.fillRect(40, 910, 1000, 20);
  // suelo
  ctx.fillStyle = lin(ctx, floorY, H, [[0, '#b9b2a2'], [1, '#85806f']]); ctx.fillRect(0, floorY, W, H - floorY);
  ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 3;
  for (let y = floorY + 60; y < H; y += 100) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.strokeStyle = '#6b5b3c'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(0, floorY); ctx.lineTo(W, floorY); ctx.stroke();
  // ventana
  ctx.fillStyle = '#9ad0ff'; ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.fillRect(790, 60, 240, 190); ctx.strokeRect(790, 60, 240, 190);
}
function paintClassroomFront(ctx) {
  // pupitre en primer plano
  ctx.fillStyle = '#b98550'; ctx.strokeStyle = INK; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(-40, 1520); ctx.lineTo(560, 1500); ctx.lineTo(620, 1620); ctx.lineTo(-40, 1650); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#4a4f57'; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(40, 1640); ctx.lineTo(30, 1900); ctx.moveTo(560, 1615); ctx.lineTo(580, 1900); ctx.stroke();
}

const SCENES = {
  kitchen: { paint: paintKitchen, dynamic: kitchenDynamic, vig: 0.6 },
  classroom: { paint: paintClassroom, front: paintClassroomFront, vig: 0.4 },
};

class Scene {
  constructor(name) {
    const def = SCENES[name];
    if (!def) throw new Error('Escena desconocida: ' + name + ' (disponibles: ' + Object.keys(SCENES).join(', ') + ')');
    this.def = def;
    this.cache = createCanvas(W, H);
    const c = this.cache.getContext('2d');
    def.paint(c);
    this.frontCache = null;
    if (def.front) { this.frontCache = createCanvas(W, H); def.front(this.frontCache.getContext('2d')); }
    vignette(c, def.vig); grain(c);
  }
  drawBack(ctx, t) {
    ctx.drawImage(this.cache, 0, 0);
    if (this.def.dynamic) this.def.dynamic(ctx, t);
  }
  drawFront(ctx) { if (this.frontCache) ctx.drawImage(this.frontCache, 0, 0); }
}
module.exports = { Scene, SCENES, W, H };
