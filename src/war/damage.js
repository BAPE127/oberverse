// The damage gate (v0.98.0): the ONLY writer of a structure's state. Every way a structure can be hurt (gunfire, explosions, vehicles, missiles, bombing, artillery, a tactical
// or strategic result, a script, the weather, a debug command) is a named source passed to `apply`; nothing else may change `damage.structures`.
//
//   register(game, id, { owner, core, hp, name })   a structure becomes known to the gate (the company's base buildings; later the fort's)
//   apply(game, id, amount, source)                  hurt it: refused for a core structure of the company's base while the base is protected
//   repair(game, id, amount, source)                 the only way it gets better (a repair contract's work); same gate
//   stateOf(game, id) / view(game)                   reads
// The gate protects a structure when owner === 'company' and core === true and baseProtected(game). Everything else (the national fort, a company's outbuildings that are not
// core, equipment, people) is not the gate's business. A source that is not on the list is refused outright.
import { ensureMilitary, peekMilitary } from './state.js';
import { baseProtected } from './protection.js';
import { DAMAGE_SOURCES, REPAIR_SOURCES, DAMAGE } from '../content/military.js';

const rec = (game, id) => peekMilitary(game)?.damage.structures[id] || null;

export function register(game, id, { owner = 'company', core = false, hp = 100, name = id } = {}) {
  const m = ensureMilitary(game);
  if (m.damage.structures[id]) return m.damage.structures[id];
  m.damage.structures[id] = { id, owner, core: Boolean(core), name, hpMax: hp, hp, state: 'intact', since: game.clock?.day ?? 0 };
  return m.damage.structures[id];
}

const stateFor = (s) => (s.hp <= 0 ? 'destroyed' : s.hp < s.hpMax * DAMAGE.damagedBelow ? 'damaged' : 'intact');

function note(game, text) {
  const m = peekMilitary(game);
  m.damage.log.push({ day: game.clock?.day ?? 0, text });
  while (m.damage.log.length > DAMAGE.log) m.damage.log.shift();
}

/** Hurt a structure. Returns { ok, refused?, text, state }. */
export function apply(game, id, amount, source) {
  const s = rec(game, id);
  if (!s) return { ok: false, refused: false, text: `${id} is not a known structure.`, state: null };
  if (!DAMAGE_SOURCES.includes(source)) return { ok: false, refused: true, text: `"${source}" is not a way a structure can be damaged.`, state: s.state };
  if (!(amount > 0)) return { ok: false, refused: false, text: 'No damage.', state: s.state };
  if (s.owner === 'company' && s.core && baseProtected(game)) return { ok: false, refused: true, text: `${s.name} is protected: nothing can damage the core of your base until a coup is staged.`, state: s.state };
  const before = s.state;
  s.hp = Math.max(0, s.hp - amount);
  s.state = stateFor(s);
  if (s.state !== before) { s.since = game.clock?.day ?? 0; note(game, `${s.name}: ${before} → ${s.state} (${source}).`); }
  return { ok: true, refused: false, text: `${s.name} is ${s.state}.`, state: s.state };
}

/** Mend a structure (a repair contract's work). A destroyed structure is rebuilt, not repaired: it takes 'rebuild'. */
export function repair(game, id, amount, source = 'repair') {
  const s = rec(game, id);
  if (!s) return { ok: false, text: `${id} is not a known structure.`, state: null };
  if (!REPAIR_SOURCES.includes(source)) return { ok: false, text: `"${source}" cannot repair.`, state: s.state };
  if (s.state === 'destroyed' && source === 'repair') return { ok: false, text: `${s.name} is destroyed: it has to be rebuilt.`, state: s.state };
  const before = s.state;
  s.hp = Math.min(s.hpMax, s.hp + Math.max(0, amount));
  s.state = stateFor(s);
  if (s.state !== before) { s.since = game.clock?.day ?? 0; note(game, `${s.name}: ${before} → ${s.state} (${source}).`); }
  return { ok: true, text: `${s.name} is ${s.state}.`, state: s.state };
}

export const stateOf = (game, id) => rec(game, id)?.state || null;
export const hpOf = (game, id) => { const s = rec(game, id); return s ? { hp: s.hp, hpMax: s.hpMax } : null; };
export const view = (game) => Object.values(peekMilitary(game)?.damage.structures || {}).map((s) => ({ ...s, protected: s.owner === 'company' && s.core && baseProtected(game) }));
