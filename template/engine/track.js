// Pista de keyframes: propiedad numérica -> [{t, v, e}]
const { ease } = require('./ease');

class Track {
  constructor(defaults) {
    this.defaults = defaults;
    this.keys = {};
  }
  val(p, t) {
    const k = this.keys[p];
    if (!k || !k.length) return this.defaults[p];
    if (t <= k[0].t) return k[0].v;
    for (let i = 1; i < k.length; i++) {
      if (t <= k[i].t) {
        const a = k[i - 1], b = k[i];
        const u = (t - a.t) / (b.t - a.t || 1e-6);
        return a.v + (b.v - a.v) * ease[b.e](Math.min(1, Math.max(0, u)));
      }
    }
    return k[k.length - 1].v;
  }
  // Anima props desde su valor en t hasta el destino en t+dur
  to(t, dur, props, e = 'inOutQuad') {
    for (const p of Object.keys(props)) {
      const v0 = this.val(p, t);
      const arr = (this.keys[p] ||= [{ t: -10, v: this.defaults[p], e: 'linear' }]);
      while (arr.length > 1 && arr[arr.length - 1].t > t) arr.pop();
      if (arr[arr.length - 1].t < t) arr.push({ t, v: v0, e: 'linear' });
      arr.push({ t: t + Math.max(dur, 0.001), v: props[p], e });
    }
    return this;
  }
  set(t, props) { return this.to(t, 0.001, props, 'linear'); }
}
module.exports = { Track };
