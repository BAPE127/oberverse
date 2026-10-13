// Debug console commands (for testing). Pure game-state operations with no DOM,
// so they work from the in-game Debug menu (` key) and from tests alike.
// Every command marks the save with flag `debug_used` so test saves are
// recognisable.
import { TILE, clamp } from '../core/util.js';
import { npcMaxHealth } from '../systems/combat.js';

const HELP = [
  ['help', 'list commands'],
  ['give <item> [n]', 'add an item (id or part of its name), e.g. give pistol, give 9mm 60'],
  ['take <item> [n]', 'remove an item'],
  ['items [filter]', 'list item ids'],
  ['money <n> | money +n | money -n', 'set or change obols'],
  ['health <n> · energy <n> · heal', 'set health/energy (0–100); heal fills both'],
  ['god', 'toggle invulnerability'],
  ['weapons', 'every weapon plus ammo, loaded'],
  ['ammo [n]', 'n rounds of every ammo type (default 60)'],
  ['time <HH:MM> · skip <minutes>', 'set the clock (forward) or skip ahead'],
  ['tp <map> [spot]', 'teleport; maps lists maps, spots <map> lists spots'],
  ['revive <npc|all>', 'bring back the dead and the knocked-out'],
  ['npcs', 'list characters and where they are'],
  ['stat <charm|wits|grit|finesse> <1–5>', 'set a stat'],
  ['rep <faction> <n>', 'set reputation'],
  ['flag <name> [value]', 'show or set a story flag'],
  ['wanted <0–3> · record <n>', 'set your Wanted level or criminal record'],
  ['jail [hours] · release', 'go to jail (optional sentence) or walk free'],
  ['bribe', 'the police look the other way for 3 days (free)'],
];

const parseNum = (s) => (s === undefined || s === '' || Number.isNaN(Number(s)) ? null : Number(s));

/** Resolve an item from an id or a fragment of its name. */
export function findItem(game, query) {
  const items = game.content.items;
  if (!query) return { error: 'Which item? Try: items' };
  const q = query.toLowerCase();
  if (items[q]) return { id: q };
  if (items[`item_${q}`]) return { id: `item_${q}` };
  const matches = Object.entries(items).filter(([id, it]) => id.includes(q) || it.name.toLowerCase().includes(q));
  const exact = matches.find(([, it]) => it.name.toLowerCase() === q);
  if (exact) return { id: exact[0] };
  if (matches.length === 1) return { id: matches[0][0] };
  const byId = matches.filter(([id]) => id.includes(q)); // "9mm" → the rounds (item_ammo_9mm), not the pistol
  if (byId.length === 1) return { id: byId[0][0] };
  if (!matches.length) return { error: `No item matches "${query}".` };
  return { error: `"${query}" matches ${matches.length} items: ${matches.slice(0, 8).map(([id]) => id).join(', ')}${matches.length > 8 ? '…' : ''}` };
}

function findNpc(game, query) {
  const q = (query || '').toLowerCase();
  for (const npc of game.npcs.values()) {
    if (npc.id === q || npc.id === `npc_${q}` || npc.profile.shortName.toLowerCase() === q || npc.profile.name.toLowerCase().includes(q)) return npc;
  }
  return null;
}

function revive(game, npc) {
  npc.dead = false;
  npc.diedAt = undefined;
  npc.downUntil = 0;
  npc.hostile = null;
  npc.health = npcMaxHealth(npc);
  npc.mood = null;
  game.npcSystem.settle(npc);
}

/**
 * Run one console line. Returns { ok, text } (text may be multi-line).
 * @param {import('./game.js').Game} game
 * @param {string} line
 */
export function runCommand(game, line) {
  const parts = String(line || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { ok: false, text: '' };
  const [cmd, ...args] = parts;
  const p = game.player;
  const out = (text, ok = true) => {
    if (ok && cmd !== 'help' && cmd !== 'items' && cmd !== 'npcs' && cmd !== 'maps' && cmd !== 'spots') game.setFlag('debug_used', true);
    return { ok, text };
  };
  switch (cmd.toLowerCase()) {
    case 'help':
    case '?':
      return out(HELP.map(([c, d]) => `${c.padEnd(34)} ${d}`).join('\n'));
    case 'give':
    case 'take': {
      // the count may come last: "give 9mm rounds 40"
      let n = 1;
      if (args.length > 1 && parseNum(args[args.length - 1]) !== null) n = Math.max(1, Math.floor(parseNum(args.pop())));
      const r = findItem(game, args.join(' '));
      if (r.error) return out(r.error, false);
      const def = game.content.items[r.id];
      if (cmd === 'give') {
        game.inventory.add(r.id, n);
        return out(`+${n} ${def.name} (${r.id})`);
      }
      const have = game.inventory.count(r.id);
      game.inventory.remove(r.id, Math.min(n, have));
      return out(`-${Math.min(n, have)} ${def.name}`);
    }
    case 'items': {
      const f = (args.join(' ') || '').toLowerCase();
      const list = Object.entries(game.content.items).filter(([id, it]) => !f || id.includes(f) || it.name.toLowerCase().includes(f) || it.category === f);
      return out(list.map(([id, it]) => `${id.padEnd(24)} ${it.name} [${it.category}]`).join('\n') || 'No items.');
    }
    case 'money': {
      const v = args[0];
      const n = parseNum(v);
      if (n === null) return out('Usage: money <n> | money +n | money -n', false);
      const before = p.money;
      p.money = Math.max(0, Math.round(/^[+-]/.test(v) ? p.money + n : n));
      game.bus.emit('money:changed', { delta: p.money - before, total: p.money, silent: true });
      return out(`Obols: ${p.money}`);
    }
    case 'health':
    case 'hp':
    case 'energy': {
      const n = parseNum(args[0]);
      if (n === null) return out(`Usage: ${cmd} <0–100>`, false);
      const key = cmd === 'energy' ? 'energy' : 'health';
      p[key] = clamp(n, 0, 100);
      return out(`${key}: ${p[key]}`);
    }
    case 'heal':
      p.health = 100;
      p.energy = 100;
      return out('Health and energy full.');
    case 'god':
      p.god = !p.god;
      return out(`God mode ${p.god ? 'ON — nothing can hurt you (the Wrath still can)' : 'OFF'}.`);
    case 'weapons': {
      const items = game.content.items;
      const given = [];
      for (const [id, it] of Object.entries(items)) {
        if (!it.weapon) continue;
        if (!game.inventory.count(id)) game.inventory.add(id, 1);
        given.push(it.name);
        if (it.weapon.kind === 'gun') {
          if (game.inventory.count(it.weapon.ammo) < it.weapon.mag * 3) game.inventory.add(it.weapon.ammo, it.weapon.mag * 3);
          p.mags = p.mags || {};
          p.mags[id] = it.weapon.mag;
        }
      }
      return out(`Armed: ${given.join(', ')}.`);
    }
    case 'ammo': {
      const n = Math.max(1, Math.floor(parseNum(args[0]) ?? 60));
      const ammo = Object.entries(game.content.items).filter(([, it]) => it.category === 'ammo');
      for (const [id] of ammo) game.inventory.add(id, n);
      return out(`+${n} of each: ${ammo.map(([, it]) => it.name).join(', ')}.`);
    }
    case 'time': {
      const m = /^(\d{1,2}):(\d{2})$/.exec(args[0] || '');
      if (!m) return out('Usage: time HH:MM', false);
      const target = Number(m[1]) * 60 + Number(m[2]);
      const ahead = ((target - game.clock.minuteOfDay) % 1440 + 1440) % 1440;
      game.skipTime(ahead);
      return out(`Day ${game.clock.day}, ${game.clock.timeString}.`);
    }
    case 'skip': {
      const n = parseNum(args[0]);
      if (n === null || n <= 0) return out('Usage: skip <minutes>', false);
      game.skipTime(Math.min(Math.round(n), 7 * 1440));
      return out(`Day ${game.clock.day}, ${game.clock.timeString}.`);
    }
    case 'maps':
      return out([...game.maps.values()].map((mp) => `${mp.id.padEnd(18)} ${mp.name} (${mp.kind})`).join('\n'));
    case 'spots': {
      const mp = game.maps.get(args[0] || p.map);
      if (!mp) return out(`No map "${args[0]}". Try: maps`, false);
      return out(Object.keys(mp.spots).join(', '));
    }
    case 'tp':
    case 'teleport': {
      const mp = game.maps.get(args[0]);
      if (!mp) return out(`No map "${args[0] || ''}". Try: maps`, false);
      const spot = args[1] || Object.keys(mp.spots)[0];
      if (!mp.spot(spot)) return out(`No spot "${spot}" on ${mp.id}. Try: spots ${mp.id}`, false);
      game.changeMap(mp.id, spot);
      return out(`Teleported to ${mp.name} (${spot}).`);
    }
    case 'revive': {
      if (args[0] === 'all') {
        let n = 0;
        for (const npc of game.npcs.values()) if (npc.dead || npc.downUntil) { revive(game, npc); n++; }
        return out(`Revived ${n}.`);
      }
      const npc = findNpc(game, args.join(' '));
      if (!npc) return out('Who? Try: npcs', false);
      revive(game, npc);
      return out(`${npc.profile.shortName} is back on their feet.`);
    }
    case 'npcs':
      return out([...game.npcs.values()].map((n) => `${n.id.padEnd(16)} ${n.map.padEnd(16)} ${String([Math.floor(n.x / TILE), Math.floor(n.y / TILE)]).padEnd(8)} ${n.dead ? 'DEAD' : n.downUntil ? 'KO' : n.activity}${n.health !== undefined ? ` hp ${Math.ceil(n.health)}` : ''}`).join('\n'));
    case 'stat': {
      const [s, v] = args;
      const n = parseNum(v);
      if (!(s in p.stats) || n === null) return out(`Usage: stat <${Object.keys(p.stats).join('|')}> <1–5>`, false);
      p.stats[s] = clamp(Math.round(n), 1, 5);
      return out(`${s}: ${p.stats[s]}`);
    }
    case 'rep': {
      const [f, v] = args;
      const n = parseNum(v);
      if (!game.content.factions[f] || n === null) return out(`Usage: rep <${Object.keys(game.content.factions).join('|')}> <n>`, false);
      p.reputation[f] = Math.round(n);
      return out(`${game.content.factions[f].name}: ${p.reputation[f]}`);
    }
    case 'flag': {
      const [name, v] = args;
      if (!name) return out('Usage: flag <name> [value]', false);
      if (v === undefined) return out(`${name} = ${JSON.stringify(game.getFlag(name) ?? null)}`);
      const val = v === 'true' ? true : v === 'false' ? false : parseNum(v) ?? v;
      game.setFlag(name, val);
      return out(`${name} = ${JSON.stringify(val)}`);
    }
    case 'wanted': {
      const n = parseNum(args[0]);
      if (n === null) return out(`Wanted: ${game.world.police.wanted}. Usage: wanted <0–3>`, false);
      const pol = game.police;
      const lvl = clamp(Math.round(n), 0, 3);
      if (lvl === 0) {
        game.world.police.wanted = 0;
        for (const o of pol.activeOfficers()) { if (o.pursuit) pol.endPursuit(o); o.hostile = null; }
        game.bus.emit('police:wanted', { level: 0 });
      } else {
        game.world.police.wanted = 0;
        pol.raiseWanted([0, 1, 3, 10][lvl], 'debug');
      }
      return out(`Wanted: ${game.world.police.wanted}`);
    }
    case 'record': {
      const n = parseNum(args[0]);
      if (n === null) return out(`Record: ${game.world.police.record}. Usage: record <n>`, false);
      game.world.police.record = Math.max(0, Math.round(n));
      return out(`Record: ${game.world.police.record}${game.police.lax() ? ' (the Chief doesn\'t care yet)' : ' (known criminal)'}`);
    }
    case 'jail': {
      if (game.police.jailed()) return out('Already in jail.', false);
      game.police.sendToJail('arrested');
      const h = parseNum(args[0]);
      if (h !== null) game.world.police.jail.until = game.clock.total + Math.max(1, h) * 60;
      return out(`Jailed: ${game.police.hoursLeft()} hours.`);
    }
    case 'release': {
      if (!game.police.jailed()) return out('Not in jail.', false);
      game.police.release();
      return out('Released.');
    }
    case 'bribe': {
      game.world.police.bribedUntilDay = game.clock.day + 3;
      return out(`The police look the other way until the end of Day ${game.world.police.bribedUntilDay}.`);
    }
    default:
      return out(`Unknown command "${cmd}". Type help.`, false);
  }
}

export const DEBUG_HELP = HELP;
