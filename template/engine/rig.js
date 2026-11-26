// Personaje "stickman cartoon" fiel a las muestras: cabeza enorme y blanca con sombreado suave,
// ojos grandes con párpados/pestañas, torso pequeño con ropa detallada, brazos y piernas de palo
// muy finos y largos, manos con guante blanco de dedos, zapatos negros grandes.
const { Track } = require('./track');
const spr = require('./sprites');

const D2R = Math.PI / 180;
const INK = '#17130f';

const EXPR_DEFAULT = {
  smile: 0.25, smirk: 0, open: 0, oShape: 0, teeth: 0, eye: 1, lid: 0, pupil: 1, star: 0,
  browLH: 0, browRH: 0, browLT: 0, browRT: 0, blush: 0, sweat: 0, lookX: 0, lookY: 0,
};
const EMOTES = {
  neutral: {},
  happy:   { smile: 0.9, open: 0.55, teeth: 1, browLH: 0.5, browRH: 0.5, blush: 0.8 },
  love:    { smile: 1, open: 0.35, star: 1, eye: 1.08, browLH: 0.7, browRH: 0.7, blush: 1 },
  smug:    { smile: 0.7, smirk: 0.8, lid: 0.5, browLH: 0.7, browRH: -0.1, browLT: -6, browRT: 8 },
  deadpan: { smile: 0, lid: 0.45, browLH: -0.1, browRH: -0.1, pupil: 0.9 },
  shock:   { smile: 0, open: 1, oShape: 0.8, eye: 1.25, pupil: 0.55, browLH: 1, browRH: 1 },
  angry:   { smile: -0.6, open: 0.5, teeth: 1, browLT: 22, browRT: -22, browLH: -0.2, browRH: -0.2, sweat: 1, pupil: 0.8 },
  sad:     { smile: -0.7, browLT: -16, browRT: 16, browLH: 0.4, browRH: 0.4, eye: 1.05, pupil: 1.2 },
  cheeky:  { smile: 0.9, open: 0.3, teeth: 1, lid: 0.25, browLH: 0.9, browRH: 0.2, blush: 0.4 },
  nervous: { smile: -0.15, open: 0.25, teeth: 1, sweat: 1, browLT: -12, browRT: 12, browLH: 0.5, browRH: 0.5, pupil: 0.7 },
};

// medidas (escala 1, pies en y=0, arriba = negativo)
const HIP = -340, THIGH = 172, SHIN = 172, TORSO = 122, ARM = 108, HR = 114, HRY = 106;

function ik(ax, ay, tx, ty, l1, l2, dir) {
  let dx = tx - ax, dy = ty - ay, d = Math.hypot(dx, dy);
  const max = (l1 + l2) * 0.999;
  if (d > max) { dx *= max / d; dy *= max / d; d = max; tx = ax + dx; ty = ay + dy; }
  d = Math.max(d, 1e-3);
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const mx = ax + (dx * a) / d, my = ay + (dy * a) / d;
  return { ex: mx + (-dy / d) * h * dir, ey: my + (dx / d) * h * dir, hx: tx, hy: ty };
}
function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
function shade(hex, k) {            // oscurece (k<0) o aclara (k>0)
  const n = parseInt(hex.slice(1), 16);
  const f = c => Math.max(0, Math.min(255, Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

class Character {
  constructor(name, look = {}) {
    this.name = name;
    this.look = Object.assign({
      skin: '#fbfaf6', top: '#e8742a', topStyle: 'tee', apron: null, shoe: '#1d1815',
      hair: 'spiky', hairColor: '#17130f', lashes: false, glasses: false, sunglasses: false, tie: null,
    }, look);
    this.t = new Track(Object.assign({
      x: 540, y: 1600, scale: 1, flip: 1, lean: 0, headTilt: 0, sq: 0, jump: 0, walk: 0, phase: 0, shiver: 0,
      lhx: -50, lhy: 150, rhx: 50, rhy: 150, lItemRot: -20, rItemRot: 20, alpha: 1,
      lw: 0, lwx: 0, lwy: 0, rw: 0, rwx: 0, rwy: 0,     // objetivo de mano en coordenadas de mundo (peso 0..1)
    }, EXPR_DEFAULT));
    this.holds = { l: [], r: [] };
    this.speech = [];
    this.z = 0;
  }
  to(t, dur, props, e) { this.t.to(t, dur, props, e); return this; }
  set(t, props) { this.t.set(t, props); return this; }
  emote(t, name, dur = 0.14) { this.t.to(t, dur, Object.assign({}, EXPR_DEFAULT, EMOTES[name] || {}), 'outCubic'); return this; }
  hold(t, hand, item) { this.holds[hand].push({ t, item }); return this; }
  held(hand, t) { let it = null; for (const h of this.holds[hand]) if (h.t <= t) it = h.item; return it; }
  pop(t, amt = 0.14) { this.t.to(t, 0.07, { sq: amt }, 'outQuad'); this.t.to(t + 0.07, 0.35, { sq: 0 }, 'outElastic'); return this; }
  hop(t, h = 90, dur = 0.5) { this.t.to(t, dur / 2, { jump: h }, 'outQuad'); this.t.to(t + dur / 2, dur / 2, { jump: 0 }, 'inQuad'); return this; }
  walk(t, dur, toX, cycles) {
    const x0 = this.t.val('x', t), c = cycles ?? Math.max(1, Math.abs(toX - x0) / 170), ph = this.t.val('phase', t);
    this.t.to(t, 0.08, { walk: 1 }, 'linear'); this.t.to(t, dur, { x: toX }, 'inOutQuad');
    this.t.to(t, dur, { phase: ph + c }, 'linear'); this.t.to(t + dur - 0.08, 0.08, { walk: 0 }, 'linear');
    return this;
  }
  shake(t, dur, amt = 1) { this.t.to(t, 0.05, { shiver: amt }, 'linear'); this.t.to(t + dur, 0.1, { shiver: 0 }, 'linear'); return this; }
  val(p, t) { return this.t.val(p, t); }
  voice(t) {
    for (const s of this.speech) if (t >= s.t0 && t <= s.t1) return s.env[Math.min(Math.floor((t - s.t0) * s.envRate), s.env.length - 1)] || 0;
    return -1;
  }

  // ------------------------------------------------------------------ dibujo
  draw(ctx, t) {
    const v = p => this.t.val(p, t), L = this.look;
    const alpha = v('alpha'); if (alpha <= 0.01) return;
    const sq = v('sq'), walk = v('walk'), phase = v('phase');
    const breathe = Math.sin(t * 2.6 + this.z) * 3 * (1 - walk);
    const bounce = walk * Math.abs(Math.sin(phase * Math.PI * 2)) * 14;
    const jitter = v('shiver') ? Math.sin(t * 90) * 4 * v('shiver') : 0;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(v('x') + jitter, v('y') - v('jump'));
    const sc = v('scale');
    ctx.scale(sc * v('flip') * (1 - sq * 0.45), sc * (1 + sq));

    // sombra
    ctx.save();
    ctx.globalAlpha = alpha * 0.3 * (1 - Math.min(0.6, v('jump') / 220));
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(0, 6, 120, 18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    const hipY = HIP - bounce + breathe * 0.4;
    const lean = v('lean') * D2R;
    const rot = (x, y) => ({ x: x * Math.cos(lean) - y * Math.sin(lean), y: x * Math.sin(lean) + y * Math.cos(lean) });
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    // piernas finas + zapatos grandes
    const cl = Math.sin(phase * Math.PI * 2), cr = Math.sin(phase * Math.PI * 2 + Math.PI);
    const feet = [
      { hx: -17, x: -50 + walk * cl * 66, y: -walk * Math.max(0, Math.cos(phase * Math.PI * 2)) * 48 },
      { hx: 17, x: 50 + walk * cr * 66, y: -walk * Math.max(0, -Math.cos(phase * Math.PI * 2)) * 48 },
    ];
    for (const f of feet) {
      const k = ik(f.hx, hipY + 6, f.x, f.y - 16, THIGH, SHIN, 1);
      ctx.strokeStyle = INK; ctx.lineWidth = 10;
      ctx.beginPath(); ctx.moveTo(f.hx, hipY + 6); ctx.lineTo(k.ex, k.ey); ctx.lineTo(k.hx, k.hy); ctx.stroke();
      if (L.sprites && L.sprites.shoe) spriteShoe(ctx, spr.load(spr.resolve(L.sprites.dir, L.sprites.shoe)), k.hx, f.y);
      else shoe(ctx, k.hx, f.y, L.shoe);
    }

    const hip = { x: 0, y: hipY };
    const P = (x, y) => { const r = rot(x, y); return { x: hip.x + r.x, y: hip.y + r.y }; };
    const sx = (L.sprites && L.sprites.shoulderX) || 42, neck = P(0, -TORSO - 6), shL = P(-sx, -TORSO + 12), shR = P(sx, -TORSO + 12);

    const bx = v('x') + jitter, by = v('y') - v('jump'), kx = sc * v('flip') * (1 - sq * 0.45), ky = sc * (1 + sq);
    this.handPos = this.handPos || {};
    const arm = (sh, hx, hy, dir, hand) => {
      const ww = v(hand + 'w');
      if (ww > 0.001) {
        const tx = (v(hand + 'wx') - bx) / kx - sh.x, ty = (v(hand + 'wy') - by) / ky - sh.y;
        hx = hx * (1 - ww) + tx * ww; hy = hy * (1 - ww) + ty * ww;
      }
      const sway = Math.sin(t * 2.2 + (dir > 0 ? 1 : 0)) * 4 * (1 - walk);
      const wsw = walk * Math.sin(phase * Math.PI * 2 + (dir > 0 ? 0 : Math.PI)) * 44;
      const k = ik(sh.x, sh.y, sh.x + hx + wsw * 0.3, sh.y + hy + sway - Math.abs(wsw) * 0.25, ARM, ARM, dir);
      ctx.strokeStyle = INK; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(sh.x, sh.y); ctx.lineTo(k.ex, k.ey); ctx.lineTo(k.hx, k.hy); ctx.stroke();
      this.handPos[hand] = { x: bx + kx * k.hx, y: by + ky * k.hy, ang: Math.atan2(ky * (k.hy - k.ey), kx * (k.hx - k.ex)) };
      return { x: k.hx, y: k.hy, ex: k.ex, ey: k.ey, hand };
    };

    // brazo trasero
    const hb = arm(shR, v('rhx'), v('rhy'), -1, 'r');
    this._hand(ctx, hb, this.held('r', t), v('rItemRot'));
    // torso
    this._torso(ctx, hip, lean, L);
    // brazo delantero
    const hf = arm(shL, v('lhx'), v('lhy'), 1, 'l');
    this._hand(ctx, hf, this.held('l', t), v('lItemRot'));

    // cuello + cabeza
    ctx.strokeStyle = INK; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(neck.x, neck.y + 8); ctx.lineTo(neck.x, neck.y - 12); ctx.stroke();
    ctx.save();
    ctx.translate(neck.x, neck.y - 12);
    ctx.rotate((v('headTilt') + v('lean') * 0.5) * D2R);
    ctx.translate(0, -HRY + 6);
    this._head(ctx, t, v);
    ctx.restore();
    ctx.restore();
  }

  _torso(ctx, hip, a, L) {
    ctx.save(); ctx.translate(hip.x, hip.y); ctx.rotate(a);
    if (L.sprites && L.sprites.torso) {
      const t = spr.load(spr.resolve(L.sprites.dir, L.sprites.torso)), w = L.sprites.torsoW || 140, h = w * t.h / t.w;
      ctx.drawImage(t.img, -w / 2, -TORSO - 8, w, h); ctx.restore(); return;
    }
    const top = -TORSO;
    const body = () => {
      ctx.beginPath();
      ctx.moveTo(-44, top + 6); ctx.quadraticCurveTo(0, top - 14, 44, top + 6);
      ctx.quadraticCurveTo(54, top + 64, 38, 14); ctx.quadraticCurveTo(0, 28, -38, 14);
      ctx.quadraticCurveTo(-54, top + 64, -44, top + 6); ctx.closePath();
    };
    const grad = (c) => { const g = ctx.createLinearGradient(-44, 0, 44, 0); g.addColorStop(0, shade(c, 0.08)); g.addColorStop(0.55, c); g.addColorStop(1, shade(c, -0.32)); return g; };
    const style = L.topStyle;
    const baseCol = L.top;
    ctx.lineWidth = 4.5; ctx.strokeStyle = INK;
    // mangas (detrás del cuerpo no; encima con gradiente)
    body(); ctx.fillStyle = grad(baseCol); ctx.fill(); ctx.stroke();
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.ellipse(s * 46, top + 16, 23, 27, s * 0.35, 0, Math.PI * 2); ctx.fillStyle = grad(baseCol); ctx.fill(); ctx.stroke();
    }
    ctx.save(); body(); ctx.clip();
    if (style === 'tee') {
      ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-14, -20); ctx.quadraticCurveTo(-4, -4, -18, 10); ctx.moveTo(18, -30); ctx.quadraticCurveTo(26, -14, 16, 6); ctx.stroke();
    }
    if (style === 'jacket') {           // chupa de cuero negra con cremallera y cuello clerical
      ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.beginPath(); ctx.moveTo(-34, top + 14); ctx.lineTo(-10, top + 4); ctx.lineTo(-18, 10); ctx.lineTo(-40, 10); ctx.fill();
      ctx.strokeStyle = '#8b8e96'; ctx.lineWidth = 3; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(6, top + 6); ctx.lineTo(6, 20); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#e9e9e9'; ctx.fillRect(-9, top + 2, 18, 13);
    }
    if (style === 'blazer') {           // americana de tweed + camisa blanca + corbata
      ctx.fillStyle = '#f4f2ec'; ctx.beginPath(); ctx.moveTo(-14, top + 2); ctx.lineTo(14, top + 2); ctx.lineTo(6, 20); ctx.lineTo(-6, 20); ctx.fill();
      ctx.fillStyle = L.tie || '#16161a'; ctx.beginPath(); ctx.moveTo(-5, top + 6); ctx.lineTo(5, top + 6); ctx.lineTo(8, -6); ctx.lineTo(0, 20); ctx.lineTo(-8, -6); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 3;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 14, top + 2); ctx.lineTo(s * 4, 8); ctx.lineTo(s * 12, 20); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,255,255,.08)';
      for (let i = 0; i < 24; i++) ctx.fillRect(-36 + hash(i) * 70, top + 8 + hash(i + 40) * 110, 4, 2);
    }
    if (style === 'apron') {
      ctx.fillStyle = 'rgba(0,0,0,.14)'; ctx.fillRect(-46, top, 92, 22);
    }
    ctx.restore();
    // cuello / escote
    if (style === 'tee' || style === 'apron') {
      ctx.fillStyle = L.skin; ctx.strokeStyle = INK; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-14, top + 2); ctx.quadraticCurveTo(0, top + 22, 14, top + 2); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    if (style === 'apron' && L.apron) {   // delantal
      const ap = L.apron;
      ctx.beginPath(); ctx.moveTo(-26, top + 38); ctx.lineTo(26, top + 38); ctx.lineTo(36, 8);
      ctx.quadraticCurveTo(56, 40, 66, 74); ctx.quadraticCurveTo(0, 96, -66, 74); ctx.quadraticCurveTo(-56, 40, -36, 8); ctx.closePath();
      ctx.fillStyle = grad(ap); ctx.fill(); ctx.lineWidth = 4.5; ctx.strokeStyle = INK; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-22, top + 38); ctx.lineTo(-14, top + 4); ctx.moveTo(22, top + 38); ctx.lineTo(14, top + 4); ctx.stroke();
      ctx.beginPath(); ctx.roundRect(-20, 4, 40, 34, 7); ctx.fillStyle = shade(ap, -0.1); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-30, 60); ctx.quadraticCurveTo(-8, 70, -14, 84); ctx.moveTo(30, 58); ctx.quadraticCurveTo(10, 70, 16, 86); ctx.stroke();
    }
    ctx.restore();
  }

  _hand(ctx, h, item, itemRot) {
    const ang = Math.atan2(h.y - h.ey, h.x - h.ex);
    ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(ang);   // +x = dirección del antebrazo
    if (item) {
      ctx.save(); ctx.rotate(itemRot * D2R - ang + ang); drawItem(ctx, item); ctx.restore();
    }
    ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.fillStyle = '#fff'; ctx.scale(1.18, 1.18);
    if (!item && L_SPR(this)) { const hs = spr.load(spr.resolve(this.look.sprites.dir, this.look.sprites.hand)), w = this.look.sprites.handW || 100, hh = w * hs.h / hs.w; ctx.scale(1 / 1.18, 1 / 1.18); ctx.drawImage(hs.img, -w * 0.18, -hh / 2, w, hh); ctx.restore(); return; }
    if (item) {                         // puño con dedos sobre el objeto
      ctx.beginPath(); ctx.ellipse(8, 0, 22, 19, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.ellipse(18, i * 11, 11, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    } else {                            // mano abierta de 3 dedos + pulgar, estilo guante de dibujo
      for (const [fa, fl] of [[-0.55, 30], [0, 34], [0.55, 30]]) {
        ctx.save(); ctx.rotate(fa); ctx.beginPath(); ctx.roundRect(8, -7, fl, 14, 7); ctx.fill(); ctx.stroke(); ctx.restore();
      }
      ctx.beginPath(); ctx.ellipse(8, 0, 24, 21, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.save(); ctx.rotate(-1.2); ctx.beginPath(); ctx.roundRect(8, -7, 24, 13, 6); ctx.fill(); ctx.stroke(); ctx.restore();
      ctx.beginPath(); ctx.ellipse(6, 0, 20, 17, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  _head(ctx, t, v) {
    const L = this.look;
    const SP = L.sprites && L.sprites.head;
    if (SP) {
      const f = spr.faceBox(spr.resolve(L.sprites.dir, SP)), hs = spr.load(spr.resolve(L.sprites.dir, SP));
      const k = (HR * 2 * (L.sprites.faceScale || 1)) / f.w;
      ctx.drawImage(hs.img, -(f.x + f.w / 2) * k, -(f.y + f.h / 2) * k + (L.sprites.faceDY || 0), hs.w * k, hs.h * k);
    } else {
    if (L.hair === 'curly') hairCurlyBack(ctx, L);
    if (L.hair === 'spiky') hairSpikyBack(ctx, L);
    if (L.hair === 'tight') hairTightBack(ctx, L);

    // cara blanca con sombreado de dibujo
    ctx.fillStyle = L.skin; ctx.strokeStyle = INK; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.ellipse(0, 0, HR, HRY, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, HR, HRY, 0, 0, Math.PI * 2); ctx.clip();
    const g = ctx.createRadialGradient(-28, -34, 30, 8, 10, 140);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.7, 'rgba(175,168,150,.16)'); g.addColorStop(1, 'rgba(120,110,90,.42)');
    ctx.fillStyle = g; ctx.fillRect(-HR, -HRY, HR * 2, HRY * 2);
    ctx.fillStyle = 'rgba(120,110,90,.18)'; ctx.beginPath(); ctx.ellipse(30, 96, 120, 40, 0, 0, Math.PI * 2); ctx.fill();   // sombra bajo la barbilla
    ctx.restore();
    ctx.beginPath(); ctx.ellipse(0, 0, HR, HRY, 0, 0, Math.PI * 2); ctx.stroke();
    }

    // rubor
    const bl = v('blush');
    if (bl > 0.02) for (const s of [-1, 1]) {
      const gg = ctx.createRadialGradient(s * 74, 36, 2, s * 74, 36, 34);
      gg.addColorStop(0, `rgba(255,105,115,${0.8 * Math.min(1, bl)})`); gg.addColorStop(1, 'rgba(255,105,115,0)');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(s * 74, 36, 34, 0, Math.PI * 2); ctx.fill();
    }

    // ojos grandes
    let blink = 0; const bt = (t + this.z * 0.37) % 3.4; if (bt < 0.14) blink = Math.sin((bt / 0.14) * Math.PI);
    const lid = Math.max(v('lid'), blink), es = v('eye');
    for (const s of [-1, 1]) {
      const ex = s * 46, ey = -6, rx = 31 * Math.min(1.12, es), ry = 36 * es;
      ctx.save();
      ctx.beginPath(); ctx.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.save(); ctx.clip();
      ctx.fillStyle = 'rgba(120,110,100,.22)'; ctx.fillRect(ex - rx, ey - ry, rx * 2, ry * 0.5);   // sombra del párpado
      const px = ex + v('lookX') * 12, py = ey + v('lookY') * 13, pr = 15 * v('pupil');
      if (v('star') > 0.5) { star(ctx, px, py, pr * 1.6, pr * 0.75, 5, '#2a1a10'); star(ctx, px, py, pr * 0.95, pr * 0.42, 5, '#ffe9a0'); }
      else {
        ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px - pr * 0.38, py - pr * 0.42, pr * 0.34, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(px + pr * 0.4, py + pr * 0.42, pr * 0.16, 0, Math.PI * 2); ctx.fill();
      }
      if (lid > 0.01) {
        const ly = ey - ry + ry * 2 * lid;
        ctx.fillStyle = L.skin; ctx.fillRect(ex - rx - 2, ey - ry - 2, rx * 2 + 4, ry * 2 * lid + 2);
        ctx.fillStyle = 'rgba(120,110,90,.22)'; ctx.fillRect(ex - rx - 2, ly - 8, rx * 2 + 4, 8);
        ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(ex - rx - 2, ly); ctx.lineTo(ex + rx + 2, ly); ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = INK; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
      if (L.lashes) {
        ctx.lineWidth = 6;
        for (let i = 0; i < 3; i++) {
          const ang = s > 0 ? (-18 - i * 26) * D2R : (-162 + i * 26) * D2R;
          ctx.beginPath(); ctx.moveTo(ex + Math.cos(ang) * rx, ey + Math.sin(ang) * ry);
          ctx.quadraticCurveTo(ex + Math.cos(ang) * (rx + 9), ey + Math.sin(ang) * (ry + 6), ex + Math.cos(ang - s * 0.3) * (rx + 18), ey + Math.sin(ang) * (ry + 16)); ctx.stroke();
        }
      }
      ctx.restore();
    }
    if (L.glasses) {
      ctx.strokeStyle = INK; ctx.lineWidth = 7;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * 46, -6, 44, 40, 0, 0, Math.PI * 2); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(-4, -10); ctx.quadraticCurveTo(0, -18, 4, -10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-90, -14); ctx.lineTo(-HR + 2, -22); ctx.moveTo(90, -14); ctx.lineTo(HR - 2, -22); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.18)'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * 46 - 14, -26, 9, 5, -0.6, 0, Math.PI * 2); ctx.fill(); }
    }
    // cejas gruesas
    ctx.strokeStyle = INK; ctx.lineWidth = 10; ctx.lineCap = 'round';
    for (const s of [-1, 1]) {
      const H = s < 0 ? v('browLH') : v('browRH'), T = (s < 0 ? v('browLT') : v('browRT')) * D2R;
      ctx.save(); ctx.translate(s * 46, -62 - H * 22 - (L.glasses ? 6 : 0)); ctx.rotate(s * T);
      ctx.beginPath(); ctx.moveTo(-32, 3); ctx.quadraticCurveTo(0, -11, 32, 3); ctx.stroke(); ctx.restore();
    }
    this._mouth(ctx, t, v);
    const sw = v('sweat');
    if (sw > 0.05) {
      ctx.fillStyle = '#a6dcf7'; ctx.strokeStyle = '#3b7fa8'; ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        const k = (t * 1.3 + i * 0.33) % 1;
        ctx.save(); ctx.globalAlpha *= sw * (1 - k * 0.6); drop(ctx, 104 + i * 16, -64 + k * 64 + i * 10, 11); ctx.restore();
      }
    }
    if (!SP) {
    if (L.hair === 'curly') hairCurlyFront(ctx, L);
    if (L.hair === 'spiky') hairSpikyFront(ctx, L);
    if (L.hair === 'tight') hairTightFront(ctx, L);
    }
    if (L.sunglasses) {
      ctx.save(); ctx.translate(-6, -HRY - 10); ctx.rotate(-0.12);
      ctx.fillStyle = '#16161a'; ctx.strokeStyle = INK; ctx.lineWidth = 4;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.roundRect(s * 38 - 36, -18, 72, 36, 14); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,255,255,.25)'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * 38 - 12, -6, 14, 4, -0.4, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
  }

  _mouth(ctx, t, v) {
    let open = v('open'); const env = this.voice(t);
    if (env >= 0) open = Math.max(open * 0.5, Math.min(1, 0.12 + env * 1.15));
    const smile = v('smile'), smirk = v('smirk'), o = v('oShape'), w = 36 * (1 - o * 0.5);
    ctx.save(); ctx.translate(0, 56);
    ctx.strokeStyle = INK; ctx.lineWidth = 5.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const yl = -smile * 15, yr = -smile * 15 - smirk * 16;
    if (open > 0.06) {
      const h = open * 62;
      ctx.beginPath(); ctx.moveTo(-w, yl); ctx.quadraticCurveTo(0, yl + smile * 12 - 2, w, yr);
      ctx.bezierCurveTo(w * 0.9, yr + h * 1.25, -w * 0.9, yl + h * 1.25, -w, yl); ctx.closePath();
      ctx.fillStyle = '#5b1b1c'; ctx.fill(); ctx.save(); ctx.clip();
      if (v('teeth') > 0.4 || open > 0.3) { ctx.fillStyle = '#fff'; ctx.fillRect(-w - 4, yl - 4, w * 2 + 8, 17 + open * 5); }
      if (open > 0.35) { ctx.fillStyle = '#e8737e'; ctx.beginPath(); ctx.ellipse(0, yl + h * 0.95, w * 0.62, h * 0.32, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore(); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(-w, yl); ctx.quadraticCurveTo(0, smile * 22 + 2, w, yr); ctx.stroke();
      if (smirk > 0.2) { ctx.beginPath(); ctx.moveTo(w, yr); ctx.lineTo(w + 9, yr - 9); ctx.stroke(); }
    }
    ctx.restore();
  }
}

// ---------------------------------------------------------------- piezas
function L_SPR(c) { return !!(c.look.sprites && c.look.sprites.hand); }
function spriteShoe(ctx, sh, x, y) {
  const w = 100, h = w * sh.h / sh.w;
  ctx.drawImage(sh.img, x - w * 0.34, y - h + 6, w, h);
}
function shoe(ctx, x, y, col) {
  ctx.save(); ctx.translate(x, y - 12);
  ctx.fillStyle = col; ctx.strokeStyle = INK; ctx.lineWidth = 4.5;
  ctx.beginPath(); ctx.moveTo(-26, -4); ctx.quadraticCurveTo(-30, 22, -8, 24); ctx.lineTo(48, 24);
  ctx.quadraticCurveTo(66, 22, 62, 6); ctx.quadraticCurveTo(50, -8, 28, -6); ctx.quadraticCurveTo(8, -14, -8, -12); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.beginPath(); ctx.ellipse(28, 4, 20, 5, -0.1, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8e4da'; ctx.fillRect(-24, 20, 80, 4);
  ctx.restore();
}
function drawItem(ctx, item) {
  ctx.lineWidth = 4.5; ctx.strokeStyle = INK; ctx.lineJoin = 'round';
  if (item === 'spatula') {
    ctx.fillStyle = '#b57a3b'; ctx.beginPath(); ctx.roundRect(-6, -9, 108, 15, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#c9a15a'; ctx.beginPath(); ctx.roundRect(96, -22, 60, 40, 7); ctx.fill(); ctx.stroke();
  } else if (item === 'plate') {
    ctx.fillStyle = '#f4efe6'; ctx.beginPath(); ctx.ellipse(50, 0, 80, 20, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    for (let i = 0; i < 3; i++) { ctx.fillStyle = i === 2 ? '#d99a4a' : '#c98a3c'; ctx.beginPath(); ctx.ellipse(50, -10 - i * 14, 52, 13, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  } else if (item === 'fork') {
    ctx.fillStyle = '#d6d8dc'; ctx.beginPath(); ctx.roundRect(-6, -6, 90, 12, 6); ctx.fill(); ctx.stroke();
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.roundRect(80, i * 10 - 4, 36, 8, 4); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = '#d99a4a'; ctx.beginPath(); ctx.ellipse(108, 0, 24, 22, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else if (item === 'phone') {
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.roundRect(-8, -50, 60, 100, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#6ec6ff'; ctx.beginPath(); ctx.roundRect(-2, -42, 48, 84, 6); ctx.fill();
  } else if (item === 'pointer') {       // puntero de profesor
    ctx.strokeStyle = '#7a4a22'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(230, 0); ctx.stroke();
  } else if (item === 'milk') {
    ctx.fillStyle = '#f6f6f6'; ctx.beginPath(); ctx.roundRect(0, -42, 54, 84, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#4a90d9'; ctx.fillRect(0, -8, 54, 22);
  }
}
function star(ctx, x, y, ro, ri, n, color) {
  ctx.fillStyle = color; ctx.beginPath();
  for (let i = 0; i < n * 2; i++) { const r = i % 2 ? ri : ro, a = (Math.PI / n) * i - Math.PI / 2; ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r); }
  ctx.closePath(); ctx.fill();
}
function drop(ctx, x, y, r) {
  ctx.beginPath(); ctx.moveTo(x, y - r * 1.8); ctx.quadraticCurveTo(x + r * 1.1, y, x, y + r * 0.9); ctx.quadraticCurveTo(x - r * 1.1, y, x, y - r * 1.8); ctx.fill(); ctx.stroke();
}

// ---------------------------------------------------------------- peinados
function curl(ctx, x, y, r, col, hi) {
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
  g.addColorStop(0, shade(col, 0.28)); g.addColorStop(0.6, col); g.addColorStop(1, shade(col, -0.45));
  ctx.fillStyle = g; ctx.strokeStyle = shade(col, -0.55); ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = hi; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, r * 0.55, 3.5, 5.3); ctx.stroke();
}
function hairCurlyBack(ctx, L) {
  const c = L.hairColor, hi = shade(c, 0.5);
  for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; curl(ctx, -22 + Math.cos(a) * 34, -HRY - 44 + Math.sin(a) * 28, 17, c, hi); }
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; curl(ctx, -22 + Math.cos(a) * 14, -HRY - 44 + Math.sin(a) * 12, 16, c, hi); }
  ctx.fillStyle = '#e8c15a'; ctx.strokeStyle = INK; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.roundRect(-52, -HRY - 10, 56, 12, 6); ctx.fill(); ctx.stroke();
  for (let i = 0; i < 26; i++) { const a = (-205 + i * 9.4) * D2R; curl(ctx, Math.cos(a) * (HR + 4), Math.sin(a) * (HRY + 2), 17 + (i % 3) * 3, c, hi); }
  for (const s of [-1, 1]) for (let j = 0; j < 6; j++) curl(ctx, s * (HR + 4 + (j % 2) * 8), 4 + j * 22, 17, c, hi);
}
function hairCurlyFront(ctx, L) {
  const c = L.hairColor, hi = shade(c, 0.5);
  for (let i = 0; i < 12; i++) { const a = (-154 + i * 10.5) * D2R; curl(ctx, Math.cos(a) * (HR - 4), Math.sin(a) * (HRY - 2) - 6, 14 + (i % 3) * 3, c, hi); }
}
function hairSpikyBack(ctx, L) {
  ctx.fillStyle = L.hairColor; ctx.strokeStyle = INK; ctx.lineWidth = 4.5; ctx.lineJoin = 'round';
  ctx.beginPath(); const n = 10;
  for (let i = 0; i <= n; i++) {
    const a = (-196 + (i / n) * 212) * D2R;
    ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * (HR + 2), Math.sin(a) * (HRY + 2));
    if (i < n) { const b = (-196 + ((i + 0.5) / n) * 212) * D2R, sp = 1 + (0.34 + hash(i + 3) * 0.26); ctx.lineTo(Math.cos(b) * (HR * sp), Math.sin(b) * (HRY * sp)); }
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
}
function hairSpikyFront(ctx, L) {
  ctx.fillStyle = L.hairColor; ctx.strokeStyle = INK; ctx.lineWidth = 4.5; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-HR + 6, -34);
  const pts = [[-92, -44], [-84, -70], [-64, -50], [-52, -78], [-30, -54], [-12, -82], [10, -56], [32, -80], [50, -54], [72, -76], [88, -44], [104, -56], [HR - 4, -30]];
  for (const [x, y] of pts) ctx.lineTo(x, y);
  ctx.lineTo(HR + 6, -60); ctx.quadraticCurveTo(0, -HRY - 52, -HR - 6, -60); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.beginPath(); ctx.ellipse(-24, -96, 22, 5, -0.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(44, -94, 15, 4, 0.3, 0, Math.PI * 2); ctx.fill();
}
function hairTightBack(ctx, L) {
  for (let i = 0; i < 20; i++) { const a = (-205 + i * 13) * D2R; curl(ctx, Math.cos(a) * (HR + 6), Math.sin(a) * (HRY + 4), 20 + (i % 2) * 4, L.hairColor, shade(L.hairColor, 0.45)); }
}
function hairTightFront(ctx, L) {
  for (let i = 0; i < 12; i++) { const a = (-160 + i * 12) * D2R; curl(ctx, Math.cos(a) * (HR - 14), Math.sin(a) * (HRY - 14) - 14, 17 + (i % 2) * 3, L.hairColor, shade(L.hairColor, 0.45)); }
}

module.exports = { Character, EMOTES };
