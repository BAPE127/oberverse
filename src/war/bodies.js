// The bodies on Hollowmoor Lot (v0.100.0 stage 8): the company's people are records; the ones you can see are drawn from the records, at most `BODIES.cap` at a time (officers and squad leaders
// first, always). The books are the truth, as for the headquarters' officers (src/systems/hq.js): bodies are made and removed to match them, never saved as the source. Anyone on a contract
// post is away and not drawn; a person who is let go or dead loses their body. Each follows the day in src/content/base.js, at spots on the lot (the step outside each building's door).
//   sync(game)   make the bodies match the books
//   wanted(game) who is drawn, in order
import { peekMilitary } from './state.js';
import { hash2, hashString } from '../core/rng.js';
import { FACILITIES } from '../content/facilities.js';
import { CLASSES, LOOKS, DEFAULT_LOOK } from '../content/troops.js';
import { BODIES, ROUTINE, DUTY } from '../content/base.js';

const MAP = 'hollowmoor_lot';
const built = (C, id) => C.facilities.some((f) => f.id === id && f.state === 'built');
const out = (id) => `${MAP}:hm_${FACILITIES[id].slot}_out`;
const gate = `${MAP}:gate_inside`;

/** Who is drawn: working or training people at home (not on a contract post), officers and squad leaders first, then by id; no more than the cap. */
export function wanted(game) {
  const C = peekMilitary(game)?.company;
  if (!C?.identity || !C.lot?.owned || !built(C, 'bunkhouse') && !C.facilities.some((f) => /^barracks/.test(f.id) && f.state === 'built')) return [];
  const leaders = new Set(C.squads.map((s) => s.leader).filter(Boolean));
  const people = C.personnel.filter((p) => ['active', 'training', 'wounded'].includes(p.status) && !p.post);
  const rank = (p) => (leaders.has(p.id) ? 0 : CLASSES[p.role]?.leads ? 1 : 2);
  return people.sort((a, b) => rank(a) - rank(b) || (a.id < b.id ? -1 : 1)).slice(0, BODIES.cap);
}

const homeFacility = (C, p) => { const id = String(p.location || '').replace('facility:', ''); return built(C, id) ? id : (C.facilities.find((f) => f.state === 'built' && /^barracks|^bunkhouse$/.test(f.id))?.id || null); };

function spotFor(C, p, at) {
  if (at === 'mess') return built(C, 'mess') ? out('mess') : gate;
  if (at === 'barracks') { const h = homeFacility(C, p); return h ? out(h) : gate; }
  if (at === 'bed') { const h = homeFacility(C, p); return h ? `${MAP}__hm_${FACILITIES[h].slot}:entry` : gate; }
  // duty: training recruits at the range, the rest where their class works
  if (p.status === 'training') { const r = ['range', 'training'].find((id) => built(C, id)); return r ? out(r) : gate; }
  if (p.status === 'wounded') { const r = ['medical', 'hospital'].find((id) => built(C, id)); return r ? out(r) : gate; }
  const d = (DUTY[p.role] || []).find((id) => built(C, id));
  return d ? out(d) : gate;
}

function profileOf(game, C, p) {
  const h = (k) => hash2(hashString(p.id), k);
  const pick = (a, k) => a[Math.floor(h(k) * a.length)];
  const squad = C.squads.find((s) => s.id === p.assignedTo);
  const look = { ...DEFAULT_LOOK, ...(squad?.look || {}) };
  const colour = LOOKS.primary[look.primary] || '#4a5a3a';
  const K = CLASSES[p.role];
  return {
    id: `war_${p.id}`, warId: p.id, name: p.name, shortName: p.name.split(' ')[0], tier: 'minor', origin: 'generated', faction: null, noSnitch: true, warStaff: true,
    role: `${K?.name || 'Soldier'} at ${C.identity.name}.`,
    dialogue: 'dlg_soldier', voice: { wave: pick(['triangle', 'square', 'sine'], 1), pitch: 90 + Math.floor(h(2) * 200), variance: 20, rate: 0.95 + h(3) * 0.3 },
    appearance: { skin: pick(['#f2d6c0', '#e2b896', '#c48a62', '#8a5a3a', '#6a4430', '#f0c8a8', '#d9a77c'], 4), hair: pick(['#1a1410', '#3a2a20', '#6a3a2a', '#c9813a', '#e8e2d4', '#8a7a6a', '#2a1e1a'], 5), hairStyle: 'helmet', hatColor: colour,
      // v0.103.8: a soldier in a hardsuit or power armour walks the base in it (a pale shell, or dark plate with a broad frame)
      outfit: p.armour === 3 ? '#e8eaf0' : p.armour === 4 ? '#4a5570' : colour, legs: p.armour === 3 ? '#9aa0ae' : p.armour === 4 ? '#2e3446' : '#2a2e22', build: p.armour === 4 ? 'broad' : pick(['thin', 'average', 'broad', 'wiry'], 8), height: 0.96 + h(9) * 0.12, accessories: [], accent: LOOKS.band[look.band] || '#e8c84a' },
    personality: { traits: ['disciplined', 'steady'], sociability: 0.4, conscientiousness: 0.9, impulsiveness: 0.15, discretion: 0.85, honesty: 0.7, empathy: 0.4 },
    speech: { rumorPrefix: 'In the barracks they say', factPrefix: 'Boss,', refuse: 'That is not something I can discuss, Boss.' },
    combat: { never: true, maxHealth: 120 }, walkSpeed: 1, punctuality: 10,
    schedule: ROUTINE.map((b) => ({ from: b.from, to: b.to, activity: b.activity, spot: spotFor(C, p, b.at) })),
    impulses: [], notices: [], knowledge: [], relationships: { player: { trust: 10, affection: 0, respect: 15, suspicion: 0 } }, giftPrefs: { item_coffee: 5, tags: { food: 3 } }, opinions: {},
  };
}

/** The generals at home, who sit in the command post (a general away with a force is not drawn). */
const homeGenerals = (C) => (built(C, 'command') ? C.generals.filter((g) => g.status === 'home') : []);

function generalProfile(game, C, g) {
  const p = { id: g.id, name: g.name, role: 'officer', status: 'active', location: null };
  const base = profileOf(game, C, { ...p, assignedTo: null });
  return { ...base, id: `war_${g.id}`, warId: g.id, role: `${g.name}, general of ${C.identity.name}.`, appearance: { ...base.appearance, outfit: '#3a3a44', hatColor: '#2a2a30', accent: '#c9a24a', height: 1.02 } };
}

/** A short signature of everything a body depends on: when it changes, the bodies are made again. */
function signature(game) {
  const C = peekMilitary(game)?.company;
  if (!C?.identity) return '';
  return JSON.stringify([wanted(game).map((p) => [p.id, p.status, p.assignedTo, p.location, p.armour || 1]), homeGenerals(C).map((g) => g.id), C.facilities.filter((f) => f.state === 'built').map((f) => f.id), C.squads.map((s) => [s.id, s.look.primary, s.look.band])]);
}

export function sync(game) {
  const C = peekMilitary(game)?.company;
  const want = new Map(wanted(game).map((p) => [`war_${p.id}`, p]));
  for (const [id, npc] of [...game.npcs]) if (npc.profile?.warStaff) game.npcs.delete(id);
  if (C) for (const [id, p] of want) game.npcs.set(id, game.createNpc(profileOf(game, C, p)));
  if (C?.identity && C.lot?.owned) for (const g of homeGenerals(C)) game.npcs.set(`war_${g.id}`, game.createNpc(generalProfile(game, C, g)));
  return want.size + (C ? homeGenerals(C).length : 0);
}

/** Called every game minute; looks at the books every few minutes and makes the bodies match when anything changed. */
export function tick(game, st) {
  if (!peekMilitary(game)?.company?.identity) { if (st.sig) { sync(game); st.sig = ''; } return; }
  if (game.clock.minuteOfDay % 5 !== 0 && st.sig !== undefined) return;
  const sig = signature(game);
  if (sig !== st.sig) { st.sig = sig; sync(game); }
}
