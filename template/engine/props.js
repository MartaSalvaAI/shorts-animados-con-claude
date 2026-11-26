// Objetos del mundo: plato con tortitas, sartén… Tienen keyframes propios y pueden "agarrarse" a una mano.
const { Track } = require('./track');
const INK = '#17130f';

class Prop {
  constructor(type, init = {}) {
    this.type = type;
    this.t = new Track(Object.assign({ x: 0, y: 0, rot: 0, scale: 1, alpha: 1, n: 3, piece: 0 }, init));
    this.attach = [];            // [{t0,t1,char,hand,dx,dy,rot}]
  }
  to(t, dur, props, e) { this.t.to(t, dur, props, e); return this; }
  set(t, props) { this.t.set(t, props); return this; }
  // t0..t1 sigue la mano 'l'|'r' del personaje (offset en px de mundo y rotación relativa en grados)
  follow(t0, t1, char, hand, dx = 0, dy = 0, rot = 0) { this.attach.push({ t0, t1, char, hand, dx, dy, rot }); return this; }
  draw(ctx, t, chars) {
    const v = p => this.t.val(p, t);
    let x = v('x'), y = v('y'), rot = v('rot');
    for (const a of this.attach) {
      if (t >= a.t0 && t <= a.t1) {
        const hp = chars[a.char] && chars[a.char].handPos && chars[a.char].handPos[a.hand];
        if (hp) { x = hp.x + a.dx; y = hp.y + a.dy; rot = a.rot; }
      }
    }
    if (v('alpha') <= 0.01) return;
    ctx.save(); ctx.globalAlpha = v('alpha'); ctx.translate(x, y); ctx.rotate(rot * Math.PI / 180); ctx.scale(v('scale'), v('scale'));
    if (this.type === 'plate') plate(ctx, v('n'));
    if (this.type === 'pan') pan(ctx, v('n'));
    ctx.restore();
  }
}
function plate(ctx, n) {
  ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.lineJoin = 'round';
  ctx.fillStyle = '#f4efe6'; ctx.beginPath(); ctx.ellipse(0, 0, 96, 22, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#e4ddd0'; ctx.beginPath(); ctx.ellipse(0, -2, 66, 13, 0, 0, Math.PI * 2); ctx.fill();
  const cnt = Math.ceil(n - 0.001);
  for (let i = 0; i < cnt; i++) {
    const part = Math.min(1, n - i);                 // 0..1 (mordisco parcial en la de arriba)
    const yy = -10 - i * 15;
    ctx.fillStyle = i === cnt - 1 ? '#dba04e' : '#c98a3c';
    ctx.beginPath(); ctx.ellipse(0, yy, 60 * (0.5 + part / 2), 15, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  if (n >= 1) { ctx.fillStyle = '#f7d56a'; ctx.beginPath(); ctx.roundRect(-14, -10 - (cnt - 1) * 15 - 16, 28, 12, 3); ctx.fill(); ctx.stroke(); }
}
function pan(ctx) {
  ctx.fillStyle = '#26272a'; ctx.strokeStyle = INK; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.ellipse(0, 0, 130, 26, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
}
module.exports = { Prop };
