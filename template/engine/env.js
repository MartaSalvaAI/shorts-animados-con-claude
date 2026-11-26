// Carga .env de la raíz del proyecto (un valor no vacío del .env manda sobre el entorno).
const fs = require('fs'), path = require('path');
try {
  for (const line of fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && m[2] && !line.trim().startsWith('#')) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {}
