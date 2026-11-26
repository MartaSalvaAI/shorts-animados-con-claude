// Personaje de poses: cada pose es un PNG de cuerpo completo (generado con IA). Cambia de pose con
// un fundido corto, se mueve/salta/aplasta como el rig vectorial y "habla" con un rebote según la voz.
const path = require('path');
const fs = require('fs');
const { Track } = require('./track');
const spr = require('./sprites');

class PoseCharacter {
  constructor(name, { dir, headW = 250, emoteMap = {}, start = 'base_a', headOverride = {}, mouths = {} } = {}) {
    this.mouths = mouths;       // { pose: {x,y,w} } en píxeles de la imagen: donde dibujar una boca abierta
    this.name = name; this.dir = dir; this.headW = headW; this.emoteMap = emoteMap; this.headOverride = headOverride;
    this.t = new Track({ x: 540, y: 1600, scale: 1, flip: 1, sq: 0, jump: 0, walk: 0, phase: 0, shiver: 0, alpha: 1, chew: 0, mouth: 0 });
    this.poses = [{ t: -10, name: start }];
    this.speech = []; this.z = 0;
  }
  to(t, dur, props, e) { this.t.to(t, dur, props, e); return this; }
  set(t, props) { this.t.set(t, props); return this; }
  val(p, t) { return this.t.val(p, t); }
  pose(t, name) { this.poses.push({ t, name }); this.poses.sort((a, b) => a.t - b.t); return this; }
  emote(t, name) { if (this.emoteMap[name]) this.pose(t, this.emoteMap[name]); return this; }
  pop(t, amt = 0.1) { this.t.to(t, 0.07, { sq: amt }, 'outQuad'); this.t.to(t + 0.07, 0.35, { sq: 0 }, 'outElastic'); return this; }
  hop(t, h = 90, dur = 0.5) { this.t.to(t, dur / 2, { jump: h }, 'outQuad'); this.t.to(t + dur / 2, dur / 2, { jump: 0 }, 'inQuad'); return this; }
  shake(t, dur, amt = 1) { this.t.to(t, 0.05, { shiver: amt }, 'linear'); this.t.to(t + dur, 0.1, { shiver: 0 }, 'linear'); return this; }
  walk(t, dur, toX) {            // desliza con pasitos (rebote) en vez de ciclo de piernas
    this.t.to(t, 0.08, { walk: 1 }, 'linear'); this.t.to(t, dur, { x: toX }, 'inOutQuad');
    this.t.to(t, dur, { phase: this.t.val('phase', t) + Math.max(1, Math.abs(toX - this.t.val('x', t)) / 150) }, 'linear');
    this.t.to(t + dur - 0.08, 0.08, { walk: 0 }, 'linear'); return this;
  }
  chew(t, dur) { this.t.to(t, 0.05, { chew: 1 }, 'linear'); this.t.to(t + dur, 0.05, { chew: 0 }, 'linear'); return this; }
  voice(t) {
    for (const s of this.speech) if (t >= s.t0 && t <= s.t1) return s.env[Math.min(Math.floor((t - s.t0) * s.envRate), s.env.length - 1)] || 0;
    return -1;
  }
  _sprite(name) {
    const f = path.resolve(__dirname, '..', this.dir, name + '.png');
    if (!fs.existsSync(f)) throw new Error('Falta la pose ' + name + ' en ' + this.dir);
    const s = spr.load(f), fb = spr.faceBox(f);
    return { s, k: this.headW / (this.headOverride[name] || fb.w) };
  }
  draw(ctx, t) {
    const v = p => this.t.val(p, t);
    if (v('alpha') <= 0.01) return;
    let cur = this.poses[0], prev = null;
    for (const p of this.poses) if (p.t <= t) { prev = cur; cur = p; }
    const fade = prev && prev !== cur ? Math.min(1, (t - cur.t) / 0.06) : 1;
    const walk = v('walk'), phase = v('phase'), env = this.voice(t);
    const bob = walk * Math.abs(Math.sin(phase * Math.PI * 2)) * 16 + Math.sin(t * 2.6 + this.z) * 2.5 * (1 - walk);
    const chew = v('chew') ? Math.abs(Math.sin(t * 16)) * 9 * v('chew') : 0;
    const talk = env > 0 ? env : 0;
    const jit = v('shiver') ? Math.sin(t * 90) * 4 * v('shiver') : 0;
    const sq = v('sq'), sc = v('scale');
    ctx.save();
    ctx.translate(v('x') + jit, v('y') - v('jump') - bob);
    // sombra
    ctx.save(); ctx.globalAlpha = 0.3 * (1 - Math.min(0.6, v('jump') / 220)); ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(0, bob + 6, 120 * sc, 18 * sc, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.rotate(walk * Math.sin(phase * Math.PI * 2) * 0.03);
    ctx.scale(sc * v('flip') * (1 - sq * 0.45 - talk * 0.012), sc * (1 + sq + talk * 0.035 + chew * 0.004));
    const draw1 = (name, a) => {
      const { s, k } = this._sprite(name), w = s.w * k, h = s.h * k;
      ctx.save(); ctx.globalAlpha *= a; ctx.drawImage(s.img, -w / 2, -h + 6, w, h);
      const m = this.mouths[name], open = Math.max(v('mouth'), v('chew') > 0.5 ? 0.18 + 0.5 * Math.abs(Math.sin(t * 13)) : 0);
      if (m && open > 0.03) {                                   // boca abierta dibujada sobre la pose
        ctx.translate(-w / 2, -h + 6); ctx.scale(k, k);
        const rx = (m.w / 2) * (0.75 + 0.25 * open), ry = 6 + open * 40;
        ctx.fillStyle = '#5b1b1c'; ctx.strokeStyle = '#17130f'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.ellipse(m.x, m.y + ry * 0.5, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
        ctx.save(); ctx.clip(); ctx.fillStyle = '#e8737e'; ctx.beginPath(); ctx.ellipse(m.x, m.y + ry * 1.3, rx * 0.6, ry * 0.55, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        ctx.beginPath(); ctx.ellipse(m.x, m.y + ry * 0.5, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    };
    if (fade < 1 && prev) draw1(prev.name, 1 - fade);
    draw1(cur.name, fade);
    ctx.restore();
  }
}
module.exports = { PoseCharacter };
