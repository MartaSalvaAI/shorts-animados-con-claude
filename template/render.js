#!/usr/bin/env node
// Uso:  node render.js shorts/tortitas.js [--out out/x.mp4] [--scale 0.5] [--still 1.2,3.4] [--fps 30]
const path = require('path');
const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--'));
const opt = n => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : undefined; };
if (!file) { console.error('Falta el guion: node render.js shorts/tortitas.js'); process.exit(1); }

(async () => {
  const build = require(path.resolve(file));
  const short = build({ fps: Number(opt('fps') || 30) });
  const scale = Number(opt('scale') || 1);
  const base = path.basename(file, '.js');
  const stills = opt('still');
  if (stills) {
    for (const t of stills.split(',')) {
      const out = path.resolve('out', `${base}_${t}s.png`);
      await short.renderStill(out, Number(t), scale);
      console.log('still →', out);
    }
    console.log('duración total:', short.duration.toFixed(2) + 's');
    return;
  }
  const out = path.resolve(opt('out') || `out/${base}.mp4`);
  const t0 = Date.now();
  const r = await short.render(out, { scale, onProgress: p => process.stdout.write(`\rrenderizando ${(p * 100).toFixed(0)}%  `) });
  console.log(`\n✓ ${out}  (${r.seconds.toFixed(1)}s, ${r.frames} frames, ${((Date.now() - t0) / 1000).toFixed(0)}s de render)`);
})().catch(e => { console.error(e); process.exit(1); });
