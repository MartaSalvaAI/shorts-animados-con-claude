---
name: shorts-animados-con-claude
description: Crea Shorts/Reels verticales 9:16 de dibujos animados 2D (stickman cartoon con cabeza grande, estilo ilustración IA) con personajes de cuerpo completo generados en Google Flow (Nano Banana), voces en español con Fish Audio, subtítulos palabra a palabra, SFX y música, animados por un motor Node y renderizados a MP4. Úsala cuando se pida un short/reel animado con personajes tipo los pines de Pinterest, "motor de animación 2D de shorts", o repetir el proceso de las tortitas (Ana y Leo) con otra historia.
---

# Shorts animados con poses de Flow

Proceso validado con "Del 1 al 10… un doce" (Ana y Leo). Todo en español. Copia `template/` de esta skill
a la carpeta del proyecto y haz `npm i @napi-rs/canvas`.

## Flujo
1. **Guion y beats.** Escribe 6–9 frases cortas (≤25 s en total) con remate. Para cada frase decide la pose del personaje:
   la emoción debe cuadrar con lo que dice y las acciones deben tener lógica (si entrega un plato, hay corte de entrega;
   si come, abre la boca). Evita expresiones exageradas que no encajen.
2. **Personajes de cuerpo completo en Flow.** Usa el navegador integrado; pide a la persona que inicie sesión en flow.google.com si no la tiene.
   - Nano Banana 2.1, formato 9:16, x2. Primero una imagen base por personaje (A-pose, fondo verde #00ff00, cabeza enorme
     blanca sombreada, miembros de palo finos, guantes blancos, zapatos negros grandes, línea negra gruesa).
   - Cada pose: botón "+" del prompt → elegir la imagen base como referencia → "Same exact character as the reference image
     (…descripción…), same art style, solid pure green #00ff00 background, full body visible. New pose: …".
   - Un prompt a la vez; si hay cola, Return no envía → pulsar la flecha. Prompts seguidos se fusionan en una imagen.
   - Genera por personaje: base, una pose por emoción/acción del guion, y variantes con objetos (plato, tenedor).
3. **Descargar** (las descargas del navegador no funcionan): servidor Node local 127.0.0.1:8765 que guarda POSTs, y en la
   página de Flow un `<form method=POST target=_self>` con la imagen en base64 (`fetch(src.replace('=s512-rw','=s1536-rw'))` →
   FileReader), una por llamada (la página recarga). Guarda en `poses/<personaje>/` y convierte WebP→PNG con ffmpeg.
   Pide permiso antes de descargar.
4. **Recortar**: `node tools/cutposes.js` quita el verde y deja `assets/poses/<personaje>/<pose>.png`. Las imágenes con dos
   personajes juntos se parten por la columna más vacía (ajusta nombres en el script).
5. **Motor**: copia `shorts/ejemplo_tortitas_poses.js`, define `s.poseCharacter(nombre, {dir, headW, start, mouths})` y encadena
   `s.say(personaje, 'texto', {pose})`, `.pose(t, nombre)`, `.chew()`, `.hop()`, `s.zoomTo/punch`, `s.sfx`, `s.effect(fx.*)`.
   `headW` iguala el tamaño de cabeza entre personajes (la cara se detecta como la mayor región blanca; si la cara no es blanca,
   pásala en `headOverride`). Para comer/hablar con boca abierta usa `mouths: {pose:{x,y,w}}` (píxeles de la imagen) + `mouth`/`chew`.
   Para quitar un objeto de una pose usa `tools/quitar_bocado.js` como modelo (rellena de blanco dentro de la cara).
6. **Voces**: Fish Audio. La clave va en `.env` (`FISH_API_KEY=`, ver `.env.example`); nunca en chat ni ficheros del proyecto
   distintos a `.env`. Voces por defecto en `engine/index.js` (mujer "Chica", hombre "Lee know"); comprueba tono con `tools/f0.js`.
   Sin clave válida cae a voces de macOS con nombre completo de locale ("Flo (Español (España))"; la "Flo" a secas habla inglés).
7. **Render y verificación**: `node render.js shorts/x.js --scale 0.5 --still 1.2,4,8` para stills; luego sin flags para el MP4
   (`out/x.mp4`). Mira fotogramas clave (entrega, comida, remate), mide audio con `ffmpeg -af volumedetect`, y entrega diciendo
   qué no se pudo oír/ver. Limpia PNG temporales de `out/`.

## Límites conocidos
- La boca solo se anima donde hay overlay `mouths`; en el resto hay rebote con la voz. Sincronía labial real = generar en Flow
  una variante con boca abierta por pose.
- Los pines de Pinterest están tras login: solo se ven miniaturas; el movimiento no se puede analizar.
- vidIQ image_generate cuesta 22 créditos/imagen; usar Flow.
