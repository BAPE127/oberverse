// Seeded, serializable PRNG (mulberry32). All simulation randomness goes through
// an Rng instance so that state is saved and tests are deterministic.
export class Rng {
  constructor(seed = 0x0b3e) {
    this.state = seed >>> 0;
  }
  next() {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(min, max) {
    return min + this.next() * (max - min);
  }
  int(min, maxInclusive) {
    return Math.floor(this.range(min, maxInclusive + 1));
  }
  chance(p) {
    return this.next() < p;
  }
  pick(list) {
    if (!list || list.length === 0) return undefined;
    return list[Math.floor(this.next() * list.length)];
  }
  serialize() {
    return { state: this.state };
  }
  static from(data) {
    const r = new Rng();
    if (data && Number.isFinite(data.state)) r.state = data.state >>> 0;
    return r;
  }
}

/** Stable 32-bit string hash, used for deterministic visual variation. */
export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function hash2(x, y) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
