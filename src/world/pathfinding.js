// A* pathfinding over a GameMap tile grid (8-directional, no corner cutting),
// plus breadth-first routing across maps through doors.

class MinHeap {
  constructor() { this.items = []; }
  get size() { return this.items.length; }
  push(node) {
    const a = this.items;
    a.push(node);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].f <= a[i].f) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.items;
    const top = a[0];
    const last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l].f < a[m].f) m = l;
        if (r < a.length && a[r].f < a[m].f) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}

const DIRS = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
];

/**
 * @returns {Array<{x:number,y:number}>|null} tile path excluding the start tile, or null.
 */
export function findPath(map, sx, sy, gx, gy, actor, maxNodes = 14000) {
  if (sx === gx && sy === gy) return [];
  const goalBlocked = map.blockedTile(gx, gy, actor);
  const W = map.width;
  const key = (x, y) => y * W + x;
  const h = (x, y) => {
    const dx = Math.abs(x - gx);
    const dy = Math.abs(y - gy);
    return dx + dy + (Math.SQRT2 - 2) * Math.min(dx, dy);
  };
  const open = new MinHeap();
  const g = new Map([[key(sx, sy), 0]]);
  const came = new Map();
  open.push({ x: sx, y: sy, f: h(sx, sy) });
  let expanded = 0;
  while (open.size && expanded < maxNodes) {
    const cur = open.pop();
    const ck = key(cur.x, cur.y);
    if (cur.x === gx && cur.y === gy) {
      const path = [];
      let k = ck;
      while (came.has(k)) {
        path.push({ x: k % W, y: Math.floor(k / W) });
        k = came.get(k);
      }
      return path.reverse();
    }
    expanded++;
    for (const [dx, dy, cost] of DIRS) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      const isGoal = nx === gx && ny === gy;
      if (map.blockedTile(nx, ny, actor) && !(isGoal && goalBlocked)) continue;
      if (dx && dy && (map.blockedTile(cur.x + dx, cur.y, actor) || map.blockedTile(cur.x, cur.y + dy, actor))) continue;
      const nk = key(nx, ny);
      const ng = g.get(ck) + cost * (map.walkCost ? map.walkCost(nx, ny) : 1);
      if (ng < (g.get(nk) ?? Infinity)) {
        g.set(nk, ng);
        came.set(nk, ck);
        open.push({ x: nx, y: ny, f: ng + h(nx, ny) });
      }
    }
  }
  return null;
}

/**
 * Breadth-first search over the door graph.
 * @param {Map<string,GameMap>} maps
 * @returns {Array<{map:string, door:object}>|null} sequence of doors to take, [] if same map.
 */
export function routeBetweenMaps(maps, fromMap, toMap, actor) {
  if (fromMap === toMap) return [];
  const prev = new Map([[fromMap, null]]);
  const queue = [fromMap];
  while (queue.length) {
    const id = queue.shift();
    const m = maps.get(id);
    if (!m) continue;
    for (const door of m.doors) {
      const next = door.to?.map;
      if (!next || prev.has(next)) continue;
      if (actor?.canPass && !actor.canPass(door)) continue;
      prev.set(next, { map: id, door });
      if (next === toMap) {
        const route = [];
        let cur = toMap;
        while (prev.get(cur)) {
          route.unshift(prev.get(cur));
          cur = prev.get(cur).map;
        }
        return route;
      }
      queue.push(next);
    }
  }
  return null;
}

export function pathLength(path) {
  let len = 0;
  for (let i = 1; i < path.length; i++) len += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
  return len + (path.length ? 1 : 0);
}
