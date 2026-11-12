// The isometric view's maths (docs/RENDERING.md section 2). Pure: no DOM, runs in Node.
//
// 2:1 dimetric, the camera looking north-west. World points are in pixels (32 to a tile);
// z is height above the ground in pixels. One iso unit is one art pixel, so upright sprites
// keep their size.
//
//   ix = wx - wy        iy = (wx + wy) / 2 - z        depth d = wx + wy

export const project = (wx, wy, z = 0) => ({ x: wx - wy, y: (wx + wy) / 2 - z });

/** The ground point (at height z) that shows at iso (ix, iy). */
export const unproject = (ix, iy, z = 0) => ({ x: iy + z + ix / 2, y: iy + z - ix / 2 });

export const depth = (wx, wy) => wx + wy;

/** A ground box (world px) for a person or small prop: a point with a small radius. */
export const pointBox = (x, y, r = 2) => ({ x0: x - r, y0: y - r, x1: x + r, y1: y + r });

/** The bounding ground box of a rotated rectangle (a car, an aircraft): length along `angle`. */
export function bodyBox(cx, cy, len, wid, angle) {
  const c = Math.abs(Math.cos(angle));
  const s = Math.abs(Math.sin(angle));
  const hx = (c * len + s * wid) / 2;
  const hy = (s * len + c * wid) / 2;
  return { x0: cx - hx, y0: cy - hy, x1: cx + hx, y1: cy + hy };
}

const centreDepth = (b) => (b.x0 + b.x1 + b.y0 + b.y1) / 2;

/** A is clearly nearer the camera than B: wholly east of it or wholly south of it. */
const nearer = (a, b) => a.x0 >= b.x1 || a.y0 >= b.y1;

/**
 * Is ground box A drawn in front of ground box B? The separating-axis rule first; where it says
 * both or neither, the larger centre depth wins (ties: B stays behind, so the sort is stable).
 */
export function inFront(a, b) {
  const fa = nearer(a, b);
  const fb = nearer(b, a);
  if (fa !== fb) return fa;
  return centreDepth(a) > centreDepth(b);
}

/** The iso-space rectangle an item covers: its own `rect`, or its ground box seen from above plus `up` px of height. */
export function rectOf(it) {
  if (it.rect) return it.rect;
  const b = it.box;
  return { x0: b.x0 - b.y1, x1: b.x1 - b.y0, y0: (b.x0 + b.y0) / 2 - (it.up || 0), y1: (b.x1 + b.y1) / 2 };
}

const CELL = 128;
const BIG_CELLS = 64;

/**
 * Back-to-front order (a new array). Items carry a ground `box` and, optionally, a screen `rect`
 * (else it is derived from the box and `up`). Bucketed by screen cell; the pairwise rule is applied
 * only to items whose rectangles overlap; the graph is then walked back to front with centre depth
 * as the tie-break and as the way out of a cycle.
 */
export function sortItems(items) {
  const n = items.length;
  if (n < 2) return items.slice();
  const rects = items.map(rectOf);
  const dd = items.map((it) => centreDepth(it.box));
  const adj = Array.from({ length: n }, () => []);
  const indeg = new Array(n).fill(0);
  const seen = new Set();
  const consider = (i, j) => {
    if (i === j) return;
    const lo = i < j ? i : j;
    const hi = i < j ? j : i;
    const key = lo * n + hi;
    if (seen.has(key)) return;
    seen.add(key);
    const a = rects[lo];
    const b = rects[hi];
    if (a.x0 >= b.x1 || b.x0 >= a.x1 || a.y0 >= b.y1 || b.y0 >= a.y1) return;
    // an edge runs from the item drawn first to the one drawn over it
    const hiOver = !inFront(items[lo].box, items[hi].box); // (equal depth: the later item goes over, so the order is stable)
    const from = hiOver ? lo : hi;
    const to = hiOver ? hi : lo;
    adj[from].push(to);
    indeg[to]++;
  };
  const buckets = new Map();
  const big = [];
  for (let i = 0; i < n; i++) {
    const r = rects[i];
    const cx0 = Math.floor(r.x0 / CELL);
    const cx1 = Math.floor(r.x1 / CELL);
    const cy0 = Math.floor(r.y0 / CELL);
    const cy1 = Math.floor(r.y1 / CELL);
    if ((cx1 - cx0 + 1) * (cy1 - cy0 + 1) > BIG_CELLS) { big.push(i); continue; }
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      const k = cy * 65599 + cx;
      let list = buckets.get(k);
      if (!list) buckets.set(k, (list = []));
      for (const j of list) consider(i, j);
      list.push(i);
    }
  }
  for (const i of big) for (let j = 0; j < n; j++) consider(i, j);

  // Kahn's walk, always taking the ready item with the smallest depth
  const less = (a, b) => dd[a] < dd[b] || (dd[a] === dd[b] && a < b);
  const heap = [];
  const push = (v) => {
    heap.push(v);
    let k = heap.length - 1;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (!less(heap[k], heap[p])) break;
      [heap[k], heap[p]] = [heap[p], heap[k]];
      k = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      let k = 0;
      for (;;) {
        const l = 2 * k + 1;
        const r = l + 1;
        let m = k;
        if (l < heap.length && less(heap[l], heap[m])) m = l;
        if (r < heap.length && less(heap[r], heap[m])) m = r;
        if (m === k) break;
        [heap[k], heap[m]] = [heap[m], heap[k]];
        k = m;
      }
    }
    return top;
  };
  for (let i = 0; i < n; i++) if (!indeg[i]) push(i);
  const byDepth = Array.from({ length: n }, (_, i) => i).sort((a, b) => (less(a, b) ? -1 : 1));
  const done = new Array(n).fill(false);
  const out = [];
  let ptr = 0;
  const finish = (i) => {
    done[i] = true;
    out.push(items[i]);
    for (const j of adj[i]) if (--indeg[j] === 0 && !done[j]) push(j);
  };
  while (out.length < n) {
    let i;
    if (heap.length) {
      i = pop();
      if (done[i]) continue;
    } else {
      // a cycle: let the shallowest item out
      while (done[byDepth[ptr]]) ptr++;
      i = byDepth[ptr];
    }
    finish(i);
  }
  return out;
}

/**
 * The fade rule: is the focus (a point, world px) behind the building's ground box, outside its
 * footprint? Behind means the building is drawn over it: focus.x < x1 and focus.y < y1.
 */
export function behindBox(focus, box) {
  if (!(focus.x < box.x1 && focus.y < box.y1)) return false;
  return !(focus.x >= box.x0 && focus.y >= box.y0);
}

/**
 * Does a prism (ground box, `h` px tall) hide the point (wx, wy) at height z from the camera? The sight
 * line runs up and to the south-east, (t, t, t); exact. This is the "building covers the focus" test.
 */
export function hidesPoint(box, h, wx, wy, z = 0) {
  const lo = Math.max(box.x0 - wx, box.y0 - wy, 0);
  const hi = Math.min(box.x1 - wx, box.y1 - wy, h - z);
  return lo < hi;
}

/**
 * Does a prism (ground box, `h` px tall) cover the screen point (ix, iy)? Returns the greatest height z in [0, h] at which the
 * point lies on the prism (the surface the eye meets first: the roof when z = h), or -1 when it misses. Exact; the sight line
 * through a screen point runs up and to the south-east, so the highest z is the nearest to the camera.
 */
export function prismHit(box, h, ix, iy) {
  const lo = Math.max(box.x0 - iy - ix / 2, box.y0 - iy + ix / 2, 0);
  const hi = Math.min(box.x1 - iy - ix / 2, box.y1 - iy + ix / 2, h);
  return lo <= hi ? hi : -1;
}

/**
 * The sprite facing for a person: from the screen direction of motion, or of `facing` when still.
 * (dx, dy) is the world velocity; sx = dx - dy and sy = dx + dy are its screen components.
 */
export function spriteFacing(dx, dy) {
  const sx = dx - dy;
  const sy = dx + dy;
  if (Math.abs(sx) > 1.5 * Math.abs(sy)) return sx > 0 ? 'right' : 'left';
  return sy > 0 ? 'down' : 'up';
}

const FACING_VEC = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
export const facingVector = (facing) => FACING_VEC[facing] || FACING_VEC.down;

const SQRT1_2 = Math.SQRT1_2;

/**
 * On-foot input in the isometric view: the keys follow the screen. Screen-right is world (+x, -y),
 * screen-down is world (+x, +y). A screen-cardinal key is nudged by 2% so `player.facing` (which
 * breaks a tie towards the y axis) resolves to the nearer world direction every time.
 */
export function rotateInput(move) {
  const sx = move.x || 0;
  const sy = move.y || 0;
  let x = (sx + sy) * SQRT1_2;
  let y = (sy - sx) * SQRT1_2;
  const len = Math.hypot(x, y);
  if (len > 1) { x /= len; y /= len; }
  if (sy === 0 && sx !== 0) x *= 1.02;
  else if (sx === 0 && sy !== 0) y *= 1.02;
  return { ...move, x, y };
}
