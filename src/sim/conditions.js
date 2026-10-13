// Declarative condition evaluator shared by dialogue, quests, events, props
// and the NPC brain. Content files describe conditions as plain objects; all
// keys in one object must hold (logical AND). See docs/CONTENT_FORMAT.md.
import { compare } from '../core/util.js';
import { inWindow } from '../world/clock.js';
import { recall } from './memory.js';

export const CONDITION_KEYS = [
  'all', 'any', 'not', 'firstMeeting', 'met', 'rel', 'mood', 'activity', 'hasItem', 'money', 'quest',
  'flag', 'notFlag', 'flags', 'knows', 'playerKnows', 'time', 'rep', 'map', 'day', 'npcAt', 'jobDoneToday',
  'stock', 'propState', 'stolen', 'containerHas', 'recalls', 'hasItemTag', 'npcMood', 'flagToday', 'arrived', 'wealth', 'oil', 'site', 'property',
];

/**
 * @param {object|undefined} cond
 * @param {object} game Game instance (see src/game/game.js)
 * @param {object} [npc] NPC runtime state when evaluating in a character context
 */
export function check(cond, game, npc) {
  if (!cond) return true;
  if (Array.isArray(cond)) return cond.every((c) => check(c, game, npc));
  for (const [key, val] of Object.entries(cond)) {
    if (!checkKey(key, val, game, npc)) return false;
  }
  return true;
}

function checkKey(key, val, game, npc) {
  const p = game.player;
  switch (key) {
    case 'all':
      return val.every((c) => check(c, game, npc));
    case 'any':
      return val.some((c) => check(c, game, npc));
    case 'not':
      return !check(val, game, npc);
    case 'firstMeeting':
      return Boolean(npc && !npc.met) === val;
    case 'met':
      return Boolean(npc && npc.met) === val;
    case 'rel': {
      const rel = npc ? game.relationships.get(npc, 'player') : {};
      return Object.entries(val).every(([dim, expr]) => compare(rel[dim] ?? 0, expr));
    }
    case 'mood': {
      const mood = npc ? game.moodOf(npc) : 'neutral';
      return Array.isArray(val) ? val.includes(mood) : mood === val;
    }
    case 'activity':
      return Array.isArray(val) ? val.includes(npc?.activity) : npc?.activity === val;
    case 'hasItem': {
      const { id, count } = typeof val === 'string' ? { id: val, count: 1 } : val;
      return game.inventory.count(id) >= (count ?? 1);
    }
    case 'stolen':
      return Boolean(p.stolen?.[val]);
    case 'money':
      return compare(p.money, val);
    case 'quest':
      return game.quests.matches(val);
    case 'jobDoneToday':
      return game.quests.doneToday(val);
    case 'flag':
      return Boolean(game.getFlag(val));
    case 'wealth':
      return compare(game.player.money + (game.oil?.holdingsValue() ?? 0), val);
    case 'oil': {
      const st = game.world.oil || {};
      return Object.entries(val).every(([k, v]) => (typeof v === 'boolean' ? Boolean(st[k]) === v : compare(st[k] ?? 0, v)));
    }
    case 'site': {
      const st = game.world.construction || {};
      return Object.entries(val).every(([k, v]) => compare(st[k] ?? 0, v));
    }
    case 'property': {
      // { plot, state, blueprint } for one plot; { state } = any plot in that state; { surveyed: bool }
      if (val.surveyed !== undefined) return (Object.keys(game.content.plots || {}).length > 0) === val.surveyed;
      const owned = game.world.properties?.owned || {};
      const match = (rec) => {
        const state = rec?.state || 'none';
        if (val.state !== undefined && !(Array.isArray(val.state) ? val.state.includes(state) : state === val.state)) return false;
        if (val.blueprint !== undefined && (state !== 'built' || rec.blueprint !== val.blueprint)) return false;
        return true;
      };
      return val.plot ? match(owned[val.plot]) : Object.values(owned).some(match);
    }
    case 'arrived':
      return Boolean(npc?.arrived && !npc.travel && !(npc.path && npc.path.length)) === val;
    case 'flagToday':
      return game.getFlag(val) === game.clock.day;
    case 'notFlag':
      return !game.getFlag(val);
    case 'flags':
      return Object.entries(val).every(([k, v]) => game.getFlag(k) === v);
    case 'knows':
      return Boolean(npc && game.knowledge.knows(npc, val));
    case 'playerKnows':
      return Boolean(game.knowledge.knows(p, val));
    case 'time':
      return inWindow(game.clock.minuteOfDay, val.from, val.to);
    case 'rep':
      return Object.entries(val).every(([fac, expr]) => compare(p.reputation[fac] ?? 0, expr));
    case 'map':
      return Array.isArray(val) ? val.includes(p.map) : p.map === val;
    case 'day':
      return compare(game.clock.day, val);
    case 'npcAt': {
      const other = game.npcs.get(val.npc);
      if (!other) return false;
      if (val.map && other.map !== val.map) return false;
      if (val.activity && other.activity !== val.activity) return false;
      return true;
    }
    case 'stock': {
      const shop = game.world.shops[val.shop];
      return compare(shop?.stock?.[val.item] ?? 0, val.count ?? '>=1');
    }
    case 'propState': {
      const st = game.world.props[val.id] || {};
      return Object.entries(val).every(([k, v]) => k === 'id' || st[k] === v);
    }
    case 'containerHas': {
      const c = game.world.containers[val.container];
      return (c?.items?.[val.item] ?? 0) >= (val.count ?? 1);
    }
    case 'recalls':
      return Boolean(npc && recall(npc, val.tag, game.clock.total, val.withinMinutes ?? Infinity));
    case 'hasItemTag':
      return game.inventory.hasTag(val);
    case 'npcMood': {
      const other = game.npcs.get(val.npc);
      return Boolean(other) && game.moodOf(other) === val.mood;
    }
    default:
      // Unknown keys fail closed so content mistakes are visible during testing.
      return false;
  }
}
