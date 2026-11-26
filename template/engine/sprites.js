// Carga de piezas PNG (generadas con IA) y detección del óvalo blanco de la cara.
const fs = require('fs');
const path = require('path');
const { Image, createCanvas } = require('@napi-rs/canvas');
const cache = new Map();

function load(file) {
  if (cache.has(file)) return cache.get(file);
  const img = new Image();
  img.src = fs.readFileSync(file);
  const s = { img, w: img.width, h: img.height };
  cache.set(file, s);
  return s;
}
// Caja de la cara = mayor región casi blanca (en una rejilla reducida)
function faceBox(file) {
  const s = load(file);
  if (s.face) return s.face;
  const G = 4, gw = Math.ceil(s.w / G), gh = Math.ceil(s.h / G);
  const cv = createCanvas(s.w, s.h), ctx = cv.getContext('2d'); ctx.drawImage(s.img, 0, 0);
  const d = ctx.getImageData(0, 0, s.w, s.h).data;
  const white = new Uint8Array(gw * gh);
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
    const i = ((y * G) * s.w + x * G) * 4;
    white[y * gw + x] = d[i + 3] > 200 && d[i] > 222 && d[i + 1] > 222 && d[i + 2] > 222 ? 1 : 0;
  }
  const lab = new Int32Array(gw * gh); let best = null, id = 0;
  for (let p = 0; p < gw * gh; p++) {
    if (!white[p] || lab[p]) continue;
    id++; const st = [p]; lab[p] = id; let n = 0, mnx = 1e9, mxx = -1, mny = 1e9, mxy = -1;
    while (st.length) {
      const q = st.pop(), x = q % gw, y = (q / gw) | 0; n++;
      mnx = Math.min(mnx, x); mxx = Math.max(mxx, x); mny = Math.min(mny, y); mxy = Math.max(mxy, y);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
        const np = ny * gw + nx; if (white[np] && !lab[np]) { lab[np] = id; st.push(np); }
      }
    }
    if (!best || n > best.n) best = { n, mnx, mxx, mny, mxy };
  }
  s.face = { x: best.mnx * G, y: best.mny * G, w: (best.mxx - best.mnx + 1) * G, h: (best.mxy - best.mny + 1) * G };
  return s.face;
}
module.exports = { load, faceBox, resolve: (dir, f) => path.resolve(__dirname, '..', dir, f) };
