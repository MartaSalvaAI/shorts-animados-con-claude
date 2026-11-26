#!/usr/bin/env node
// Quita el fondo verde (#00ff00) de una imagen de Flow y separa las piezas sueltas.
// Uso: node tools/keyout.js <entrada.png> <salida1.png> [salida2.png ...]   (piezas ordenadas de izquierda a derecha)
const fs = require('fs');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
(async () => {
  const [inp, ...outs] = process.argv.slice(2);
  const img = await loadImage(inp);
  const W = img.width, H = img.height;
  const cv = createCanvas(W, H), ctx = cv.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const id = ctx.getImageData(0, 0, W, H), d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const gr = g - Math.max(r, b);                       // cuánto domina el verde
    if (gr > 70) d[i + 3] = 0;                            // fondo
    else if (gr > 18) { d[i + 3] = Math.round(255 * (1 - (gr - 18) / 52)); d[i + 1] = Math.max(r, b); }   // borde suave + des-verdeo
    else if (gr > 0) d[i + 1] = Math.max(r, b);
  }
  // componentes conexas (sobre máscara de alfa)
  const lab = new Int32Array(W * H), comps = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = y * W + x; if (lab[p] || d[p * 4 + 3] < 40) continue;
    const id2 = comps.length + 1, st = [p]; lab[p] = id2;
    let minx = x, maxx = x, miny = y, maxy = y, n = 0;
    while (st.length) {
      const q = st.pop(), qx = q % W, qy = (q / W) | 0; n++;
      if (qx < minx) minx = qx; if (qx > maxx) maxx = qx; if (qy < miny) miny = qy; if (qy > maxy) maxy = qy;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        const nx = qx + dx, ny = qy + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const np = ny * W + nx; if (!lab[np] && d[np * 4 + 3] >= 40) { lab[np] = id2; st.push(np); }
      }
    }
    comps.push({ id: id2, minx, maxx, miny, maxy, n });
  }
  const big = comps.filter(c => c.n > 2500).sort((a, b) => a.minx - b.minx);
  console.log(inp, '→ piezas:', big.map(c => `${c.maxx - c.minx}x${c.maxy - c.miny}`).join(' '));
  if (big.length !== outs.length) console.warn(`⚠ se esperaban ${outs.length} piezas y hay ${big.length}`);
  big.slice(0, outs.length).forEach((c, k) => {
    const w = c.maxx - c.minx + 1, h = c.maxy - c.miny + 1, pad = 4;
    const oc = createCanvas(w + pad * 2, h + pad * 2), octx = oc.getContext('2d');
    const od = octx.createImageData(w + pad * 2, h + pad * 2);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const sp = (c.miny + y) * W + c.minx + x;
      const keep = lab[sp] === c.id || (d[sp * 4 + 3] > 0 && d[sp * 4 + 3] < 255 && nearComp(lab, W, H, c.minx + x, c.miny + y, c.id));
      const dp = ((y + pad) * (w + pad * 2) + x + pad) * 4;
      if (keep) { od.data[dp] = d[sp * 4]; od.data[dp + 1] = d[sp * 4 + 1]; od.data[dp + 2] = d[sp * 4 + 2]; od.data[dp + 3] = d[sp * 4 + 3]; }
    }
    octx.putImageData(od, 0, 0);
    fs.writeFileSync(outs[k], oc.toBuffer('image/png')); console.log('  →', outs[k], oc.width + 'x' + oc.height);
  });
})();
function nearComp(lab, W, H, x, y, id) {
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H && lab[ny * W + nx] === id) return true; }
  return false;
}
