// Genera leo/comiendo_a_vacio.png: la misma pose sin el trocito de tortita del tenedor.
const fs = require('fs');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
(async () => {
  const img = await loadImage('assets/poses/leo/comiendo_a.png'), cv = createCanvas(img.width, img.height), ctx = cv.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const id = ctx.getImageData(0, 0, img.width, img.height), d = id.data;
  const cx = 458, cy = 424, R = 42; let n = 0;
  for (let y = cy - R; y <= cy + R; y++) for (let x = cx - R; x <= cx + R; x++) {
    if (Math.hypot(x - cx, y - cy) > R) continue;
    const i = (y * img.width + x) * 4, r = d[i], g = d[i + 1], b = d[i + 2];
    const warm = r > 80 && r - b > 30;                        // marrón/dorado de la tortita (no negro, blanco ni gris)
    const dark = r < 90 && g < 90 && b < 90;                  // contorno negro de la tortita
    if (warm || (dark && Math.hypot(x - cx, y - cy) < R - 2 && x < 468)) {
      const inFace = ((x - 370) / 198) ** 2 + ((y - 354) / 154) ** 2 < 1;       // dentro de la cara: rellenar de blanco
      if (inFace) { d[i] = 252; d[i + 1] = 251; d[i + 2] = 247; d[i + 3] = 255; } else d[i + 3] = 0;
      n++;
    }
  }
  ctx.putImageData(id, 0, 0); fs.writeFileSync('assets/poses/leo/comiendo_a_vacio.png', cv.toBuffer('image/png')); console.log('borrados', n);
})();
