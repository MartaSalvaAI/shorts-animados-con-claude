# Shorts animados con Claude

Skill de Claude Code para crear Shorts y Reels verticales (9:16) de dibujos animados 2D: dos personajes de palo con cabeza grande, poses generadas en Google Flow (Nano Banana), voces en español con Fish Audio, subtítulos palabra a palabra, efectos y música. No hace falta saber programar: se lo pides a Claude.

## Qué necesitas

- Claude Code (de pago).
- Node.js 18 o superior y ffmpeg.
- Una cuenta de Google para Google Flow: https://flow.google.com
- Una cuenta de Fish Audio y su clave: https://fish.audio/app/api-keys/

## Instalación

1. Descarga este repositorio (botón verde Code → Download ZIP) y descomprímelo.
2. Copia la carpeta dentro de `~/.claude/skills/` (en Windows, `C:\Users\TU_USUARIO\.claude\skills\`).
3. Abre Claude Code y pídele: «usa la skill shorts-animados-con-claude para hacer un short de una escena cotidiana en pareja».

## La clave de Fish Audio

Copia `template/.env.example` como `.env` en la carpeta de tu proyecto y pon tu clave detrás de `FISH_API_KEY=`. No la pegues en el chat ni la subas a ningún sitio.

## Qué hay dentro

- `SKILL.md`: los pasos que sigue Claude.
- `template/`: el motor de animación (Node), un short de ejemplo y las herramientas para recortar las poses.
