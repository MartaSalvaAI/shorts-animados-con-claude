#!/usr/bin/env node
// Llama a Fish Audio. La clave se lee SOLO de la variable de entorno FISH_API_KEY.
// Uso: echo "texto" | node fish_cli.js <reference_id> <salida.mp3> [speed] [model]
require('./env');
const fs = require('fs');
const [ref, out, speed, model] = process.argv.slice(2);
const key = process.env.FISH_API_KEY;
if (!key) { console.error('Falta FISH_API_KEY'); process.exit(2); }
const text = fs.readFileSync(0, 'utf8').trim();
const body = { text, reference_id: ref, format: 'mp3', latency: 'normal' };
if (speed && Number(speed) !== 1) body.prosody = { speed: Number(speed) };
fetch('https://api.fish.audio/v1/tts', {
  method: 'POST',
  headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', model: model || 's2.1-pro-free' },
  body: JSON.stringify(body),
}).then(async r => {
  if (!r.ok) { console.error('Fish HTTP ' + r.status + ': ' + (await r.text()).slice(0, 200)); process.exit(3); }
  fs.writeFileSync(out, Buffer.from(await r.arrayBuffer()));
}).catch(e => { console.error(e.message); process.exit(4); });
