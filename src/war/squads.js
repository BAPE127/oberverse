// Squads (v0.100.0 stage 7): a leader (an officer), members of the troop classes, the vehicles and helicopters assigned to them, a name and a look. One assignment each: putting someone in
// a squad takes them out of their last one, and a vehicle is in one squad or none. Guards and technicians are not in squads: guards stand contract posts and technicians crew the lines.
import { peekMilitary } from './state.js';
import { nextId } from './equipment.js';
import { CLASSES, SQUAD, LOOKS, DEFAULT_LOOK } from '../content/troops.js';

const personOf = (C, id) => C.personnel.find((p) => p.id === id);
const squadOf = (C, id) => C.squads.find((s) => s.id === id);
const eligible = (p) => CLASSES[p.role]?.group === 'troop' && p.status === 'active';

function leave(C, p) {
  const s = p.assignedTo != null ? squadOf(C, p.assignedTo) : null;
  if (s) { s.members = s.members.filter((m) => m !== p.id); if (s.leader === p.id) s.leader = null; }
  p.assignedTo = null;
}

export function create(game, name = null) {
  const C = peekMilitary(game)?.company;
  if (!C?.identity) return { ok: false, text: 'You have no company.' };
  if (C.squads.length >= SQUAD.names.length) return { ok: false, text: `The company fields at most ${SQUAD.names.length} squads.` };
  const used = new Set(C.squads.map((s) => s.name));
  const nm = name?.trim() || SQUAD.names.find((n) => !used.has(n));
  if (!nm || nm.length > 24) return { ok: false, text: 'Give the squad a name of up to 24 letters.' };
  if (used.has(nm)) return { ok: false, text: 'There is already a squad with that name.' };
  const s = { id: nextId(C, 'Q'), name: nm, leader: null, members: [], equipment: [], look: { ...DEFAULT_LOOK }, status: 'home', founded: game.clock.day };
  C.squads.push(s);
  return { ok: true, text: `Squad ${nm} is formed. Give it a leader.`, id: s.id };
}

export function assign(game, squadId, pid) {
  const C = peekMilitary(game)?.company;
  const s = C && squadOf(C, squadId);
  const p = C && personOf(C, pid);
  if (!s || !p) return { ok: false, text: 'No such squad or person.' };
  if (!eligible(p)) return { ok: false, text: CLASSES[p.role]?.group === 'troop' ? `${p.name} is ${p.status}: only a trained soldier can join a squad.` : `${p.name} is a ${CLASSES[p.role]?.name.toLowerCase()}: only troops join squads.` };
  if (p.assignedTo === s.id) return { ok: false, text: `${p.name} is already in ${s.name}.` };
  if (s.members.length >= SQUAD.max) return { ok: false, text: `${s.name} is full (${SQUAD.max}).` };
  leave(C, p);
  s.members.push(p.id); p.assignedTo = s.id;
  return { ok: true, text: `${p.name} joins ${s.name}.` };
}

export function unassign(game, pid) {
  const C = peekMilitary(game)?.company;
  const p = C && personOf(C, pid);
  if (!p || p.assignedTo == null) return { ok: false, text: 'They are in no squad.' };
  leave(C, p);
  return { ok: true, text: `${p.name} is out of the squad.` };
}

export function setLeader(game, squadId, pid) {
  const C = peekMilitary(game)?.company;
  const s = C && squadOf(C, squadId);
  const p = C && personOf(C, pid);
  if (!s || !p) return { ok: false, text: 'No such squad or person.' };
  if (!CLASSES[p.role]?.leads) return { ok: false, text: 'A squad is led by an officer.' };
  if (p.assignedTo !== s.id) { const r = assign(game, squadId, pid); if (!r.ok) return r; }
  s.leader = p.id;
  return { ok: true, text: `${p.name} leads ${s.name}.` };
}

export function assignVehicle(game, squadId, eid) {
  const C = peekMilitary(game)?.company;
  const s = C && squadOf(C, squadId);
  const x = C?.equipment.find((e) => e.id === eid);
  if (!s || !x) return { ok: false, text: 'No such squad or vehicle.' };
  if (!['vehicle', 'helicopter'].includes(x.kind)) return { ok: false, text: `${x.name} is not for a squad.` };
  if (x.status !== 'stored') return { ok: false, text: `${x.name} is ${x.status}.` };
  x.status = 'assigned'; x.assignedTo = s.id; s.equipment.push(x.id);
  return { ok: true, text: `${x.name} goes to ${s.name}.` };
}

export function unassignVehicle(game, eid) {
  const C = peekMilitary(game)?.company;
  const x = C?.equipment.find((e) => e.id === eid);
  if (!x || x.assignedTo == null) return { ok: false, text: 'That vehicle is with no squad.' };
  if (x.status !== 'assigned') return { ok: false, text: `${x.name} is ${x.status}: it cannot be taken back now.` };
  const s = squadOf(C, x.assignedTo);
  if (s) s.equipment = s.equipment.filter((e) => e !== x.id);
  x.assignedTo = null; x.status = 'stored';
  return { ok: true, text: `${x.name} is back in the pool.` };
}

export function disband(game, squadId) {
  const C = peekMilitary(game)?.company;
  const s = C && squadOf(C, squadId);
  if (!s) return { ok: false, text: 'No such squad.' };
  if (s.status !== 'home') return { ok: false, text: `${s.name} is away: it cannot be stood down.` };
  for (const m of [...s.members]) { const p = personOf(C, m); if (p) p.assignedTo = null; }
  for (const e of [...s.equipment]) { const x = C.equipment.find((q) => q.id === e); if (x) { x.assignedTo = null; if (x.status === 'assigned') x.status = 'stored'; } }
  C.squads = C.squads.filter((q) => q !== s);
  return { ok: true, text: `${s.name} is stood down.` };
}

export function setLook(game, squadId, look) {
  const C = peekMilitary(game)?.company;
  const s = C && squadOf(C, squadId);
  if (!s) return { ok: false, text: 'No such squad.' };
  const next = { ...s.look, ...look };
  if (!LOOKS.primary[next.primary] || !LOOKS.pattern.includes(next.pattern) || !LOOKS.insignia.includes(next.insignia) || !LOOKS.crest.includes(next.crest) || !LOOKS.band[next.band]) return { ok: false, text: 'That is not a look the company has.' };
  s.look = next;
  return { ok: true, text: `${s.name}'s look is set. It is free: colours change no number.` };
}

/** What the Squads screen shows. */
export function view(game) {
  const C = peekMilitary(game)?.company;
  if (!C?.identity) return [];
  return C.squads.map((s) => {
    const people = s.members.map((m) => personOf(C, m)).filter(Boolean);
    const by = {};
    for (const p of people) by[p.role] = (by[p.role] || 0) + 1;
    return { ...s, size: people.length, byClass: by, armed: people.filter((p) => p.weapon).length, leaderName: personOf(C, s.leader)?.name || null, vehicles: s.equipment.map((e) => C.equipment.find((x) => x.id === e)).filter(Boolean).map((x) => x.name),
      morale: people.length ? Math.round(people.reduce((a, p) => a + (p.morale ?? 70), 0) / people.length) : 0 };
  });
}
