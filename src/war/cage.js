// The Arms works' export cage, as the company reads it (v0.103.2). The works' stations make whole CRATES (src/content/arms.js: one crate is CRATE.units weapons); the company's stores count
// single items. So an item in the cage is whatever singles are there plus the crates of it, and taking some unpacks crates (the rest of an opened crate stays in the cage as singles, so nothing
// is lost). Reads and writes the cage container only.
import { CRATE } from '../content/arms.js';

export const cageOf = (game, works) => { const def = game.arms?.def?.(works); return def ? game.world.containers[def.outCrate] || null : null; };

/** The crate item that holds this single item, or null (a shell or a breach charge is made loose). */
export function crateOf(game, item) {
  for (const r of Object.values(game.content.arms.recipes)) if (r.single === item) return r.out;
  return null;
}

/** How many of an item a works' cage holds, loose and in crates. */
export function cageCount(game, works, item) {
  const cage = cageOf(game, works); if (!cage) return 0;
  const crate = crateOf(game, item);
  return (cage.items?.[item] || 0) + (crate ? (cage.items?.[crate] || 0) * CRATE.units : 0);
}

/** Take `qty` of an item out of a cage (loose first, then crates). Returns how many were taken (never more than the cage holds). */
export function cageTake(game, works, item, qty) {
  const cage = cageOf(game, works); if (!cage) return 0;
  qty = Math.min(qty, cageCount(game, works, item)); if (qty < 1) return 0;
  let left = qty;
  const loose = Math.min(left, cage.items[item] || 0);
  if (loose) { cage.items[item] -= loose; left -= loose; if (!cage.items[item]) delete cage.items[item]; }
  const crate = crateOf(game, item);
  if (left && crate) {
    const crates = Math.ceil(left / CRATE.units);
    cage.items[crate] -= crates; if (!cage.items[crate]) delete cage.items[crate];
    const rest = crates * CRATE.units - left;
    if (rest) cage.items[item] = (cage.items[item] || 0) + rest;
  }
  game.bus.emit('container:changed', { id: game.arms.def(works).outCrate });
  return qty;
}
