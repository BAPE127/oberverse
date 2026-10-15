// Declarative effect interpreter. Content (dialogue, quests, props, events,
// schedules) describes consequences as arrays of plain objects; this module is
// the only place that turns them into state changes. See docs/CONTENT_FORMAT.md.
import { check } from '../sim/conditions.js';
import { remember } from '../sim/memory.js';
import { parseSpotRef, TILE, interpolate } from '../core/util.js';

export const EFFECT_KEYS = [
  'if', 'then', 'else', 'chance', 'give', 'take', 'money', 'rel', 'relNpc', 'flag', 'quest', 'learn', 'npcLearn', 'tell',
  'memory', 'rep', 'mood', 'npcMood', 'openShop', 'panel', 'sfx', 'notify', 'bark', 'npcBark', 'consume', 'restock', 'noise',
  'errand', 'takeTag', 'containerPut', 'containerTake', 'endDialogue', 'clearStolen', 'npcMemory', 'oil', 'action', 'payWages', 'schedule', 'site', 'permit', 'police', 'gang', 'factory', 'arms', 'dealer',
];

/**
 * @param {object} game
 * @param {Array|object|undefined} effects
 * @param {object} [npc] NPC context ("this character")
 * @returns {{actions: Array<object>}}
 */
export function applyEffects(game, effects, npc) {
  const result = { actions: [] };
  if (!effects) return result;
  const list = Array.isArray(effects) ? effects : [effects];
  for (const eff of list) applyOne(game, eff, npc, result);
  return result;
}

function itemArg(v) {
  return typeof v === 'string' ? { id: v, count: 1 } : { count: 1, ...v };
}

function npcRef(game, id, ctx) {
  return id === 'self' || !id ? ctx : game.npcs.get(id);
}

function applyOne(game, eff, npc, result) {
  if (eff.if !== undefined) {
    const branch = check(eff.if, game, npc) ? eff.then : eff.else;
    const sub = applyEffects(game, branch, npc);
    result.actions.push(...sub.actions);
    return;
  }
  if (eff.chance !== undefined) {
    const sub = applyEffects(game, game.rng.chance(eff.chance) ? eff.then : eff.else, npc);
    result.actions.push(...sub.actions);
    return;
  }
  const now = game.clock.total;
  for (const [key, val] of Object.entries(eff)) {
    switch (key) {
      case 'give': {
        const { id, count } = itemArg(val);
        game.inventory.add(id, count);
        break;
      }
      case 'take': {
        const { id, count } = itemArg(val);
        game.inventory.remove(id, count);
        break;
      }
      case 'takeTag': {
        const entry = game.inventory.list().find((e) => e.def.tags?.includes(val));
        if (entry) {
          game.inventory.remove(entry.id, 1);
          game.notify(`You lost a ${entry.def.name}.`, 'warn');
        }
        break;
      }
      case 'money':
        game.player.money = Math.max(0, game.player.money + val);
        game.bus.emit('money:changed', { delta: val, total: game.player.money });
        break;
      case 'rel':
        if (npc) game.relationships.adjust(npc, 'player', val, 'effect');
        break;
      case 'relNpc': {
        const from = game.npcs.get(val.from);
        if (from) {
          const { from: _f, to, ...deltas } = val;
          game.relationships.adjust(from, to, deltas, 'effect');
        }
        break;
      }
      case 'flag':
        for (const [k, v] of Object.entries(val)) game.setFlag(k, v);
        break;
      case 'quest':
        if (val.start) game.quests.start(val.id);
        if (val.stage) game.quests.setStage(val.id, val.stage);
        if (val.complete) game.quests.complete(val.id, val.complete);
        if (val.fail) game.quests.fail(val.id, val.fail);
        break;
      case 'learn':
        game.knowledge.learn(game.player, val, { kind: 'fact', source: npc ? `told:${npc.id}` : 'observed', at: now });
        break;
      case 'npcLearn':
        if (npc) game.knowledge.learn(npc, val, { kind: 'fact', source: 'observed', at: now });
        break;
      case 'tell': {
        const target = game.npcs.get(val.npc);
        if (target) game.knowledge.learn(target, val.fact, { kind: val.kind || 'fact', source: 'told:player', at: now });
        break;
      }
      case 'memory':
        if (npc) remember(npc, { ...val, text: interpolate(val.text, { player: game.player.name }), about: val.about === undefined ? 'player' : val.about }, now);
        break;
      case 'npcMemory': {
        const target = game.npcs.get(val.npc);
        if (target) remember(target, { ...val, text: interpolate(val.text, { player: game.player.name }) }, now);
        break;
      }
      case 'rep':
        for (const [fac, d] of Object.entries(val)) game.adjustReputation(fac, d);
        break;
      case 'mood':
        if (npc) game.setMood(npc, val.id, val.minutes ?? 120);
        break;
      case 'npcMood': {
        const target = game.npcs.get(val.npc);
        if (target) game.setMood(target, val.id, val.minutes ?? 120);
        break;
      }
      case 'openShop':
        result.actions.push({ type: 'shop', shopId: val });
        break;
      case 'endDialogue':
        result.actions.push({ type: 'end' });
        break;
      case 'sfx':
        game.bus.emit('sfx', { id: val });
        break;
      case 'notify':
        game.notify(val, eff.notifyKind || 'info');
        break;
      case 'bark':
        if (npc) game.bark(npc, val);
        break;
      case 'npcBark': {
        const target = game.npcs.get(val.npc);
        if (target) game.bark(target, val.text);
        break;
      }
      case 'consume': {
        // NPC consumes an item from a shop's stock (e.g. lunch at the café).
        const shop = game.world.shops[val.shop];
        if (shop && (shop.stock[val.item] || 0) > 0) {
          shop.stock[val.item]--;
          game.bus.emit('shop:stock', { shopId: val.shop, item: val.item, stock: shop.stock[val.item], by: npc?.id });
          const sub = applyEffects(game, val.then, npc);
          result.actions.push(...sub.actions);
        } else {
          const sub = applyEffects(game, val.else, npc);
          result.actions.push(...sub.actions);
        }
        break;
      }
      case 'restock': {
        game.restockShop(val);
        break;
      }
      case 'containerPut': {
        const c = game.world.containers[val.container];
        if (c) c.items[val.item] = (c.items[val.item] || 0) + (val.count ?? 1);
        break;
      }
      case 'oil': {
        // { oil: { add: { morale: -10, sharesOwned: 5 }, set: { strike: true, accidentDay: '$day' } } }
        const st = game.oil.state;
        for (const [k, v] of Object.entries(val.add || {})) st[k] = (st[k] || 0) + v;
        for (const [k, v] of Object.entries(val.set || {})) st[k] = v === '$day' ? game.clock.day : v;
        st.morale = Math.max(0, Math.min(100, st.morale));
        game.bus.emit('oil:changed', {});
        break;
      }
      case 'site':
        // { site: { goodwill: 2 } } — Mason's Os crew goodwill
        if (val.goodwill) game.construction.addGoodwill(val.goodwill);
        break;
      case 'panel':
        // { panel: { name: 'logistics', tab: 'Acquire' } } opens a panel after the line is said
        result.actions.push({ type: 'panel', panel: val.name, opts: { ...val, name: undefined } });
        break;
      case 'dealer':
        // { dealer: 'fender' } opens that dealership's sales panel
        result.actions.push({ type: 'dealer', dealer: val });
        break;
      case 'arms': {
        // { arms: { licence: true } }
        if (val.licence) {
          const r = game.arms.buyLicence();
          if (r.text) game.notify(r.text, r.ok ? 'good' : 'warn');
        }
        break;
      }
      case 'factory': {
        // { factory: { contract: 'small' | 'large' | null } }
        if ('contract' in val) {
          const r = game.factory.setContract(val.contract);
          if (r.text) game.notify(r.text, r.ok ? 'good' : 'warn');
        }
        break;
      }
      case 'gang': {
        // { gang: { sample: true } | { deliver: true } | { tribute: true } | { split: true } } — sample/deliver act on this NPC
        let r = null;
        if (val.sample && npc) r = game.gang.sample(npc);
        if (val.deliver && npc) r = game.gang.deliver(npc);
        if (val.tribute) r = game.gang.tribute();
        if (val.split) r = game.gang.split();
        if (r?.text) game.notify(r.text, r.ok ? 'good' : 'warn');
        break;
      }
      case 'police': {
        // { police: { bribe: true } | { payFine: true } | { pettyDeal: 'money' | itemId } }
        let r = null;
        if (val.bribe) r = game.police.bribe();
        if (val.payFine) r = game.police.payFine();
        if (val.pettyDeal) game.police.pettyDeal(val.pettyDeal);
        if (r?.text) game.notify(r.text, r.ok ? 'good' : 'warn');
        break;
      }
      case 'permit':
        // Civic Office issues building permits for every contract awaiting one.
        game.properties.grantPermits();
        break;
      case 'payWages': {
        if (val === 'construction') {
          game.construction.payShift();
          break;
        }
        const pay = game.oil.wagesOwed();
        game.player.money += pay;
        game.bus.emit('money:changed', { delta: pay, total: game.player.money });
        break;
      }
      case 'schedule': {
        // { schedule: { event: 'ev_x', at: 'HH:MM' } } or { event, delayMinutes }
        const now = game.clock.total;
        let at = now + (val.delayMinutes ?? 0);
        if (val.at) {
          const [h, m] = val.at.split(':').map(Number);
          at = Math.floor(now / 1440) * 1440 + h * 60 + m;
          if (at <= now) at += 1440;
        }
        game.world.events.pending.push({ id: val.event, at });
        break;
      }
      case 'action':
        // UI actions from dialogue, e.g. { action: 'invest' } or { action: 'ledger' }
        result.actions.push({ type: val });
        break;
      case 'containerTake': {
        const c = game.world.containers[val.container];
        if (c && (c.items[val.item] || 0) > 0) c.items[val.item] -= 1;
        break;
      }
      case 'clearStolen':
        delete game.player.stolen[val];
        break;
      case 'noise':
        game.makeNoise(val);
        break;
      case 'errand': {
        const target = npcRef(game, val.npc, npc);
        if (target) game.sendOnErrand(target, val);
        break;
      }
      case 'then':
      case 'else':
      case 'notifyKind': // modifier for 'notify'
        break;
      default:
        game.warn?.(`Unknown effect key "${key}"`);
    }
  }
}

/** Resolve a 'map:spot' reference to pixel coordinates. */
export function spotToPx(game, ref) {
  const { map, spot } = parseSpotRef(ref);
  const m = game.maps.get(map);
  const s = m?.spot(spot);
  return s ? { map, x: (s.x + 0.5) * TILE, y: (s.y + 0.5) * TILE } : null;
}
