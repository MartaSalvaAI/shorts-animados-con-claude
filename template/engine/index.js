// Motor de animación 2D para Shorts (1080x1920).
// Short = escena + personajes + cámara + subtítulos + FX + audio, todo por línea de tiempo.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
// Carga .env (en la raíz del proyecto). Un valor no vacío del .env tiene prioridad sobre el entorno.
try {
  for (const line of fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && m[2] && !line.trim().startsWith('#')) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {}
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const { Track } = require('./track');
const { Character } = require('./rig');
const { Prop } = require('./props');
const { PoseCharacter } = require('./posechar');
const { Scene, W, H } = require('./scenes');
const { tts, Mixer } = require('./audio');
const fx = require('./fx');
const { ease } = require('./ease');

for (const f of ['/System/Library/Fonts/Supplemental/Impact.ttf', '/System/Library/Fonts/Supplemental/Arial Black.ttf']) {
  try { GlobalFonts.registerFromPath(f); } catch {}
}

// Voces por defecto (Fish Audio, español). Cámbialas por cualquier reference_id de fish.audio.
const VOICES = {
  woman: { fish: '35929683c49c4ec0bf779dc07d22620b', say: 'Mónica (Español (España))' },   // "Chica": mujer joven, enérgica
  man:   { fish: '95f7b8fe6a264953bad59931c6f8c571', say: 'Reed (Español (España))' },     // "Lee know": hombre joven
  kid:   { fish: '35929683c49c4ec0bf779dc07d22620b', say: 'Flo (Español (España))' },      // "Chica": joven, enérgica
  deep:  { fish: '75e8b1278959490f9cf3341e578a9203', say: 'Rocko (Español (España))' },    // "Jorge Loquendo": grave
};

class Short {
  constructor({ scene = 'kitchen', fps = 30, captionY = 1470, music = 'bouncy' } = {}) {
    this.fps = fps; this.captionY = captionY; this.musicStyle = music;
    this.scene = new Scene(scene);
    this.chars = {};
    this.cam = new Track({ cx: 540, cy: 960, zoom: 1, rot: 0, shake: 0 });
    this.captions = []; this.effects = []; this.sfxList = []; this.voices = [];
    this.cursor = 0; this.end = 0; this.overlay = []; this.props = {};
  }
  // ---- construcción
  character(name, look, { voice = 'woman', x = 540, y = 1600, flip = 1, scale = 1 } = {}) {
    const c = new Character(name, look);
    c.z = Object.keys(this.chars).length * 1.7;
    c.voiceKind = voice;
    c.to(-1, 0.001, { x, y, flip, scale });
    this.chars[name] = c;
    return c;
  }
  // Personaje hecho con poses PNG de cuerpo completo
  poseCharacter(name, opts, { voice = 'woman', x = 540, y = 1600, flip = 1, scale = 1 } = {}) {
    const c = new PoseCharacter(name, opts);
    c.z = Object.keys(this.chars).length * 1.7; c.voiceKind = voice;
    c.to(-1, 0.001, { x, y, flip, scale }); this.chars[name] = c; return c;
  }
  // Objetos del mundo (plato, etc.) que pueden seguir la mano de un personaje
  prop(name, type, init = {}) { const p = new Prop(type, init); this.props[name] = p; return p; }
  // El personaje habla: sintetiza la voz, mueve la boca con la envolvente real, y crea subtítulos
  say(ch, text, o = {}) {
    const t = o.at ?? this.cursor;
    const preset = VOICES[ch.voiceKind] || VOICES.woman;
    const voice = typeof o.voice === 'string' ? { fish: o.voice } : (o.voice || ch.voiceOverride || preset);
    const v = tts(o.speak ?? text, voice, { speed: o.speed, rate: o.rate, pitch: o.pitch });
    ch.speech.push({ t0: t, t1: t + v.dur, env: v.env, envRate: v.envRate, text });
    this.voices.push({ t, samples: v.samples, gain: o.gain ?? 1 });
    if (o.emote) ch.emote(t, o.emote);
    if (o.pose && ch.pose) ch.pose(t, o.pose);
    if (o.pop !== false) ch.pop(t + 0.02, o.popAmt ?? 0.1);
    if (o.caption !== false) this._caption(text, t, v.dur, o.color);
    this.cursor = t + v.dur + (o.gap ?? 0.18);
    this.end = Math.max(this.end, t + v.dur);
    return t + v.dur;
  }
  wait(s) { this.cursor += s; this.end = Math.max(this.end, this.cursor); return this; }
  at(t) { this.cursor = t; return this; }
  sfx(name, t, gain = 1) { this.sfxList.push({ name, t, gain }); return this; }
  effect(t0, dur, fn, space = 'screen') { this.effects.push({ t0, t1: t0 + dur, fn, space }); this.end = Math.max(this.end, t0 + dur); return this; }
  // Cámara
  zoomTo(t, dur, zoom, cx, cy, e = 'inOutCubic') {
    const p = { zoom }; if (cx !== undefined) p.cx = cx; if (cy !== undefined) p.cy = cy;
    this.cam.to(t, dur, p, e); return this;
  }
  punch(t, zoom = 1.25, cx, cy) {      // golpe de zoom rápido + temblor
    this.cam.to(t, 0.08, Object.assign({ zoom }, cx !== undefined ? { cx, cy } : {}), 'outQuad');
    this.cam.to(t, 0.05, { shake: 1 }, 'linear'); this.cam.to(t + 0.35, 0.1, { shake: 0 }, 'linear');
    return this;
  }
  _caption(text, t, dur, color) {
    const words = text.split(/\s+/).filter(Boolean);
    const weights = words.map(w => Math.max(2, w.replace(/[^\p{L}\p{N}]/gu, '').length) + (/[,.!?]$/.test(w) ? 3 : 0));
    const tot = weights.reduce((a, b) => a + b, 0);
    let acc = 0; const ws = [];
    words.forEach((w, i) => { ws.push({ w, t0: t + (acc / tot) * dur, t1: t + ((acc + weights[i]) / tot) * dur }); acc += weights[i]; });
    // trozos de ≤3 palabras (cortando en puntuación)
    let chunk = [];
    const flush = () => { if (chunk.length) { this.captions.push({ t0: chunk[0].t0, t1: chunk[chunk.length - 1].t1 + 0.12, words: chunk, color }); chunk = []; } };
    ws.forEach(w => { chunk.push(w); if (chunk.length >= 3 || /[,.!?]$/.test(w.w)) flush(); });
    flush();
  }

  // ---- render
  get duration() { return this.end + 0.8; }

  drawFrame(ctx, t, scale = 1) {
    ctx.save();
    ctx.scale(scale, scale);
    // cámara
    const sh = this.cam.val('shake', t);
    const zoom = this.cam.val('zoom', t);
    const jx = sh ? Math.sin(t * 83) * 14 * sh : 0, jy = sh ? Math.cos(t * 71) * 14 * sh : 0;
    ctx.save();
    ctx.translate(W / 2 + jx, H / 2 + jy);
    ctx.rotate(this.cam.val('rot', t) * Math.PI / 180);
    ctx.scale(zoom, zoom);
    ctx.translate(-this.cam.val('cx', t), -this.cam.val('cy', t));
    this.scene.drawBack(ctx, t);
    const order = Object.values(this.chars).sort((a, b) => a.val('y', t) - b.val('y', t));
    order.forEach(c => c.draw(ctx, t));
    for (const p of Object.values(this.props)) p.draw(ctx, t, this.chars);
    this.scene.drawFront(ctx, t);
    for (const e of this.effects) if (e.space === 'world' && t >= e.t0 && t <= e.t1) { ctx.save(); e.fn(ctx, (t - e.t0) / (e.t1 - e.t0), t); ctx.restore(); }
    ctx.restore();
    for (const e of this.effects) if (e.space === 'screen' && t >= e.t0 && t <= e.t1) { ctx.save(); e.fn(ctx, (t - e.t0) / (e.t1 - e.t0), t); ctx.restore(); }
    this._drawCaptions(ctx, t);
    ctx.restore();
  }
  _drawCaptions(ctx, t) {
    const cap = this.captions.find(c => t >= c.t0 && t < c.t1);
    if (!cap) return;
    ctx.save();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    const fs0 = 104;
    ctx.font = `${fs0}px Impact, "Arial Black", sans-serif`;
    const gap = 26;
    const texts = cap.words.map(w => w.w.toUpperCase());
    const widths = texts.map(s => ctx.measureText(s).width);
    let total = widths.reduce((a, b) => a + b, 0) + gap * (texts.length - 1);
    let sc = 1; if (total > W - 80) sc = (W - 80) / total;
    let x = W / 2 - (total * sc) / 2;
    const age = t - cap.t0;
    const enter = ease.outBack(Math.min(1, age / 0.18));
    ctx.translate(0, (1 - enter) * 40);
    texts.forEach((s, i) => {
      const w = cap.words[i], active = t >= w.t0 && t < w.t1;
      const pop = active ? 1 + 0.16 * Math.sin(Math.min(1, (t - w.t0) / 0.16) * Math.PI) : 1;
      ctx.save();
      ctx.translate(x + (widths[i] * sc) / 2, this.captionY);
      ctx.scale(sc * pop, sc * pop);
      ctx.translate(-widths[i] / 2, 0);
      ctx.lineWidth = 24; ctx.strokeStyle = '#000'; ctx.strokeText(s, 0, 0);
      ctx.fillStyle = active ? (cap.color || '#ffd91a') : '#fff'; ctx.fillText(s, 0, 0);
      ctx.restore();
      x += (widths[i] + gap) * sc;
    });
    ctx.restore();
  }

  // Mezcla de audio completa → wav
  buildAudio(file) {
    const mx = new Mixer(this.duration);
    this.voices.forEach(v => mx.addVoice(v.samples, v.t, v.gain));
    this.sfxList.forEach(s => mx.sfx(s.name, s.t, s.gain));
    if (this.musicStyle) mx.music(this.musicStyle);
    mx.save(file);
  }

  async renderStill(file, t, scale = 1) {
    const cv = createCanvas(Math.round(W * scale), Math.round(H * scale));
    this.drawFrame(cv.getContext('2d'), t, scale);
    fs.writeFileSync(file, cv.toBuffer('image/png'));
  }

  async render(outFile, { scale = 1, onProgress } = {}) {
    const w = Math.round(W * scale) & ~1, h = Math.round(H * scale) & ~1;
    const wav = path.join(os.tmpdir(), 'short-audio-' + process.pid + '.wav');
    this.buildAudio(wav);
    const cv = createCanvas(w, h), ctx = cv.getContext('2d');
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${w}x${h}`, '-r', String(this.fps),
      '-i', '-', '-i', wav, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17', '-preset', 'medium', '-movflags', '+faststart',
      '-c:a', 'aac', '-b:a', '192k', '-t', String(this.duration), outFile], { stdio: ['pipe', 'inherit', 'inherit'] });
    const done = new Promise((res, rej) => { ff.on('close', c => (c === 0 ? res() : rej(new Error('ffmpeg salió con código ' + c)))); });
    const total = Math.ceil(this.duration * this.fps);
    for (let f = 0; f < total; f++) {
      ctx.clearRect(0, 0, w, h);
      this.drawFrame(ctx, f / this.fps, scale);
      if (!ff.stdin.write(cv.data())) await new Promise(r => ff.stdin.once('drain', r));
      if (onProgress && f % 15 === 0) onProgress(f / total);
    }
    ff.stdin.end();
    await done;
    try { fs.unlinkSync(wav); } catch {}
    return { frames: total, seconds: this.duration };
  }
}

module.exports = { Short, fx, W, H };
