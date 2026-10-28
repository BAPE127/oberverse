// The research tree (v0.59.0): pure helpers for the Research page — where each project sits, what
// it does, what it opens. `R` is RESEARCH from src/content/aerospace.js, `C` the whole content.

export const BRANCHES = [['air', 'Aircraft'], ['secure', 'Secure & defence'], ['launch', 'Launch'], ['sat', 'Satellites'], ['adv', 'Advanced']];

/** How many steps from a root a project is (a root needs nothing). */
export function depthOf(R, id, memo = {}) {
  if (memo[id] !== undefined) return memo[id];
  memo[id] = 0; // (a guard against a cycle: content is validated, but a loop must not hang)
  const req = R[id].requires || [];
  memo[id] = req.length ? 1 + Math.max(...req.map((r) => depthOf(R, r, memo))) : 0;
  return memo[id];
}

/**
 * Lay the tree out: a column for each depth, a lane for each branch, and within a lane the
 * projects of one depth stacked. Returns { nodes: { id: { col, lane, row, x, y } }, cols, lanes: [{ id, name, top, rows }], width, height }.
 */
export function layout(R, { w = 226, h = 74, gapX = 54, gapY = 12, laneGap = 26, pad = 10 } = {}) {
  const memo = {};
  const ids = Object.keys(R);
  const out = { nodes: {}, lanes: [], cols: 0 };
  let top = pad;
  for (const [bid, name] of BRANCHES) {
    const members = ids.filter((id) => R[id].branch === bid).sort((a, b) => depthOf(R, a, memo) - depthOf(R, b, memo) || (R[a].cost - R[b].cost));
    if (!members.length) continue;
    const perCol = {};
    for (const id of members) { const col = depthOf(R, id, memo); const row = perCol[col] = (perCol[col] || 0) + 1; out.nodes[id] = { col, lane: bid, row: row - 1, x: pad + col * (w + gapX), y: top + 26 + (row - 1) * (h + gapY) }; out.cols = Math.max(out.cols, col + 1); }
    const rows = Math.max(...Object.values(perCol));
    out.lanes.push({ id: bid, name, top, rows, height: 26 + rows * (h + gapY) });
    top += 26 + rows * (h + gapY) + laneGap;
  }
  out.width = pad * 2 + out.cols * (w + gapX) - gapX;
  out.height = top - laneGap + pad;
  out.size = { w, h };
  return out;
}

const pct = (v) => `${v > 0 ? '+' : '−'}${Math.round(Math.abs(v) * 100)}%`;

/** What a project does, in words (one line each). */
export function effectLines(C, effect) {
  const out = [];
  if (!effect) return out;
  const roles = C.services?.roles || {};
  const name = (r) => (r === 'all' ? 'everything your networks carry' : (roles[r]?.short || r).toLowerCase());
  if (effect.quality) out.push(`${effect.quality > 0 ? '+' : '−'}${Math.abs(effect.quality)} quality on everything you build`);
  if (effect.cost) out.push(`${pct(effect.cost)} materials on aircraft`);
  if (effect.launchCost) out.push(`${pct(effect.launchCost)} on what a launch costs`);
  if (effect.hazard) out.push(`satellites ${Math.round(Math.abs(effect.hazard) * 100)}% ${effect.hazard < 0 ? 'less' : 'more'} likely to be lost`);
  if (effect.opsCost) out.push(`${pct(effect.opsCost)} on satellite running costs`);
  for (const [r, v] of Object.entries(effect.service || {})) out.push(`${pct(v)} of ${r === 'all' ? '' : 'the '}${name(r)}${r === 'all' ? '' : ' your satellites carry'}`);
  for (const [r, v] of Object.entries(effect.price || {})) out.push(`${pct(v)} on ${name(r)} prices`);
  return out;
}

/** What finishing a project opens: the products it unlocks, the options that need it, the projects that wait for it. */
export function unlocksOf(C, id) {
  const R = C.research;
  const products = Object.entries(C.products).filter(([, p]) => p.tech === id).map(([pid]) => pid);
  const options = [];
  for (const [gid, g] of Object.entries(C.options?.groups || {})) for (const [cid, ch] of Object.entries(g.choices)) if (ch.needs === id) options.push(`${g.name}: ${ch.name}`);
  const next = Object.entries(R).filter(([, r]) => (r.requires || []).includes(id)).map(([rid]) => rid);
  return { products, options, next };
}
