// Audio: TTS de macOS (`say`) para las voces + SFX y música sintetizados en JS.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const SR = 44100;

function readWav(file) {
  const b = fs.readFileSync(file);
  let p = 12, fmt = null, data = null;
  while (p < b.length - 8) {
    const id = b.toString('ascii', p, p + 4), sz = b.readUInt32LE(p + 4);
    if (id === 'fmt ') fmt = { ch: b.readUInt16LE(p + 10), sr: b.readUInt32LE(p + 12), bits: b.readUInt16LE(p + 22) };
    if (id === 'data') { data = b.subarray(p + 8, p + 8 + Math.min(sz, b.length - p - 8)); break; }
    p += 8 + sz + (sz & 1);
  }
  const n = Math.floor(data.length / 2 / fmt.ch);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = data.readInt16LE(i * 2 * fmt.ch) / 32768;
  return { samples: out, sr: fmt.sr };
}
function writeWav(file, f32) {
  const n = f32.length, b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(f32[i] * 32767))), 44 + i * 2);
  fs.writeFileSync(file, b);
}

// Sintetiza una línea de voz. Devuelve {samples, dur, env, envRate}
// voice = { fish: '<reference_id>' }  → Fish Audio (con caché en cache/voz)
//       | { say: 'Mónica' }           → TTS de macOS (plan B, siempre en español)
const crypto = require('crypto');
const CACHE = path.join(__dirname, '..', 'cache', 'voz');
function fishTts(refId, text, speed, model) {
  fs.mkdirSync(CACHE, { recursive: true });
  const h = crypto.createHash('sha1').update([refId, text, speed, model].join('|')).digest('hex').slice(0, 16);
  const mp3 = path.join(CACHE, h + '.mp3'), wav = path.join(CACHE, h + '.wav');
  if (!fs.existsSync(wav)) {
    if (!fs.existsSync(mp3)) execFileSync(process.execPath, [path.join(__dirname, 'fish_cli.js'), refId, mp3, String(speed || 1), model || ''], { input: text, stdio: ['pipe', 'inherit', 'inherit'] });
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', mp3, '-ar', '44100', '-ac', '1', '-c:a', 'pcm_s16le', wav]);
  }
  return readWav(wav).samples;
}
function trim(samples) {
  let a = 0, b = samples.length - 1;
  while (a < b && Math.abs(samples[a]) < 0.01) a++;
  while (b > a && Math.abs(samples[b]) < 0.01) b--;
  return samples.slice(Math.max(0, a - 400), Math.min(samples.length, b + 800));
}
function tts(text, voice = { say: 'Mónica (Español (España))' }, { rate = 175, speed = 1, pitch = 1 } = {}) {
  if (voice.fish && process.env.FISH_API_KEY) {
    try { return withEnv(trim(fishTts(voice.fish, text, speed, voice.model))); }
    catch (e) { console.error('⚠ Fish falló (' + e.message.split('\n')[0] + '); uso voz de macOS'); }
  }
  const tmp = path.join(os.tmpdir(), 'shorts-tts-' + Math.random().toString(36).slice(2));
  const aiff = tmp + '.wav';
  try {
    execFileSync('say', ['-v', voice.say || 'Mónica (Español (España))', '-r', String(rate), '-o', aiff, '--file-format=WAVE', '--data-format=LEI16@44100', text]);
    let { samples } = readWav(aiff);
    if (pitch !== 1) samples = resample(samples, pitch);
    return withEnv(trim(samples));
  } catch (e) {
    return withEnv(blipVoice(text, pitch));
  } finally { try { fs.unlinkSync(aiff); } catch {} }
}
function resample(s, f) {                  // cambia tono+velocidad (f>1 más agudo/rápido)
  const n = Math.floor(s.length / f), o = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = i * f, j = Math.floor(x), u = x - j; o[i] = s[j] * (1 - u) + (s[j + 1] || 0) * u; }
  return o;
}
function withEnv(samples) {
  const rate = 60, win = Math.floor(SR / rate), n = Math.ceil(samples.length / win);
  const env = new Float32Array(n);
  let peak = 1e-6;
  for (let i = 0; i < n; i++) {
    let s = 0; const a = i * win, b = Math.min(samples.length, a + win);
    for (let j = a; j < b; j++) s += samples[j] * samples[j];
    env[i] = Math.sqrt(s / Math.max(1, b - a)); if (env[i] > peak) peak = env[i];
  }
  for (let i = 0; i < n; i++) env[i] = Math.min(1, env[i] / peak);
  return { samples, dur: samples.length / SR, env, envRate: rate };
}
function blipVoice(text, pf = 1) {
  const syl = text.replace(/[^a-záéíóúñ]/gi, '').length;
  const n = Math.floor(SR * (0.07 * syl + 0.2)), o = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const k = Math.floor(i / (SR * 0.07)), f = (170 + ((k * 37) % 90)) * pf;
    const ph = (i / SR) * f, env = Math.max(0, Math.sin(((i % (SR * 0.07)) / (SR * 0.07)) * Math.PI));
    o[i] = (Math.sin(ph * 2 * Math.PI) + 0.4 * Math.sin(ph * 4 * Math.PI)) * 0.3 * env;
  }
  return o;
}

// --- SFX sintetizados ---------------------------------------------------------
function noise() { return Math.random() * 2 - 1; }
const SFX = {
  pop:    () => tone(0.12, t => Math.sin(2 * Math.PI * (420 + 900 * Math.exp(-t * 40)) * t), t => Math.exp(-t * 30), 0.6),
  whoosh: () => { let lp = 0; return tone(0.5, t => { lp += (noise() - lp) * (0.04 + 0.5 * Math.sin(Math.PI * Math.min(1, t / 0.5))); return lp * 3; }, t => Math.sin(Math.PI * Math.min(1, t / 0.5)), 0.5); },
  ding:   () => tone(1.1, t => Math.sin(2 * Math.PI * 1318 * t) + 0.4 * Math.sin(2 * Math.PI * 2637 * t) + 0.2 * Math.sin(2 * Math.PI * 3951 * t), t => Math.exp(-t * 4.2), 0.35),
  boing:  () => tone(0.55, t => Math.sin(2 * Math.PI * (260 + 140 * Math.sin(t * 38) * Math.exp(-t * 4) + 60 * Math.exp(-t * 6)) * t), t => Math.exp(-t * 5), 0.5),
  thud:   () => tone(0.4, t => Math.sin(2 * Math.PI * (90 * Math.exp(-t * 6) + 40) * t) + 0.3 * noise() * Math.exp(-t * 30), t => Math.exp(-t * 9), 0.9),
  sting:  () => tone(0.6, t => { const f = 330 * Math.pow(2, Math.floor(t * 8) / 12); return Math.sign(Math.sin(2 * Math.PI * f * t)) * 0.4 + Math.sin(2 * Math.PI * f * 1.5 * t) * 0.2; }, t => Math.exp(-t * 4), 0.4),
  scratch:() => { let lp = 0; return tone(0.45, t => { lp += (noise() - lp) * 0.35; return lp * Math.sin(2 * Math.PI * (700 - 1200 * t) * t); }, t => 1 - t / 0.45, 0.6); },
  gulp:   () => tone(0.25, t => Math.sin(2 * Math.PI * (200 - 300 * t) * t), t => Math.sin(Math.PI * t / 0.25), 0.6),
  crunch: () => tone(0.3, t => noise() * (Math.sin(t * 90) > 0 ? 1 : 0.2), t => Math.exp(-t * 14), 0.5),
  sparkle:() => tone(0.7, t => Math.sin(2 * Math.PI * (1800 + 2400 * ((t * 14) % 1)) * t), t => Math.exp(-t * 5), 0.25),
  clang:  () => tone(0.8, t => Math.sin(2 * Math.PI * 740 * t) + 0.6 * Math.sin(2 * Math.PI * 1190 * t) + 0.5 * Math.sin(2 * Math.PI * 1710 * t), t => Math.exp(-t * 6), 0.4),
};
function tone(dur, fn, envFn, gain = 1) {
  const n = Math.floor(SR * dur), o = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = i / SR; o[i] = fn(t) * envFn(t) * gain; }
  return o;
}

// --- Mezcla ------------------------------------------------------------------
class Mixer {
  constructor(duration) {
    this.n = Math.ceil((duration + 0.5) * SR);
    this.buf = new Float32Array(this.n);
    this.voiceMask = new Float32Array(Math.ceil(duration * 100) + 10);
  }
  add(samples, t, gain = 1) {
    const s0 = Math.floor(t * SR);
    for (let i = 0; i < samples.length && s0 + i < this.n; i++) if (s0 + i >= 0) this.buf[s0 + i] += samples[i] * gain;
  }
  addVoice(samples, t, gain = 1) {
    this.add(samples, t, gain);
    for (let k = Math.floor(t * 100); k < Math.min(this.voiceMask.length, Math.ceil((t + samples.length / SR) * 100)); k++) this.voiceMask[k] = 1;
  }
  sfx(name, t, gain = 1) {
    if (!SFX[name]) throw new Error('SFX desconocido: ' + name);
    this.add(SFX[name](), t, gain);
  }
  // Música de fondo: bajo + acordes + campanita, con "ducking" bajo la voz
  music(style = 'bouncy', gain = 0.12) {
    const bpm = style === 'chill' ? 84 : 112, beat = 60 / bpm;
    const prog = [[0, 4, 7], [-3, 0, 4], [-5, -1, 2], [-7, -3, 0]];       // C, Am, G, F aprox
    const root = 130.81;
    let duck = 1;
    const total = this.n / SR;
    const m = new Float32Array(this.n);
    for (let b = 0; b * beat < total; b++) {
      const chord = prog[Math.floor(b / 4) % 4], t0 = b * beat;
      const note = (semi, oct = 1) => root * oct * Math.pow(2, semi / 12);
      // bajo
      addNote(m, t0, beat * 0.9, note(chord[0], 0.5), 'tri', 0.9);
      // arpegio
      for (let k = 0; k < 2; k++) addNote(m, t0 + k * beat / 2, beat * 0.45, note(chord[(b * 2 + k) % 3], 2), 'sine', 0.4);
      if (b % 2 === 1) addNote(m, t0 + beat / 2, beat * 0.4, note(chord[2], 4), 'sine', 0.22);
    }
    for (let i = 0; i < this.n; i++) {
      const target = this.voiceMask[Math.floor(i / SR * 100)] ? 0.35 : 1;
      duck += (target - duck) * 0.0008;
      this.buf[i] += m[i] * gain * duck;
    }
  }
  save(file) {
    let peak = 0; for (let i = 0; i < this.n; i++) peak = Math.max(peak, Math.abs(this.buf[i]));
    const g = peak > 0.95 ? 0.95 / peak : 1;
    const o = new Float32Array(this.n); for (let i = 0; i < this.n; i++) o[i] = Math.tanh(this.buf[i] * g * 1.1);
    writeWav(file, o);
  }
}
function addNote(buf, t, dur, f, type, g) {
  const s0 = Math.floor(t * SR), n = Math.floor(dur * SR);
  for (let i = 0; i < n && s0 + i < buf.length; i++) {
    const tt = i / SR, ph = tt * f;
    const w = type === 'tri' ? 2 * Math.abs(2 * (ph - Math.floor(ph + 0.5))) - 1 : Math.sin(2 * Math.PI * ph);
    buf[s0 + i] += w * g * Math.exp(-tt * 5) * Math.min(1, tt * 200);
  }
}

module.exports = { tts, Mixer, SFX, SR };
