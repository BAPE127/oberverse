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
  ['calcs [n]', 'n of every calculator (default 5)'],
  ['gang <0–100>', 'set the Sums of Anarchy\'s anger'],
  ['customer <name> <player|gang|locked>', 'set a customer\'s status (customers lists them)'],
  ['order <name>', 'that customer pages you an order right now'],
  ['warehouse <wh7|wh9|wh12>', 'own a warehouse (free)'],
  ['parts [n]', 'n of every calculator part (default 20)'],
  ['machines', 'two of every machine, 40 belts, 10 arms'],
  ['made <n>', 'set how many calculators you\'ve made (unlocks Sal\'s machinery at 5, deliveries at 10)'],
  ['licence', 'get an arms licence (free)'],
  ['works <aw1|aw2|aw3>', 'own an arms works (free)'],
  ['armsparts [n]', 'n of every arms part (default 20)'],
  ['stations', 'one of every arms workstation, plus belts, arms and a generator'],
  ['research <id|all>', 'complete a research node (or all of them)'],
  ['hire [n] <works>', 'hire n applicants (default 1) into a works'],
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
    if (ok && cmd !== 'help' && cmd !== 'items' && cmd !== 'npcs' && cmd !== 'maps' && cmd !== 'spots' && cmd !== 'customers') game.setFlag('debug_used', true);
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
    case 'calcs': {
      const n = Math.max(1, Math.round(parseNum(args[0]) ?? 5));
      for (const id of Object.keys(game.content.items).filter((k) => k.startsWith('item_calc_'))) game.inventory.add(id, n, { silent: true });
      return out(`+${n} of every calculator.`);
    }
    case 'gang': {
      const n = parseNum(args[0]);
      if (n === null) return out(`Anger: ${game.world.gang.anger} (tier ${game.gang.tier()}). Usage: gang <0–100>`, false);
      game.gang.addAnger(clamp(Math.round(n), 0, 100) - game.world.gang.anger, 'debug');
      return out(`Sums of Anarchy anger: ${game.world.gang.anger} (tier ${game.gang.tier()})`);
    }
    case 'customers': {
      return out(Object.entries(game.world.gang.customers).map(([id, c]) => `${id.padEnd(12)} ${c.status.padEnd(7)} ${c.order ? `order ${c.order.qty}× ${c.order.type}` : ''}`).join('\n'));
    }
    case 'customer':
    case 'order': {
      const q = (args[0] || '').toLowerCase();
      const id = Object.keys(game.world.gang.customers).find((k) => k === q || k === `npc_${q}` || game.npcs.get(k)?.profile.name.toLowerCase().includes(q));
      if (!q || !id) return out(`Usage: ${cmd} <name>. Try: customers`, false);
      const npc = game.npcs.get(id);
      if (cmd === 'order') {
        game.gang.customer(id).status = 'player';
        const o = game.gang.newOrder(npc);
        return out(`${npc.profile.shortName} wants ${o.qty}× ${o.type} at ${o.spot}.`);
      }
      const st = args[1];
      if (!['player', 'gang', 'locked'].includes(st)) return out('Status must be player, gang or locked.', false);
      game.gang.customer(id).status = st;
      return out(`${npc.profile.name}: ${st}`);
    }
    case 'warehouse': {
      const id = args[0];
      const def = game.content.warehouses[id];
      if (!def) return out(`Usage: warehouse <${Object.keys(game.content.warehouses).join('|')}>`, false);
      game.setFlag(def.flag, true);
      return out(`${def.name} is yours.`);
    }
    case 'parts': {
      const n = Math.max(1, Math.round(parseNum(args[0]) ?? 20));
      for (const id of Object.keys(game.content.items).filter((k) => k.startsWith('item_part_'))) game.inventory.add(id, n, { silent: true });
      return out(`+${n} of every part.`);
    }
    case 'machines': {
      for (const id of Object.keys(game.content.items).filter((k) => game.content.items[k].build?.type === 'machine' || k === 'item_generator')) game.inventory.add(id, 2, { silent: true });
      game.inventory.add('item_belt', 40, { silent: true });
      game.inventory.add('item_inserter', 10, { silent: true });
      return out('Two of every machine, 40 belts, 10 inserter arms.');
    }
    case 'made': {
      const n = parseNum(args[0]);
      if (n === null) return out(`Made: ${game.factory.state.made}. Usage: made <n>`, false);
      game.factory.state.made = Math.max(0, Math.round(n));
      return out(`Made: ${game.factory.state.made}`);
    }
    case 'licence':
    case 'license': {
      game.setFlag('arms_licence', true);
      game.setFlag('arms_pitch_accepted', true);
      return out('You hold an arms licence.');
    }
    case 'works': {
      const id = args[0];
      const def = game.content.armsWarehouses[id];
      if (!def) return out(`Usage: works <${Object.keys(game.content.armsWarehouses).join('|')}>`, false);
      game.setFlag('arms_licence', true);
      game.setFlag(def.flag, true);
      return out(`${def.name} is yours.`);
    }
    case 'armsparts': {
      const n = Math.max(1, Math.round(parseNum(args[0]) ?? 20));
      for (const id of Object.keys(game.content.items).filter((k) => k.startsWith('item_ap_'))) game.inventory.add(id, n, { silent: true });
      return out(`+${n} of every arms part.`);
    }
    case 'stations': {
      for (const id of Object.keys(game.content.items).filter((k) => k.startsWith('item_st_'))) game.inventory.add(id, 1, { silent: true });
      game.inventory.add('item_belt', 30, { silent: true });
      game.inventory.add('item_inserter', 8, { silent: true });
      game.inventory.add('item_generator', 1, { silent: true });
      return out('One of every workstation, 30 belts, 8 arms, a generator.');
    }
    case 'research': {
      const id = args[0];
      const tree = game.content.arms.research;
      if (id === 'all') { for (const k of Object.keys(tree)) game.arms.state.research.done[k] = true; return out('All research complete.'); }
      if (!tree[id]) return out(`Usage: research <${Object.keys(tree).join('|')}|all>`, false);
      game.arms.state.research.done[id] = true;
      return out(`Researched: ${tree[id].name}.`);
    }
    case 'hire': {
      const n = args.length > 1 ? Math.max(1, Math.round(parseNum(args[0]) ?? 1)) : 1;
      const wh = args[args.length - 1];
      if (!game.content.armsWarehouses[wh]) return out('Usage: hire [n] <aw1|aw2|aw3>', false);
      const done = [];
      for (let i = 0; i < n; i++) {
        game.arms.candidates();
        const r = game.arms.hire(0, wh);
        if (!r.ok) return out(r.text, false);
        done.push(r.text);
        if (!game.arms.state.candidates.length) game.arms.state.candidatesDay = 0;
      }
      return out(done.join('\n'));
    }
    default:
      return out(`Unknown command "${cmd}". Type help.`, false);
  }
}

export const DEBUG_HELP = HELP;
