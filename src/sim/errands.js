// Errands and meet-ups (v0.35.0, Living World stage 3). A schedule block may
// name an errand kind (`errand: 'outing'`) as well as its usual spot: on some
// days (`errandChance`, default 0.5) the character goes somewhere else of that
// kind instead — a pot of tea at the Kettle & Crumb, the end of the pier —
// chosen from places in the same region that are open then. A block with
// `meet: 'npc_x'` is a standing arrangement between two friends: both blocks
// draw from the same seed, so on the days they meet they choose the same place
// (opening hours aren't checked for a meet-up: give friends places open all evening).
//
// Deterministic (a hash of who, which block and which day), so a character
// re-deciding, the player watching or not, or a save and reload never changes
// where they're going. Places live in content.life.errands.
import { inWindow, parseTime } from '../world/clock.js';
import { outdoorPoint, regionOf } from './npcTransit.js';

function hash(s) {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
}

/** The region a spot reference is in (an interior counts as the region its door opens into). */
export function regionOfSpot(g, ref) {
  const pt = outdoorPoint(g, ref);
  return pt ? regionOf(g, pt.map) : null;
}

/**
 * Where a block with an errand sends this character today, or null (the
 * block's usual spot). Returns { spot, label, meet? }.
 */
export function errandFor(g, npc, block) {
  if (!block?.errand) return null;
  const places = g.content.life?.errands?.[block.errand];
  if (!places?.length) return null;
  const day = Math.floor(g.clock.total / 1440) - (parseTime(block.from) > parseTime(block.to) && g.clock.minuteOfDay < parseTime(block.to) ? 1 : 0);
  // a pair of friends share a seed; anyone else rolls their own
  const key = block.meet ? [npc.id, block.meet].sort().join('+') : `${npc.id}#${block.index}`;
  const chance = block.errandChance ?? 0.5;
  if ((hash(`${key}@${day}`) % 1000) / 1000 >= chance) return null;
  const region = regionOfSpot(g, block.spot);
  const start = parseTime(block.from);
  const open = places.filter((p) => regionOfSpot(g, p.spot) === region && (!p.hours || block.meet || inWindow(start, p.hours.from, p.hours.to)));
  if (!open.length) return null;
  const pick = open[hash(`${key}:${block.errand}@${day}`) % open.length];
  return { spot: pick.spot, label: block.meet ? `${pick.label}, with ${g.npcs.get(block.meet)?.profile.shortName || 'a friend'}` : pick.label, meet: block.meet || null };
}
