// What a battle in progress has set aside (v0.102.0): the missiles, drones and aircraft a played battle was offered when it began are held for it until it is resolved, so two battles cannot be
// offered the same missile, and the player cannot call a missile in a battle and then hand it back to the Arms works before the end day (where it would be taken from nothing).
// Reads the company only.
export function reserved(C, exceptId = null) {
  const items = {}; const air = new Set(); const ids = new Set(); // ids: every aircraft and strategic missile record a battle was offered
  for (const e of C?.engagements || []) {
    if (e.state !== 'tactical' || e.id === exceptId || !e.battle?.setup?.support) continue;
    for (const [k, n] of Object.entries(e.battle.setup.support.items || {})) items[k] = (items[k] || 0) + n;
    for (const a of e.battle.setup.support.air || []) { air.add(a.id); ids.add(a.id); }
    for (const a of e.battle.setup.support.strategic || []) ids.add(a.id);
  }
  return { items, air, ids };
}
/** How many of an item the company holds in all, over every works it came from. */
export const heldOf = (C, item) => Object.keys(C?.stock || {}).filter((k) => k.endsWith(`:${item}`)).reduce((a, k) => a + C.stock[k], 0);
