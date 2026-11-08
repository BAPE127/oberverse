// The consistency checker (v0.98.0): every soldier, vehicle, aircraft, missile and building exists once, in one place, with one status. This finds the ways that can go wrong.
//
//   checkMilitary(military)   → [{ kind, id, text }]   (empty when the record is consistent)
// Kinds are in src/content/military.js (PROBLEMS). Pure: it reads a record, changes nothing. A test plants each kind of corruption and expects exactly it.
import { ITEM_STATUS, PERSON_STATUS, STRUCTURE_STATES, COUP_STATES } from '../content/military.js';

const finite = (v) => typeof v === 'number' && Number.isFinite(v);

export function checkMilitary(m) {
  const out = [];
  const add = (kind, id, text) => out.push({ kind, id, text });
  if (!m) return out;
  const C = m.company;
  const people = C?.personnel || []; const items = C?.equipment || []; const squads = C?.squads || []; const facilities = C?.facilities || [];
  const units = m.gov?.units || [];
  // ids exist once, across everything that has one
  const seen = new Map();
  const note = (id, where) => { if (id == null) return; if (seen.has(id)) add('duplicate_id', id, `${id} is in ${seen.get(id)} and in ${where}`); else seen.set(id, where); };
  for (const p of people) note(p.id, 'personnel');
  for (const i of items) note(i.id, 'equipment');
  for (const s of squads) note(s.id, 'squads');
  for (const f of facilities) note(f.id, 'facilities');
  for (const u of units) note(u.id, 'the government\'s units');
  // counts
  const counts = { ...(C?.stock || {}) };
  for (const [k, v] of Object.entries(m.gov?.inventory || {})) counts[`gov:${k}`] = v;
  for (const [k, v] of Object.entries(counts)) if (!finite(v) || v < 0) add('negative_count', k, `${k} is ${v}`);
  for (const s of Object.values(m.damage?.structures || {})) { if (!finite(s.hp) || s.hp < 0) add('negative_count', s.id, `${s.id} has ${s.hp} hit points`); if (!STRUCTURE_STATES.includes(s.state)) add('bad_status', s.id, `${s.id} is "${s.state}"`); }
  // statuses
  for (const i of items) if (!ITEM_STATUS.includes(i.status)) add('bad_status', i.id, `${i.id} is "${i.status}"`);
  for (const p of people) if (!PERSON_STATUS.includes(p.status)) add('bad_status', p.id, `${p.id} is "${p.status}"`);
  // references
  const ids = new Set([...people.map((p) => p.id), ...items.map((i) => i.id)]);
  const facIds = new Set(facilities.map((f) => f.id));
  const squadIds = new Set(squads.map((s) => s.id));
  for (const s of squads) {
    if (s.leader != null && !people.some((p) => p.id === s.leader)) add('missing_reference', s.id, `squad ${s.id} has a leader ${s.leader} who is not in the personnel`);
    for (const x of [...(s.members || []), ...(s.equipment || [])]) if (!ids.has(x)) add('missing_reference', s.id, `squad ${s.id} lists ${x}, which does not exist`);
  }
  for (const x of [...people, ...items]) {
    if (typeof x.location === 'string' && x.location.startsWith('facility:') && !facIds.has(x.location.slice(9))) add('missing_reference', x.id, `${x.id} is at ${x.location}, which is not a facility`);
    if (x.assignedTo != null && !squadIds.has(x.assignedTo)) add('missing_reference', x.id, `${x.id} is assigned to ${x.assignedTo}, which is not a squad`);
  }
  // one assignment each, and the item and the squad agree
  const listed = new Map();
  for (const s of squads) for (const x of [...(s.members || []), ...(s.equipment || [])]) { if (listed.has(x) && listed.get(x) !== s.id) add('double_assignment', x, `${x} is in squads ${listed.get(x)} and ${s.id}`); else if (listed.has(x)) add('double_assignment', x, `${x} is listed twice in ${s.id}`); listed.set(x, s.id); }
  for (const x of [...people, ...items]) if (x.assignedTo != null && listed.has(x.id) && listed.get(x.id) !== x.assignedTo) add('double_assignment', x.id, `${x.id} says ${x.assignedTo} but ${listed.get(x.id)} lists it`);
  // what is gone cannot be used
  const gone = (x) => x.status === 'destroyed' || x.status === 'dead' || x.status === 'captured';
  for (const x of [...people, ...items]) if (gone(x) && (x.assignedTo != null || listed.has(x.id) || x.status === 'deployed')) add('destroyed_deployable', x.id, `${x.id} is ${x.status} but is still assigned or deployed`);
  // battalions: their squads exist, are theirs alone and are locked to them; their places are real provinces
  for (const b of m.war?.battalions || []) {
    for (const sid of b.squads || []) { const s = squads.find((q) => q.id === sid); if (!s) add('missing_reference', b.id, `battalion ${b.id} lists squad ${sid}, which does not exist`); else if (s.battalion !== b.id) add('double_assignment', sid, `squad ${sid} is in battalion ${b.id} but says ${s.battalion ?? 'none'}`); }
    if (b.commander != null && !people.some((p) => p.id === b.commander)) add('missing_reference', b.id, `battalion ${b.id} has a commander ${b.commander} who is not in the personnel`);
  }
  for (const s of squads) if (s.battalion && !(m.war?.battalions || []).some((b) => b.id === s.battalion && b.squads.includes(s.id))) add('missing_reference', s.id, `squad ${s.id} says it is in battalion ${s.battalion}, which does not list it`);
  // v0.103.9: air wings: their aircraft exist, are theirs alone and are locked to them
  for (const wg of m.war?.wings || []) for (const id of wg.aircraft || []) { const x = items.find((i) => i.id === id); if (!x) add('missing_reference', wg.id, `wing ${wg.id} lists ${id}, which does not exist`); else if (x.wing !== wg.id) add('double_assignment', id, `${id} is in wing ${wg.id} but says ${x.wing ?? 'none'}`); }
  for (const x of items) if (x.wing && !(m.war?.wings || []).some((wg) => wg.id === x.wing && wg.aircraft.includes(x.id))) add('missing_reference', x.id, `${x.id} says it is in wing ${x.wing}, which does not list it`);
  // the coup flag and what is derived from it
  if (!COUP_STATES.includes(m.coup?.state)) add('bad_coup', 'coup', `the coup state is "${m.coup?.state}"`);
  else if (Boolean(m.protection?.baseProtected) !== (m.coup.state === 'none')) add('protection_mismatch', 'protection', `the coup is ${m.coup.state} but the base is ${m.protection?.baseProtected ? '' : 'not '}protected`);
  return out;
}
