// Organise the troops (v0.103.3): the one-tap version of forming squads. Every trained soldier who is in no squad joins one (an officer leads a squad that has no leader; anyone else fills the first
// squad with room; a new squad is formed when none has), and the troop classes are then issued the weapon of their tier from the stores. With `company.autoSquads` on it also runs each morning, after
// training ends. It only uses the same rules as doing it by hand (squads.js, loadout.js): it forms no squad beyond the names the company has, takes no one out of a squad, and arms only from stock.
import { peekMilitary } from './state.js';
import { CLASSES, SQUAD, TROOP_CLASSES } from '../content/troops.js';
import { create, assign, setLeader, reservedFor } from './squads.js';
import { equipClass } from './loadout.js';

export function organise(game) {
  const C = peekMilitary(game)?.company;
  if (!C?.identity) return { ok: false, text: 'You have no company.' };
  const free = () => C.personnel.filter((p) => CLASSES[p.role]?.group === 'troop' && p.status === 'active' && p.assignedTo == null).sort((a, b) => (a.id < b.id ? -1 : 1));
  const home = () => C.squads.filter((s) => s.status === 'home');
  let placed = 0; let formed = 0; const before = C.squads.length;
  for (const p of free().filter((x) => CLASSES[x.role].leads)) {
    let s = home().find((q) => !q.leader && q.members.length + reservedFor(C, q.id) < SQUAD.max);
    if (!s) { const r = create(game); if (!r.ok) continue; s = C.squads.find((q) => q.id === r.id); }
    if (setLeader(game, s.id, p.id).ok) placed++;
  }
  for (const p of free()) {
    let s = home().find((q) => q.members.length + reservedFor(C, q.id) < SQUAD.max);
    if (!s) { const r = create(game); if (!r.ok) break; s = C.squads.find((q) => q.id === r.id); }
    if (assign(game, s.id, p.id).ok) placed++;
  }
  formed = C.squads.length - before;
  let armed = 0;
  for (const role of TROOP_CLASSES) { const mine = C.personnel.filter((p) => p.role === role && p.status === 'active' && !p.weapon).length; if (mine && equipClass(game, role).ok) armed++; }
  return { ok: true, text: placed || formed ? `${placed} placed in squads${formed ? `, ${formed} new squad${formed === 1 ? '' : 's'} formed` : ''}.` : 'Everyone is already in a squad.', placed, formed, armed };
}

export function setAuto(game, on, now = true) {
  const C = peekMilitary(game)?.company;
  if (!C?.identity) return { ok: false, text: 'You have no company.' };
  C.autoSquads = Boolean(on);
  if (on && now) organise(game);
  return { ok: true, text: on ? 'New soldiers will join a squad and be armed when their training ends.' : 'You place new soldiers in squads yourself.' };
}
