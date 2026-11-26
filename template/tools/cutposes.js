#!/usr/bin/env node
// Recorta el fondo verde de poses/**/*.png → assets/poses/<personaje>/<pose>.png (figura completa, PNG con alfa).
// Las imágenes de "juntos" se parten en sus componentes (izquierda→derecha) con los nombres indicados.
const fs = require('fs'), path = require('path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const ROOT = path.join(__dirname, '..'), SRC = path.join(ROOT, 'poses'), OUT = path.join(ROOT, 'assets', 'poses');

async function key(file) {
  const img = await loadImage(file), W = img.width, H = img.height;
  const cv = createCanvas(W, H), ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0);
  const id = ctx.getImageData(0, 0, W, H), d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2], gr = g - Math.max(r, b);
    if (gr > 70) d[i + 3] = 0;
    else if (gr > 18) { d[i + 3] = Math.round(255 * (1 - (gr - 18) / 52)); d[i + 1] = Math.max(r, b); }
    else if (gr > 0) d[i + 1] = Math.max(r, b);
  }
  return { id, W, H };
}
function components(id, W, H, minArea) {
  const d = id.data, lab = new Int32Array(W * H), comps = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = y * W + x; if (lab[p] || d[p * 4 + 3] < 40) continue;
    const c = { id: comps.length + 1, minx: x, maxx: x, miny: y, maxy: y, n: 0 }, st = [p]; lab[p] = c.id;
    while (st.length) {
      const q = st.pop(), qx = q % W, qy = (q / W) | 0; c.n++;
      c.minx = Math.min(c.minx, qx); c.maxx = Math.max(c.maxx, qx); c.miny = Math.min(c.miny, qy); c.maxy = Math.max(c.maxy, qy);
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {     // vecindad 5x5: une líneas finas y manos
        const nx = qx + dx, ny = qy + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const np = ny * W + nx; if (!lab[np] && d[np * 4 + 3] >= 40) { lab[np] = c.id; st.push(np); }
      }
    }
    comps.push(c);
  }
  return { comps: comps.filter(c => c.n >= minArea), lab };
}
function save(id, lab, W, ids, out) {
  const d = id.data; let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  const H = lab.length / W;
  const keep = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) if (ids.has(lab[p])) keep[p] = 1;
  // incluir píxeles semitransparentes pegados a lo conservado
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = y * W + x; if (keep[p] || d[p * 4 + 3] === 0) continue;
    let near = false; for (let dy = -3; dy <= 3 && !near; dy++) for (let dx = -3; dx <= 3; dx++) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H && ids.has(lab[ny * W + nx])) { near = true; break; } }
    if (near) keep[p] = 2;
  }
  for (let p = 0; p < W * H; p++) if (keep[p]) { const x = p % W, y = (p / W) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const w = x1 - x0 + 1, h = y1 - y0 + 1, oc = createCanvas(w + 8, h + 8), octx = oc.getContext('2d'), od = octx.createImageData(w + 8, h + 8);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sp = (y0 + y) * W + x0 + x; if (!keep[sp]) continue;
    const dp = ((y + 4) * (w + 8) + x + 4) * 4;
    od.data[dp] = d[sp * 4]; od.data[dp + 1] = d[sp * 4 + 1]; od.data[dp + 2] = d[sp * 4 + 2]; od.data[dp + 3] = d[sp * 4 + 3];
  }
  octx.putImageData(od, 0, 0); fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, oc.toBuffer('image/png'));
  console.log(path.relative(ROOT, out), oc.width + 'x' + oc.height);
}
(async () => {
  for (const who of ['ana', 'leo']) for (const f of fs.readdirSync(path.join(SRC, who)).filter(f => f.endsWith('.png'))) {
    const { id, W, H } = await key(path.join(SRC, who, f)), { comps, lab } = components(id, W, H, 1500);
    save(id, lab, W, new Set(comps.map(c => c.id)), path.join(OUT, who, f));
  }
  for (const f of fs.readdirSync(path.join(SRC, 'juntos')).filter(f => f.endsWith('.png'))) {
    const { id, W, H } = await key(path.join(SRC, 'juntos', f)), { comps, lab } = components(id, W, H, 6000);
    comps.sort((a, b) => a.minx - b.minx);
    const suffix = f.slice(-6, -4);                                   // _a / _b
    console.log(f, 'componentes:', comps.map(c => `${c.maxx - c.minx}x${c.maxy - c.miny}`).join(' '));
    if (comps.length === 1) {            // personajes pegados: cortar por la columna con menos píxeles entre ambos
      const c = comps[0], d = id.data; let best = -1, bx = 0;
      for (let x = c.minx + Math.floor((c.maxx - c.minx) * 0.3); x < c.minx + Math.floor((c.maxx - c.minx) * 0.7); x++) {
        let n = 0; for (let y = c.miny; y <= c.maxy; y++) if (d[(y * W + x) * 4 + 3] > 40) n++;
        if (best < 0 || n < best) { best = n; bx = x; }
      }
      console.log('  corte en x =', bx, 'píxeles cortados:', best);
      const L = lab.slice(), R = lab.slice();
      for (let p = 0; p < W * H; p++) if (lab[p] === c.id) { if (p % W < bx) R[p] = 0; else L[p] = 0; }
      const merged = new Int32Array(W * H); for (let p = 0; p < W * H; p++) merged[p] = L[p] ? 1 : (R[p] ? 2 : 0);
      save(id, merged, W, new Set([1]), path.join(OUT, 'leo', 'chulo' + suffix + '.png'));
      save(id, merged, W, new Set([2]), path.join(OUT, 'ana', 'sonrojada' + suffix + '.png'));
      continue;
    }
    if (comps.length >= 2) {
      save(id, lab, W, new Set([comps[0].id]), path.join(OUT, 'leo', 'chulo' + suffix + '.png'));
      save(id, lab, W, new Set(comps.slice(1).map(c => c.id)), path.join(OUT, 'ana', 'sonrojada' + suffix + '.png'));
    }
  }
})();
