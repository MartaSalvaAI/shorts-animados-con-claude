// Efectos listos para usar con short.effect(t0, dur, fx.xxx(...), 'world'|'screen')
const { ease } = require('./ease');
const W = 1080, H = 1920;

function heart(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.35);
  ctx.bezierCurveTo(x - s, y - s * 0.3, x - s * 0.5, y - s, x, y - s * 0.4);
  ctx.bezierCurveTo(x + s * 0.5, y - s, x + s, y - s * 0.3, x, y + s * 0.35);
  ctx.closePath();
}
const hearts = (x, y, n = 6) => (ctx, u) => {
  for (let i = 0; i < n; i++) {
    const p = Math.min(1, Math.max(0, u * 1.3 - i * 0.08));
    if (p <= 0) continue;
    const px = x + Math.sin(i * 2.3 + p * 5) * 70 + (i - n / 2) * 18, py = y - p * 260 - i * 10;
    ctx.globalAlpha = 1 - p * p;
    ctx.fillStyle = '#ff4d6d'; ctx.strokeStyle = '#6b0f24'; ctx.lineWidth = 5;
    heart(ctx, px, py, 26 + (i % 3) * 8); ctx.fill(); ctx.stroke();
  }
};
const flash = (color = '#fff', peak = 0.9) => (ctx, u) => {
  ctx.globalAlpha = peak * (1 - u) * (1 - u); ctx.fillStyle = color; ctx.fillRect(0, 0, W, H);
};
// líneas de velocidad estilo manga (convergen al centro)
const speedLines = (cx = W / 2, cy = 900, color = 'rgba(255,255,255,.85)') => (ctx, u, t) => {
  ctx.globalAlpha = Math.min(1, u * 6) * (1 - Math.max(0, (u - 0.7) / 0.3));
  ctx.strokeStyle = color;
  for (let i = 0; i < 46; i++) {
    const a = (i / 46) * Math.PI * 2 + Math.sin(i * 12.9) * 0.05;
    const r0 = 460 + ((Math.sin(i * 78.2 + Math.floor(t * 20)) + 1) * 90), r1 = 1500;
    ctx.lineWidth = 3 + (i % 4) * 2;
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.stroke();
  }
};
const burst = (x, y, color = '#ffd91a', n = 10) => (ctx, u) => {
  ctx.globalAlpha = 1 - u;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, r = 40 + ease.outCubic(u) * 220;
    ctx.save(); ctx.translate(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.rotate(u * 3 + i);
    ctx.fillStyle = color; ctx.strokeStyle = '#3a2a00'; ctx.lineWidth = 4;
    ctx.beginPath();
    for (let k = 0; k < 10; k++) { const rr = k % 2 ? 9 : 24, aa = (Math.PI / 5) * k - Math.PI / 2; ctx[k ? 'lineTo' : 'moveTo'](Math.cos(aa) * rr, Math.sin(aa) * rr); }
    ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  }
};
// Texto grande que aparece con rebote ("?!", "12", "¡QUÉ!")
const bigText = (text, x, y, { color = '#ffd91a', size = 220, rot = -8 } = {}) => (ctx, u) => {
  const s = ease.outBack(Math.min(1, u * 5)), a = 1 - Math.max(0, (u - 0.8) / 0.2);
  ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(rot * Math.PI / 180); ctx.scale(s, s);
  ctx.font = `${size}px Impact, "Arial Black"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.14; ctx.strokeStyle = '#000'; ctx.strokeText(text, 0, 0);
  ctx.fillStyle = color; ctx.fillText(text, 0, 0);
};
const vignetteRed = (peak = 0.5) => (ctx, u) => {
  const g = ctx.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 1200);
  g.addColorStop(0, 'rgba(255,0,0,0)'); g.addColorStop(1, `rgba(255,20,20,${peak * Math.sin(u * Math.PI)})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
};
const fadeBlack = (inverse = false) => (ctx, u) => { ctx.globalAlpha = inverse ? 1 - u : u; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); };

module.exports = { hearts, flash, speedLines, burst, bigText, vignetteRed, fadeBlack };
