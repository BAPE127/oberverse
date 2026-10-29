// The corporate group (v0.61.0): rules that need no game state. Pure functions.
//
//   canOwn(edges, owner, sub)      whether `owner` may take `sub` as a subsidiary (no cycles, no second parent)
//   validPolicy(p)                 a distribution policy tidied and bounded
//
// An edge is { owner, sub, stake } — the stake is 1 (the parent owns all of it) in this release; the
// field is kept so a part-share can come later without changing a record.

/** Does following `owner` upward through the edges ever reach `sub`? (Then making `sub` own `owner` would close a circle.) */
export function reaches(edges, from, to, seen = new Set()) {
  if (from === to) return true;
  if (seen.has(from)) return false;
  seen.add(from);
  return edges.filter((e) => e.owner === from).some((e) => reaches(edges, e.sub, to, seen));
}

/** { ok, why } — an owner may take a sub if the sub is not the owner, has no parent yet, and does not (even indirectly) own the owner. */
export function canOwn(edges, owner, sub) {
  if (owner === sub) return { ok: false, why: 'A company cannot own itself.' };
  if (edges.some((e) => e.sub === sub && e.owner === owner)) return { ok: false, why: 'It is already a subsidiary of that company.' };
  if (edges.some((e) => e.sub === sub)) return { ok: false, why: 'It already belongs to a group.' };
  if (reaches(edges, sub, owner)) return { ok: false, why: 'That would make a company its own owner, through the group.' };
  return { ok: true };
}

/** What a policy may hold; anything else is dropped, anything out of range is brought into it. */
export const POLICY_DEFAULT = {
  targetReserve: 5000, // cash the subsidiary keeps after distributing
  minLiquidity: 2000, // below this it is protected unless the owner overrides
  emergencyReserve: 1000, // added to the reserve while the company owes anything
  retainPct: 50, // of the distributable profit it keeps
  distributePct: 50, // of the distributable profit it sends up (retain + distribute never exceed 100)
  reinvestPct: 0, // of what it keeps, earmarked for its own spending (a note: it simply stays in the subsidiary)
  debtFirst: true, // repay what it owes the parent before distributing
};

const clampN = (v, lo, hi, d) => (Number.isFinite(Number(v)) ? Math.max(lo, Math.min(hi, Number(v))) : d);

export function validPolicy(p = {}, base = POLICY_DEFAULT) {
  const o = { ...base };
  for (const k of ['targetReserve', 'minLiquidity', 'emergencyReserve']) if (k in p) o[k] = Math.round(clampN(p[k], 0, 1e9, base[k]));
  for (const k of ['retainPct', 'distributePct', 'reinvestPct']) if (k in p) o[k] = Math.round(clampN(p[k], 0, 100, base[k]));
  if ('debtFirst' in p) o.debtFirst = Boolean(p.debtFirst);
  if (o.retainPct + o.distributePct > 100) o.distributePct = 100 - o.retainPct;
  if (o.minLiquidity > o.targetReserve) o.targetReserve = o.minLiquidity;
  return o;
}
