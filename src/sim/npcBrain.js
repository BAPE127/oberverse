// Utility-based decision making layered on top of schedules.
//
// Each decision considers:
//   - the scheduled block (weighted by conscientiousness),
//   - personal impulses defined in the character profile (weighted by the
//     personality trait they name, current mood and conditions),
// and commits to the winner for a while so characters do not dither.
// Social interruptions (chatting) are handled in npcSystem.js.
import { blockAt } from './schedule.js';
import { check } from './conditions.js';

export function scheduleLead(profile) {
  return profile.punctuality ?? 0;
}

/**
 * @returns {{activity:string, spot:string, source:string, until:number, block?:object, label?:string}}
 */
export function decide(npc, game) {
  const profile = npc.profile;
  const p = profile.personality || {};
  const now = game.clock.total;
  const block = blockAt(profile.schedule, game.clock.minuteOfDay + scheduleLead(profile));
  const options = [];
  if (block) {
    options.push({
      activity: block.activity,
      spot: block.spot,
      label: block.label,
      source: 'schedule',
      block,
      score: 1 + (p.conscientiousness ?? 0.5) * 0.6,
    });
  }
  for (const imp of profile.impulses || []) {
    if ((npc.impulseCooldowns?.[imp.id] ?? -Infinity) > now) continue;
    if (imp.when && !check(imp.when, game, npc)) continue;
    if (imp.duringActivity && block && !imp.duringActivity.includes(block.activity)) continue;
    const trait = p[imp.trait] ?? 0.5;
    const moodBonus = imp.moods?.[game.moodOf(npc)] ?? 0;
    const score = (imp.weight ?? 1) * trait + moodBonus + game.rng.range(-0.25, 0.25);
    options.push({ activity: imp.activity, spot: imp.spot, label: imp.label, source: `impulse:${imp.id}`, score, duration: imp.duration ?? 60, impulse: imp });
  }
  if (!options.length) return { activity: 'idle', spot: null, source: 'none', until: now + 30 };
  options.sort((a, b) => b.score - a.score);
  const best = options[0];
  const until = best.source === 'schedule' ? now + 15 : now + best.duration;
  return { ...best, until };
}
