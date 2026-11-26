// Funciones de easing (u en 0..1)
const ease = {
  linear: u => u,
  step: u => (u >= 1 ? 1 : 0),
  inQuad: u => u * u,
  outQuad: u => 1 - (1 - u) * (1 - u),
  inOutQuad: u => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2),
  inCubic: u => u * u * u,
  outCubic: u => 1 - Math.pow(1 - u, 3),
  inOutCubic: u => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
  inOutSine: u => -(Math.cos(Math.PI * u) - 1) / 2,
  outBack: u => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); },
  outElastic: u => (u === 0 ? 0 : u === 1 ? 1 : Math.pow(2, -10 * u) * Math.sin((u * 10 - 0.75) * (2 * Math.PI) / 3) + 1),
  outBounce: u => {
    const n = 7.5625, d = 2.75;
    if (u < 1 / d) return n * u * u;
    if (u < 2 / d) return n * (u -= 1.5 / d) * u + 0.75;
    if (u < 2.5 / d) return n * (u -= 2.25 / d) * u + 0.9375;
    return n * (u -= 2.625 / d) * u + 0.984375;
  },
};
module.exports = { ease };
