// "Del 1 al 10… un doce" con poses de cuerpo completo generadas en Flow
const { Short, fx } = require('../engine');

module.exports = function build(opts = {}) {
  const s = new Short({ scene: 'kitchen', music: 'bouncy', ...opts });
  const ana = s.poseCharacter('ana', { dir: 'assets/poses/ana', headW: 215, start: 'ofreciendo_plato_a', headOverride: { enfadada_a: 320, enfadada_b: 316 } },
    { voice: 'woman', x: -160, y: 1650, scale: 1 });
  const leo = s.poseCharacter('leo', { dir: 'assets/poses/leo', headW: 245, start: 'base_a', mouths: { comiendo_a: { x: 385, y: 410, w: 96 }, comiendo_a_vacio: { x: 385, y: 410, w: 96 } } },
    { voice: 'man', x: 810, y: 1665, scale: 1 });

  s.effect(0, 0.6, fx.fadeBlack(true));
  // 1) Ana llega con el plato mientras habla
  ana.walk(0.2, 1.7, 400);
  s.at(0.3);
  s.say(ana, 'Cariño, prueba mis tortitas.', { gap: 0.05 });
  // 2) entrega: corte, Leo ya tiene el plato
  let t = Math.max(s.cursor, 2.0);
  ana.pose(t, 'base_a').pop(t, 0.08);
  leo.pose(t, 'comiendo_a').pop(t, 0.1);
  s.sfx('pop', t); s.sfx('whoosh', t - 0.1, 0.4);
  // 3) Leo come de verdad: abre la boca, el bocado entra, mastica con la boca moviéndose y traga
  s.sfx('whoosh', t + 0.15, 0.3);
  leo.to(t + 0.3, 0.25, { mouth: 1 }, 'outCubic');               // boca bien abierta
  leo.pose(t + 0.7, 'comiendo_a_vacio');                          // el bocado ya está dentro
  leo.to(t + 0.7, 0.12, { mouth: 0 }, 'linear');
  leo.chew(t + 0.85, 1.5);                                        // mastica (boca abre y cierra)
  for (let i = 0; i < 6; i++) s.sfx('crunch', t + 0.9 + i * 0.25, 0.5);
  s.sfx('gulp', t + 2.45);
  s.at(t + 2.8);
  // 4) la pregunta
  s.say(ana, '¿Del uno al diez, qué nota le pones?', { pose: 'pidiendo_a', gap: 0.2 });
  t = s.cursor;
  s.zoomTo(t, 1.0, 1.3, 700, 1150, 'inOutCubic');
  s.at(t + 1.1);
  // 5) "Un doce"
  t = s.cursor;
  leo.pose(t, 'chulo_a');
  s.say(leo, 'Un doce.', { gap: 0.15 });
  s.sfx('sting', t, 0.8); s.sfx('ding', t + 0.3, 0.6);
  s.punch(t, 1.5, 690, 1150);
  s.effect(t + 0.05, 0.9, fx.bigText('12', 800, 420, { size: 320 }), 'screen');
  s.effect(t, 0.4, fx.flash('#fff', 0.6));
  // 6) Ana flipa
  t = s.cursor;
  s.zoomTo(t, 0.25, 1.25, 380, 1150, 'outCubic');
  ana.pose(t, 'asustada_a').hop(t, 90, 0.45).shake(t + 0.4, 0.9, 0.6);
  s.sfx('scratch', t, 0.8); s.sfx('boing', t + 0.1, 0.7);
  s.effect(t, 1.1, fx.speedLines(300, 1050));
  s.say(ana, '¿¡Un doce!? ¡Si el máximo es diez!', { popAmt: 0.16 });
  // 7) explicación
  t = s.cursor + 0.1;
  s.zoomTo(t, 0.5, 1.3, 700, 1150, 'inOutCubic');
  s.at(t);
  s.say(leo, 'Diez por la tortita… y dos por la cara que pones cocinando.', { rate: 170 });
  // 8) Ana se derrite
  t = s.cursor + 0.05;
  s.zoomTo(t, 0.6, 1.3, 380, 1150, 'inOutCubic');
  ana.pose(t, 'sonrojada_a').shake(t, 0.5, 0.5);
  s.sfx('sparkle', t, 0.6);
  s.effect(t, 1.6, fx.hearts(380, 900, 7), 'world');
  s.say(ana, '¡Ay, para!', { gap: 0.2 });
  // 9) remate
  t = s.cursor;
  s.zoomTo(t, 0.7, 1.0, 540, 960, 'inOutCubic');
  leo.pose(t, 'plato_vacio_a').hop(t + 0.05, 60, 0.4);
  s.say(leo, '¿Y hay más?', { gap: 0.1 });
  t = s.cursor;
  ana.pose(t, 'pidiendo_a').pop(t, 0.12);           // lamento de pena, no de furia
  s.sfx('boing', t, 0.5);
  s.punch(t, 1.12, 300, 1100);
  s.say(ana, '¡Pero la última era esa!', { popAmt: 0.12 });
  s.wait(0.5);
  s.effect(s.cursor - 0.5, 0.6, fx.fadeBlack());
  return s;
};
