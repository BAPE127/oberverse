// Organic city generator (mock only): roads are curves stamped onto the game's tile grid, buildings are placed off the roads wherever a
// door can reach pavement. Output is the game's own map format, drawn by the game's own renderer.
import { STYLES } from './pwmaps.js';
const hash = (a, b = 0, c = 0) => { let h = ((a | 0) * 374761393 + (b | 0) * 668265263 + (c | 0) * 2147483647) >>> 0; h = ((h ^ (h >>> 13)) * 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const pick = (arr, k, s = 0) => arr[Math.floor(hash(k, arr.length, 7 + s) * arr.length) % arr.length];
export function smooth(pts, seg = 10) { const P = [pts[0], ...pts, pts[pts.length - 1]]; const out = []; for (let i = 1; i < P.length - 2; i++) { const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]]; for (let k = 0; k < seg; k++) { const t = k / seg, t2 = t * t, t3 = t2 * t; out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3))); } } out.push(pts[pts.length - 1]); return out; }
export function organic(cfg) {
  const { W, H } = cfg; const base = cfg.ground || ','; const g = Array.from({ length: H }, () => Array(W).fill(base));
  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H; const set = (x, y, c) => { if (inb(x, y)) g[y][x] = c; }; const get = (x, y) => (inb(x, y) ? g[y][x] : 'x');
  const T = {
    get, set, W, H,
    where(fn, c) { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (fn(x, y)) g[y][x] = c; },
    disc(cx, cy, r, c) { for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r) set(x, y, c); },
    stroke(path, w, c, only) { for (let i = 0; i < path.length - 1; i++) { const [a, b] = [path[i], path[i + 1]]; const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2)); for (let k = 0; k <= n; k++) { const x = a[0] + (b[0] - a[0]) * k / n, y = a[1] + (b[1] - a[1]) * k / n; for (let yy = Math.floor(y - w / 2); yy <= y + w / 2; yy++) for (let xx = Math.floor(x - w / 2); xx <= x + w / 2; xx++) if ((xx + 0.5 - x) ** 2 + (yy + 0.5 - y) ** 2 <= (w / 2) ** 2 && (!only || only.includes(get(xx, yy)))) set(xx, yy, c); } } },
    rect(x, y, w, h, c) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, c); },
  };
  cfg.paint(T);                                              // water, plazas, the road curves
  const roadPaths = cfg.roads.map((r) => ({ ...r, path: smooth(r.pts, 10) }));
  for (const r of roadPaths) { T.stroke(r.path, r.w, r.tile || '=', [base, ',', 'g', 'm', '=', '~', 'b']); }
  // bridges: road tiles that sit where water was (re-stamp as bridge)
  for (const r of roadPaths) for (const p of r.path) for (let y = Math.floor(p[1] - r.w / 2); y <= p[1] + r.w / 2; y++) for (let x = Math.floor(p[0] - r.w / 2); x <= p[0] + r.w / 2; x++) if (cfg.isWater?.(x, y) && (x + 0.5 - p[0]) ** 2 + (y + 0.5 - p[1]) ** 2 <= (r.w / 2) ** 2) set(x, y, 'b');
  let st = 12345; const R = () => { st |= 0; st = (st + 0x6D2B79F5) | 0; let t = Math.imul(st ^ (st >>> 15), 1 | st); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const laneTiles = [];
  for (let k = 0; k < (cfg.lanes ?? 70); k++) { const r = roadPaths[Math.floor(R() * roadPaths.length)]; const pi = Math.floor(R() * r.path.length); const [px, py] = r.path[pi]; const nxt = r.path[Math.min(r.path.length - 1, pi + 1)], prv = r.path[Math.max(0, pi - 1)]; const an = Math.atan2(nxt[1] - prv[1], nxt[0] - prv[0]) + (R() < 0.5 ? 1 : -1) * (Math.PI / 2 + (R() - 0.5) * 0.7); const L = 8 + Math.floor(R() * 14); const off0 = r.w / 2 + 1; const pts = []; let a2 = an, x = px + Math.cos(an) * off0, y = py + Math.sin(an) * off0; pts.push([x, y]); for (let i = 0; i < L; i++) { a2 += (R() - 0.5) * 0.25; x += Math.cos(a2); y += Math.sin(a2); const tx = Math.floor(x), ty = Math.floor(y); if (!inb(tx, ty)) break; if (g[ty][tx] === '=' || g[ty][tx] === '~' || g[ty][tx] === 'b') break; pts.push([x, y]); } if (pts.length < 6) continue; T.stroke(pts, 2, cfg.laneTile || ',', [base]); for (const p of pts) laneTiles.push([Math.floor(p[0]), Math.floor(p[1])]); }
  // distance to the nearest road tile (4-neighbour BFS), so doors can be pointed at a street
  const dist = Array.from({ length: H }, () => Array(W).fill(99)); const q = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y][x] === '=' || g[y][x] === 'b' || g[y][x] === 'm') { dist[y][x] = 0; q.push([x, y]); }
  for (const [x, y] of laneTiles) if (inb(x, y) && dist[y][x] !== 0) { dist[y][x] = 0; q.push([x, y]); }
  for (let i = 0; i < q.length; i++) { const [x, y] = q[i]; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (inb(nx, ny) && dist[ny][nx] > dist[y][x] + 1) { dist[ny][nx] = dist[y][x] + 1; q.push([nx, ny]); } } }
  const occ = Array.from({ length: H }, () => Array(W).fill(false)); const free = new Set([base, ',', 'g']);
  const REJ = { bounds: 0, occ: 0, free: 0, front: 0, reach: 0, ok: 0 }; const buildings = [], props = [], meta = { REJ, blds: [], plazas: cfg.plazas || [], roads: roadPaths.map((r) => ({ w: r.w, path: r.path, name: r.name })) }; let bn = 0, pn = 0;
  const P = (type, x, y, o = {}) => { if (inb(x, y)) props.push({ id: `p${pn++}`, type, x, y, ...o }); };
  const fits = (x, y, w, h) => { REJ.last = ''; if (x < 2 || y < 2 || x + w > W - 2 || y + h > H - 4) { REJ.bounds++; REJ.last = 'bounds'; return false; } for (let j = y - 1; j <= y + h + 1; j++) for (let i = x - 1; i <= x + w; i++) { if (!inb(i, j) || occ[j][i]) { REJ.occ++; REJ.last = 'occ ' + i + ',' + j; return false; } if (!(j >= y && j < y + h && i >= x && i < x + w) && g[j][i] === 'B') return false; if (!free.has(g[j][i])) { REJ.free++; REJ.last = 'free ' + g[j][i] + ' @' + i + ',' + j; return false; } } const dx = x + (w >> 1); for (let j = y + h; j <= y + h + 2; j++) if (!free.has(get(dx, j)) || occ[j]?.[dx]) { REJ.front++; REJ.last = 'front'; return false; } const okr = dist[Math.min(H - 1, y + h + 1)][dx] <= (cfg.reach || 4); okr ? REJ.ok++ : REJ.reach++; return okr; };
  const place = (b, st) => { buildings.push(b); for (let j = b.y; j < b.y + b.h; j++) for (let i = b.x; i < b.x + b.w; i++) g[j][i] = 'B'; for (let j = b.y - 1; j <= b.y + b.h + 1; j++) for (let i = b.x - 1; i <= b.x + b.w; i++) if (inb(i, j)) occ[j][i] = true; for (let j = b.y + b.h; j <= b.y + b.h + 2; j++) occ[j] && (occ[j][b.door.x] = true); meta.blds.push({ id: b.id, name: b.name, x: b.x, y: b.y, w: b.w, h: b.h, tower: b.tower, style: st, key: b.key }); };
  const mkBuilding = (name, x, y, w, h, S, k, o = {}) => { const wall = o.wall || pick(S.walls, k), roof = o.roof || pick(S.roofs, k + 1), trim = o.trim || pick(S.trims, k + 2), neon = o.neon || pick(S.neons, k + 3); const door = { x: x + (w >> 1), y: y + h - 1 };
    if (o.tower) return { id: `b${bn++}`, name, mapLabel: name, x, y, w, h, tower: o.tower, wall, glass: o.glass || cfg.glass || '#8fd0e8', trim, roof, sign: o.sign || name, signColor: neon, helipad: o.helipad, door, key: o.key };
    return { id: `b${bn++}`, name, mapLabel: name, x, y, w, h, sign: o.sign || name, signColor: neon, roof, wall, trim, flatRoof: true, awning: o.awning ?? (hash(x, y, 17) < 0.5 ? pick(S.awn, k + 4) : undefined), shabby: o.shabby, columns: o.columns, door, key: o.key }; };
  const district = (x, y) => { let best = 1e9, bk = cfg.seeds[0]; for (const s of cfg.seeds) { const d = Math.hypot(x - s.x, y - s.y) / (s.w || 1) + (hash(x, y, 3) - 0.5) * 6; if (d < best) { best = d; bk = s; } } return bk; };
  const used = new Set();
  // landmarks first
  for (const L of cfg.landmarks) { const S = STYLES[L.style || cfg.seeds[0].style]; let spot = null; const tryAt = (x, y) => fits(x, y, L.w, L.h); if (tryAt(L.x, L.y)) spot = [L.x, L.y]; for (let r = 1; r < 40 && !spot; r++) for (let a = 0; a < 24 && !spot; a++) { const x = Math.round(L.x + r * Math.cos(a / 24 * 6.283)), y = Math.round(L.y + r * Math.sin(a / 24 * 6.283)); if (tryAt(x, y)) spot = [x, y]; } if (!spot) { console.log('NO SPOT', L.name); continue; }
    const b = mkBuilding(L.name, spot[0], spot[1], L.w, L.h, S, 5, { ...(L.o || {}), tower: L.tower, key: L.key, sign: L.sign || L.name, helipad: L.o?.helipad }); used.add(L.name); place(b, L.style || 'landmark'); }
  // fill
  for (let pass = 0; pass < cfg.passes.length; pass++) { const ps = cfg.passes[pass]; for (let i = 0; i < ps.tries; i++) { const x = 2 + Math.floor(R() * (W - 4)), y = 2 + Math.floor(R() * (H - 8)); const sd = district(x, y); const S = STYLES[sd.style]; if (!S) continue;
      const w = (sd.wmin || 5) + Math.floor(R() * ((sd.wmax || 10) - (sd.wmin || 5) + 1)) - ps.shrink, h = (sd.dmin || 6) + Math.floor(R() * ((sd.dmax || 9) - (sd.dmin || 6) + 1)) - ps.shrink; if (w < 4 || h < 4) continue; if (!fits(x, y, w, h)) continue;
      let name = pick(S.names, x * 31 + y * 7 + i); for (let t = 0; used.has(name) && t < S.names.length; t++) name = S.names[(S.names.indexOf(name) + 1) % S.names.length]; used.add(name);
      const isT = (sd.towers || 0) > R() && w >= 6 && h >= 7; const k = Math.floor(hash(x, y, 11) * 1000);
      place(mkBuilding(name, x, y, w, h, S, k, { tower: isT ? 9 + Math.floor(R() * 24) : 0, helipad: isT && hash(i, pass, 10) < 0.3, shabby: sd.shabby && hash(i, pass, 12) < 0.4, columns: sd.columns && hash(i, pass, 13) < 0.5 }), sd.style); } }
  // street furniture: lamps along each road, a few other props on pavement beside roads
  for (const r of roadPaths) { let acc = 0, side = 1; for (let i = 1; i < r.path.length; i++) { const [a, b] = [r.path[i - 1], r.path[i]]; acc += Math.hypot(b[0] - a[0], b[1] - a[1]); if (acc < (cfg.lampStep || 12)) continue; acc = 0; side = -side; const an = Math.atan2(b[1] - a[1], b[0] - a[0]); const off = r.w / 2 + 0.9; const x = Math.round(b[0] - Math.sin(an) * off * side - 0.5), y = Math.round(b[1] + Math.cos(an) * off * side - 0.5); if (free.has(get(x, y)) && !props.some((p) => p.x === x && p.y === y)) P('streetlamp', x, y); } }
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) if (free.has(g[y][x]) && dist[y][x] === 1 && hash(x, y, 77) < 0.012 && !occ[y][x]) P(pick(cfg.sidewalkProps || ['hydrant', 'trashbarrel', 'bench', 'plant'], x * 3 + y), x, y);
  for (const z of cfg.plazas || []) { if (z.fountain) P('fountain', Math.round(z.cx) - 1, Math.round(z.cy) - 1); for (let i = 0; i < (z.trees || 0); i++) { const a = hash(z.cx, i, 1) * 6.283, rr = (z.r - 2) * (0.55 + hash(z.cy, i, 2) * 0.4); P('tree', Math.round(z.cx + rr * Math.cos(a)), Math.round(z.cy + rr * Math.sin(a))); } }
  for (const p of cfg.props || []) P(p.type, p.x, p.y, p.o || {});
  // keep door fronts clear
  const dc = new Set(buildings.map((b) => `${b.door.x},${b.door.y + 1}`)); for (let i = props.length - 1; i >= 0; i--) if (dc.has(`${props[i].x},${props[i].y}`) || g[props[i].y]?.[props[i].x] === 'B') props.splice(i, 1);
  const def = { id: cfg.id, name: cfg.name, kind: 'outdoor', tiles: g.map((r) => r.join('')), buildings, props, spots: { start: { x: cfg.start[0], y: cfg.start[1], facing: 'down' } }, areas: [] };
  meta.fits = fits; meta.dist = dist; return { def, meta };
}
