export const TILE = 32;

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

export function deepClone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

/** Compare a number against a string expression like ">=20", "<5", "==3" or a bare number. */
export function compare(actual, expr) {
  if (typeof expr === 'number') return actual === expr;
  if (typeof expr === 'boolean') return Boolean(actual) === expr;
  const m = /^\s*(>=|<=|==|!=|>|<)?\s*(-?\d+(?:\.\d+)?)\s*$/.exec(String(expr));
  if (!m) return false;
  const op = m[1] || '==';
  const n = Number(m[2]);
  const a = Number(actual) || 0;
  switch (op) {
    case '>=': return a >= n;
    case '<=': return a <= n;
    case '>': return a > n;
    case '<': return a < n;
    case '!=': return a !== n;
    default: return a === n;
  }
}

/** Fill {tokens} in a line from a lookup object. Unknown tokens are left visible. */
export function interpolate(text, vars) {
  return String(text).replace(/\{(\w+)\}/g, (all, key) => (vars[key] !== undefined ? vars[key] : all));
}

export function parseSpotRef(ref) {
  const i = String(ref).indexOf(':');
  if (i < 0) return { map: null, spot: ref };
  return { map: ref.slice(0, i), spot: ref.slice(i + 1) };
}
