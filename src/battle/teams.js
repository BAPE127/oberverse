// Teams (rules 5): B.teams = [{ id, side, squad, name, kind: 'inf' | 'veh', formation, members: [unit ids] }]. Every infantry unit is in exactly one team (by default one team a squad), a vehicle or a
// helicopter is a team of its own. The player splits a squad into smaller teams and merges them again; an order may name a team id for the units in it; the enemy's elements are its teams.
// A split and a merge are logged for the replay by the simulation (`splitTeam` / `mergeTeams` in sim.js call these and log).
import { TEAMS, TICK } from '../content/battle.js';

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const live = (u) => u && u.alive && !u.fled;

/** Teams for the units of a side that have none yet: by `spec.squad` if the setup names one, else in runs of `TEAMS.squad` (the player's) or `TEAMS.element` (the enemy's) in the order of the setup. */
export function formTeams(B, units) {
  B.teams ||= []; B.teamSeq ||= 0;
  for (const side of ['p', 'e']) {
    const us = units.filter((u) => u.side === side && !teamOf(B, u.id));
    const inf = us.filter((u) => u.kind === 'inf' && !u.vip); const size = side === 'p' ? TEAMS.squad : TEAMS.element;
    const bySquad = new Map(); inf.forEach((u, i) => { const k = u.squad ?? `${side}${Math.floor(i / size)}`; if (!bySquad.has(k)) bySquad.set(k, []); bySquad.get(k).push(u.id); });
    let groups = [...bySquad.entries()];
    if (side === 'e') { // (a run of fewer than the least an element is joins the one before it)
      const last = groups[groups.length - 1]; if (groups.length > 1 && last[1].length < TEAMS.minElement) { groups[groups.length - 2][1].push(...last[1]); groups = groups.slice(0, -1); }
    }
    groups.forEach(([k, ids], n) => add(B, { side, squad: k, name: side === 'p' ? `Squad ${B.teams.filter((t) => t.side === 'p' && t.kind === 'inf').length + 1}` : `Element ${B.teams.filter((t) => t.side === 'e' && t.kind === 'inf').length + 1}`, kind: 'inf', members: ids }));
    for (const u of us) if (u.kind !== 'inf' || u.vip) add(B, { side, squad: u.id, name: u.name, kind: u.vip ? 'inf' : 'veh', members: [u.id] });
  }
}
function add(B, t) { const id = `tm_${t.side}${++B.teamSeq}`; const team = { id, formation: 'line', ...t }; B.teams.push(team); return team; }

export const teamOf = (B, unitId) => (B.teams || []).find((t) => t.members.includes(unitId)) || null;
const team = (B, id) => (B.teams || []).find((t) => t.id === id) || null;
/** Unit ids for a list that may name teams as well: a team becomes its living members (in order); a unit id stands for itself; no one twice. */
export function expandIds(B, ids) {
  const out = []; const seen = new Set();
  for (const id of ids) { const t = team(B, id); const list = t ? t.members.filter((m) => live(B.byId.get(m))) : [id]; for (const m of list) if (!seen.has(m)) { seen.add(m); out.push(m); } }
  return out;
}
const unitsOf = (B, t) => t.members.map((m) => B.byId.get(m)).filter(Boolean);
const middle = (us) => ({ x: us.reduce((a, u) => a + u.x, 0) / (us.length || 1), y: us.reduce((a, u) => a + u.y, 0) / (us.length || 1) });
const planning = (B) => B.phase === 'plan';

/**
 * Split `unitIds` off a team into a new team (`name` optional). The player's infantry only; at least one stays and at least one goes. In the planning stage it is free; in the battle every one of
 * them must be within TEAMS.radius of the team's middle and none pinned or broken, and they are busy re-forming for TEAMS.pause seconds.
 */
export function checkSplit(B, teamId, unitIds) {
  const t = team(B, teamId); if (!t || t.side !== 'p') return { ok: false, text: 'No such team.' };
  if (t.kind !== 'inf' || t.members.length < 2) return { ok: false, text: 'That team cannot be split.' };
  const ids = [...new Set(unitIds || [])]; if (!ids.length || ids.some((id) => !t.members.includes(id))) return { ok: false, text: 'Name soldiers of that team.' };
  if (ids.length >= t.members.length) return { ok: false, text: 'Leave someone in the team.' };
  if (!planning(B)) {
    const us = unitsOf(B, t).filter(live); const mid = middle(us);
    if (us.some((u) => dist(u, mid) > TEAMS.radius)) return { ok: false, text: `They are too spread out: close up to within ${TEAMS.radius} tiles first.` };
    if (us.some((u) => u.state === 'pinned' || u.state === 'broken')) return { ok: false, text: 'Not while they are pinned down.' };
  }
  return { ok: true, t, ids };
}
export function doSplit(B, teamId, unitIds, name) {
  const c = checkSplit(B, teamId, unitIds); if (!c.ok) return c;
  const { t, ids } = c; t.members = t.members.filter((m) => !ids.includes(m));
  const n = add(B, { side: 'p', squad: t.squad, name: (name && String(name).slice(0, 24)) || `${t.name} ${String.fromCharCode(65 + B.teams.filter((q) => q.squad === t.squad).length)}`, kind: 'inf', members: ids }); n.formation = t.formation;
  if (!planning(B)) for (const m of [...ids, ...t.members]) { const u = B.byId.get(m); if (live(u)) u.cd = Math.max(u.cd, TEAMS.pause * TICK.perSecond); }
  return { ok: true, text: `${n.name}: ${ids.length} split off.`, team: n };
}
export function checkMerge(B, a, b) {
  const x = team(B, a); const y = team(B, b);
  if (!x || !y || x === y || x.side !== 'p' || y.side !== 'p') return { ok: false, text: 'No such teams.' };
  if (x.kind !== 'inf' || y.kind !== 'inf') return { ok: false, text: 'Only soldiers can be merged.' };
  if (!planning(B)) { const ma = middle(unitsOf(B, x).filter(live)); const mb = middle(unitsOf(B, y).filter(live)); if (dist(ma, mb) > TEAMS.mergeRadius) return { ok: false, text: `Bring them within ${TEAMS.mergeRadius} tiles first.` }; }
  return { ok: true, x, y };
}
export function doMerge(B, a, b) {
  const c = checkMerge(B, a, b); if (!c.ok) return c;
  c.x.members.push(...c.y.members); B.teams = B.teams.filter((t) => t !== c.y);
  return { ok: true, text: `${c.x.name} takes in ${c.y.name}.`, team: c.x };
}
