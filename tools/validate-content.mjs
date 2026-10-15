// Content validation: missing references, duplicate/mismatched IDs, invalid
// conditions/effects, unreachable schedule spots, missing audio.
// CLI: npm run validate    Library: import { validateContent } from this file.
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { CONTENT } from '../src/content/index.js';
import { GameMap } from '../src/world/gameMap.js';
import { findPath, routeBetweenMaps } from '../src/world/pathfinding.js';
import { CONDITION_KEYS } from '../src/sim/conditions.js';
import { EFFECT_KEYS } from '../src/game/effects.js';
import { coverageGaps } from '../src/sim/schedule.js';
import { parseSpotRef } from '../src/core/util.js';
import { compileSong, parseMelody } from '../src/audio/music.js';
import { AMBIENCE_IDS } from '../src/audio/ambience.js';
import { SFX } from '../src/audio/sfx.js';
import { STATIONS } from '../src/systems/oilCompany.js';
import { SITE_STATIONS } from '../src/systems/construction.js';
import { THEMES as WRATH_THEMES } from '../src/engine/wrath.js';

const QUEST_EVENTS = ['map:entered', 'item:acquired', 'fact:learned', 'flag:set', 'npc:talked', 'prop:used', 'quest:completed'];
const INTERACT_KINDS = ['container', 'read', 'sleep', 'sit', 'noticeboard', 'obstacle', 'forage', 'stockcheck', 'workstation', 'useItem', 'contracts', 'shop', 'jail', 'factory', 'arms', 'busstop', 'logistics'];
const COMPANY_STATIONS = { oil: STATIONS, construction: SITE_STATIONS };

export function validateContent(content = CONTENT) {
  const errors = [];
  const warnings = [];
  const err = (m) => errors.push(m);
  const warn = (m) => warnings.push(m);
  const maps = new Map(Object.values(content.maps).map((d) => [d.id, new GameMap(d, content.propTypes)]));
  const charIds = new Set(Object.keys(content.characters));
  const factionIds = new Set(Object.keys(content.factions));

  // ids match their registry keys
  for (const reg of ['maps', 'characters', 'dialogues']) {
    for (const [key, v] of Object.entries(content[reg])) if (v.id !== key) err(`${reg}: key "${key}" has id "${v.id}"`);
  }

  const spotOk = (ref, where) => {
    const { map, spot } = parseSpotRef(ref);
    const m = maps.get(map);
    if (!m) return err(`${where}: unknown map in spot "${ref}"`), false;
    const s = m.spot(spot);
    if (!s) return err(`${where}: unknown spot "${ref}"`), false;
    if (m.blockedTile(s.x, s.y)) err(`${where}: spot "${ref}" is on a blocked tile`);
    return true;
  };

  // maps
  for (const m of maps.values()) {
    const rows = m.def.tiles;
    if (rows.some((r) => r.length !== m.width)) err(`map ${m.id}: ragged tile rows`);
    for (const d of m.doors) {
      if (d.to && !maps.has(d.to.map)) err(`map ${m.id} door ${d.id}: unknown target map ${d.to.map}`);
      else if (d.to) spotOk(`${d.to.map}:${d.to.spot}`, `map ${m.id} door ${d.id}`);
      if (d.lock?.key && !d.lock.hours && d.lock.key !== 'item_none' && !content.items[d.lock.key]) warn(`map ${m.id} door ${d.id}: lock key ${d.lock.key} is not an item (door can never be unlocked by the player)`);
      for (const o of d.lock?.owners || []) if (!charIds.has(o)) err(`map ${m.id} door ${d.id}: unknown owner ${o}`);
    }
    for (const [name] of Object.entries(m.spots)) spotOk(`${m.id}:${name}`, `map ${m.id}`);
    const seen = new Set();
    for (const p of m.props) {
      if (seen.has(p.id)) err(`map ${m.id}: duplicate prop id ${p.id}`);
      seen.add(p.id);
      if (!content.propTypes[p.type]) err(`prop ${p.id}: unknown type ${p.type}`);
      if (p.x < 0 || p.y < 0 || p.x + p.w > m.width || p.y + p.h > m.height) err(`prop ${p.id}: out of bounds`);
      const k = p.interact?.kind;
      if (k && !INTERACT_KINDS.includes(k)) err(`prop ${p.id}: unknown interact kind ${k}`);
      if (k === 'container' && !content.containers[p.interact.container]) err(`prop ${p.id}: unknown container ${p.interact.container}`);
      if (k === 'read' && !content.docs[p.interact.doc]) err(`prop ${p.id}: unknown doc ${p.interact.doc}`);
      if (k === 'forage' && !content.items[p.interact.item]) err(`prop ${p.id}: unknown item ${p.interact.item}`);
      if (k === 'stockcheck' && !content.shops[p.interact.shop]) err(`prop ${p.id}: unknown shop ${p.interact.shop}`);
      if (k === 'obstacle') {
        if (p.interact.requires?.item && !content.items[p.interact.requires.item]) err(`prop ${p.id}: unknown required item`);
        if (p.interact.enter) spotOk(`${p.interact.enter.map}:${p.interact.enter.spot}`, `prop ${p.id}`);
      }
      if (p.type === 'item' && !content.items[p.item]) err(`prop ${p.id}: unknown item ${p.item}`);
      if (k === 'workstation' && !COMPANY_STATIONS[p.interact.company || 'oil']?.[p.interact.station]) err(`prop ${p.id}: unknown station ${p.interact.company || 'oil'}/${p.interact.station}`);
      if (k === 'useItem') { if (!content.items[p.interact.item]) err(`prop ${p.id}: unknown item ${p.interact.item}`); checkEffects(p.interact.effects, `prop ${p.id}`); }
      if (k === 'read' && p.interact.private && !charIds.has(p.interact.private)) err(`prop ${p.id}: unknown private owner`);
      if (p.hiddenUnless) checkCond(p.hiddenUnless, `prop ${p.id}`);
      if (p.onExamine) checkEffects(p.onExamine, `prop ${p.id}`);
    }
    // audio
    const music = typeof m.music === 'string' ? [m.music] : Object.values(m.music || {});
    for (const id of music) if (!content.songs[id]) err(`map ${m.id}: unknown music ${id}`);
    if (m.ambience && !AMBIENCE_IDS.includes(m.ambience)) err(`map ${m.id}: unknown ambience ${m.ambience}`);
  }

  // conditions/effects (recursive)
  function checkCond(cond, where) {
    if (!cond) return;
    if (Array.isArray(cond)) return cond.forEach((c) => checkCond(c, where));
    for (const [k, v] of Object.entries(cond)) {
      if (!CONDITION_KEYS.includes(k)) err(`${where}: unknown condition key "${k}"`);
      if (k === 'all' || k === 'any') v.forEach((c) => checkCond(c, where));
      if (k === 'not') checkCond(v, where);
      if (k === 'quest' && !content.quests[v.id]) err(`${where}: unknown quest ${v.id}`);
      if (k === 'jobDoneToday' && !content.quests[v]) err(`${where}: unknown job ${v}`);
      if ((k === 'knows' || k === 'playerKnows') && !content.facts[v]) err(`${where}: unknown fact ${v}`);
      if (k === 'hasItem' && !content.items[typeof v === 'string' ? v : v.id]) err(`${where}: unknown item ${JSON.stringify(v)}`);
      if (k === 'stolen' && !content.items[v]) err(`${where}: unknown item ${v}`);
      if (k === 'rep') for (const f of Object.keys(v)) if (!factionIds.has(f)) err(`${where}: unknown faction ${f}`);
      if (k === 'mood') for (const mo of [].concat(v)) if (!content.moods[mo]) err(`${where}: unknown mood ${mo}`);
      if (k === 'map') for (const mp of [].concat(v)) if (!maps.has(mp)) err(`${where}: unknown map ${mp}`);
      if (k === 'npcAt' && !charIds.has(v.npc)) err(`${where}: unknown npc ${v.npc}`);
      if (k === 'stock' && (!content.shops[v.shop] || !content.items[v.item])) err(`${where}: bad stock ref`);
      if (k === 'containerHas' && (!content.containers[v.container] || !content.items[v.item])) err(`${where}: bad container ref`);
    }
  }

  function checkEffects(list, where) {
    if (!list) return;
    for (const eff of [].concat(list)) {
      for (const [k, v] of Object.entries(eff)) {
        if (!EFFECT_KEYS.includes(k) && k !== 'notifyKind') err(`${where}: unknown effect key "${k}"`);
        if (k === 'if') checkCond(v, where);
        if (k === 'then' || k === 'else') checkEffects(v, where);
        if ((k === 'give' || k === 'take') && !content.items[typeof v === 'string' ? v : v.id]) err(`${where}: unknown item ${JSON.stringify(v)}`);
        if ((k === 'learn' || k === 'npcLearn') && !content.facts[v]) err(`${where}: unknown fact ${v}`);
        if (k === 'tell' && (!content.facts[v.fact] || !charIds.has(v.npc))) err(`${where}: bad tell ${JSON.stringify(v)}`);
        if (k === 'quest' && !content.quests[v.id]) err(`${where}: unknown quest ${v.id}`);
        if (k === 'quest' && v.stage && !content.quests[v.id]?.stages[v.stage]) err(`${where}: unknown stage ${v.id}.${v.stage}`);
        if (k === 'quest' && v.complete && !content.quests[v.id]?.outcomes?.[v.complete]) err(`${where}: unknown outcome ${v.id}.${v.complete}`);
        if (k === 'rep') for (const f of Object.keys(v)) if (!factionIds.has(f)) err(`${where}: unknown faction ${f}`);
        if ((k === 'mood') && !content.moods[v.id]) err(`${where}: unknown mood ${v.id}`);
        if (k === 'npcMood' && (!content.moods[v.id] || !charIds.has(v.npc))) err(`${where}: bad npcMood`);
        if (k === 'openShop' && !content.shops[v]) err(`${where}: unknown shop ${v}`);
        if (k === 'sfx' && !SFX[v]) err(`${where}: unknown sfx ${v}`);
        if (k === 'relNpc' && !charIds.has(v.from)) err(`${where}: unknown npc ${v.from}`);
        if (k === 'npcMemory' && !charIds.has(v.npc)) err(`${where}: unknown npc ${v.npc}`);
        if (k === 'npcBark' && !charIds.has(v.npc)) err(`${where}: unknown npc ${v.npc}`);
        if (k === 'consume') {
          if (!content.shops[v.shop] || !content.items[v.item]) err(`${where}: bad consume ref`);
          checkEffects(v.then, where);
          checkEffects(v.else, where);
        }
        if (k === 'restock' && !content.shops[v]) err(`${where}: unknown shop ${v}`);
        if ((k === 'containerPut' || k === 'containerTake') && (!content.containers[v.container] || !content.items[v.item])) err(`${where}: bad container ref`);
        if (k === 'noise') {
          for (const s of v.sources || []) spotOk(s, where);
          if (v.fact && !content.facts[v.fact]) err(`${where}: unknown fact ${v.fact}`);
          if (v.sfx && !SFX[v.sfx]) err(`${where}: unknown sfx ${v.sfx}`);
        }
        if (k === 'errand') spotOk(v.spot, where);
        if (k === 'schedule' && !content.events[v.event]) err(`${where}: unknown scheduled event ${v.event}`);
        if (k === 'oil') for (const key of [...Object.keys(v.add || {}), ...Object.keys(v.set || {})]) if (!['sharesOwned', 'morale', 'risk', 'strike', 'accidentDay', 'derricks', 'pipeline', 'safety', 'wageLevel', 'scandalDays'].includes(key)) err(`${where}: unknown oil field ${key}`);
      }
    }
  }

  const checkSay = (pages, where) => {
    for (const p of pages || []) {
      if (typeof p === 'string') continue;
      checkCond(p.if, where);
      checkEffects(p.effects, where);
    }
  };

  // characters
  for (const c of Object.values(content.characters)) {
    const w = `character ${c.id}`;
    if (!content.dialogues[c.dialogue]) err(`${w}: missing dialogue ${c.dialogue}`);
    if (c.shop && !content.shops[c.shop]) err(`${w}: unknown shop ${c.shop}`);
    if (c.faction && !factionIds.has(c.faction)) err(`${w}: unknown faction ${c.faction}`);
    if (c.motif && !content.motifs[c.motif]) err(`${w}: unknown motif ${c.motif}`);
    if (c.tier === 'major' && !c.motif) err(`${w}: major characters need a motif`);
    if (!c.appearance?.skin || !c.appearance?.outfit) err(`${w}: appearance needs at least skin and outfit colours`);
    const gaps = coverageGaps(c.schedule || []);
    if (gaps) err(`${w}: schedule leaves ${gaps} minutes of the day uncovered`);
    const actor = { canPass: (door) => Boolean(door.to) && (!door.lock || (door.lock.owners || []).includes(c.id) || Boolean(door.lock.hours)) };
    const spots = [...(c.schedule || []).map((b) => b.spot), ...(c.impulses || []).map((i) => i.spot)];
    for (const b of c.schedule || []) {
      spotOk(b.spot, `${w} schedule`);
      checkEffects(b.onArrive, `${w} schedule onArrive`);
    }
    for (const imp of c.impulses || []) {
      spotOk(imp.spot, `${w} impulse ${imp.id}`);
      checkCond(imp.when, `${w} impulse ${imp.id}`);
      if (!(imp.trait in (c.personality || {}))) err(`${w} impulse ${imp.id}: trait ${imp.trait} not in personality`);
      // Mirror of npcBrain.decide(): an impulse that can never outscore the schedule is dead content.
      const best = (imp.weight ?? 1) * (c.personality?.[imp.trait] ?? 0.5) + Math.max(0, ...Object.values(imp.moods || {})) + 0.25;
      const sched = 1 + (c.personality?.conscientiousness ?? 0.5) * 0.6;
      if (best <= sched) err(`${w} impulse ${imp.id}: can never beat the schedule (best ${best.toFixed(2)} vs ${sched.toFixed(2)}) — raise its weight`);
    }
    // reachability between consecutive schedule spots
    for (let i = 0; i < spots.length; i++) {
      for (let j = 0; j < spots.length; j++) {
        if (i === j) continue;
        const a = parseSpotRef(spots[i]);
        const b = parseSpotRef(spots[j]);
        const route = routeBetweenMaps(maps, a.map, b.map, actor);
        if (!route) {
          err(`${w}: no route from ${spots[i]} to ${spots[j]}`);
          continue;
        }
        const ma = maps.get(a.map);
        const sa = ma?.spot(a.spot);
        const goal = route.length ? route[0].door : maps.get(b.map)?.spot(b.spot);
        if (sa && goal && findPath(ma, sa.x, sa.y, goal.x, goal.y, actor) === null) err(`${w}: ${spots[i]} cannot walk to ${route.length ? 'door ' + goal.id : spots[j]}`);
      }
    }
    for (const id of Object.keys(c.relationships || {})) if (id !== 'player' && !charIds.has(id)) err(`${w}: relationship with unknown ${id}`);
    for (const f of c.knowledge || []) if (!content.facts[f]) err(`${w}: unknown fact ${f}`);
    for (const id of Object.keys(c.giftPrefs || {})) if (id !== 'tags' && !content.items[id]) err(`${w}: gift pref for unknown item ${id}`);
    for (const [f, r] of Object.entries(c.reactions || {})) {
      if (!content.facts[f]) err(`${w}: reaction to unknown fact ${f}`);
      if (r.mood && !content.moods[r.mood.id]) err(`${w}: reaction mood ${r.mood.id}`);
    }
    for (const n of c.notices || []) if (!maps.has(n.map)) err(`${w}: notice on unknown map ${n.map}`);
    for (const id of Object.keys(c.opinions || {})) if (!charIds.has(id)) err(`${w}: opinion about unknown ${id}`);
    for (const k of ['sociability', 'conscientiousness']) if (typeof c.personality?.[k] !== 'number') warn(`${w}: personality.${k} not set (defaults to 0.5)`);
  }

  // dialogues
  for (const d of Object.values(content.dialogues)) {
    const w = `dialogue ${d.id}`;
    const ids = new Set();
    for (const g of [...(d.greetings || []), ...(d.farewells || [])]) {
      checkCond(g.if, w);
      checkEffects(g.effects, w);
      for (const v of g.variants || [g.say]) checkSay(v, w);
    }
    if (!(d.greetings || []).some((g) => !g.if || Object.keys(g.if).length === 0)) err(`${w}: needs a fallback greeting with no conditions`);
    for (const t of d.topics || []) {
      if (ids.has(t.id)) err(`${w}: duplicate topic ${t.id}`);
      ids.add(t.id);
      checkCond(t.if, `${w} topic ${t.id}`);
      checkEffects(t.effects, `${w} topic ${t.id}`);
      for (const v of t.variants || [t.say]) checkSay(v, `${w} topic ${t.id}`);
      for (const c of t.choices || []) {
        const cw = `${w} topic ${t.id} choice ${c.id}`;
        checkCond(c.if, cw);
        checkCond(c.require, cw);
        checkEffects(c.effects, cw);
        checkSay(c.say, cw);
        if (c.fail) { checkEffects(c.fail.effects, cw); checkSay(c.fail.say, cw); }
        for (const m of c.check?.mods || []) checkCond(m.if, cw);
        if (c.next && !(d.topics || []).some((x) => x.id === c.next)) err(`${cw}: next topic ${c.next} missing`);
      }
    }
    for (const a of d.askAbout || []) {
      checkCond(a.if, w);
      checkEffects(a.effects, w);
      if (!a.keywords?.length) err(`${w}: askAbout entry without keywords`);
    }
    if (!d.unknown?.length) warn(`${w}: no "unknown subject" lines`);
  }

  // quests
  for (const [id, q] of Object.entries(content.quests)) {
    const w = `quest ${id}`;
    if (!q.stages[q.start]) err(`${w}: start stage ${q.start} missing`);
    if (q.giver && !charIds.has(q.giver)) err(`${w}: unknown giver ${q.giver}`);
    for (const [sid, st] of Object.entries(q.stages)) {
      if (!st.journal) err(`${w} stage ${sid}: no journal text`);
      if (st.marker) spotOk(st.marker, `${w} stage ${sid}`);
      for (const hnt of st.hints || []) checkCond(hnt.if, `${w} stage ${sid}`);
      checkEffects(st.onEnter, `${w} stage ${sid}`);
    }
    for (const t of q.triggers || []) {
      if (!QUEST_EVENTS.includes(t.event)) err(`${w}: unknown trigger event ${t.event}`);
      for (const s of [].concat(t.stage || [])) if (!q.stages[s]) err(`${w}: trigger stage ${s} missing`);
      if (t.advance && !q.stages[t.advance]) err(`${w}: trigger advance ${t.advance} missing`);
      checkCond(t.if, w);
      checkEffects(t.effects, w);
    }
    for (const o of Object.values(q.outcomes || {})) checkEffects(o.effects, `${w} outcome`);
    for (const o of Object.values(q.failures || {})) checkEffects(o.effects, `${w} failure`);
  }

  // events
  for (const [id, e] of Object.entries(content.events)) {
    const w = `event ${id}`;
    if (e.id !== id) err(`${w}: entry id "${e.id}" does not match its key (cooldowns would collide)`);
    if (e.npc && !charIds.has(e.npc)) err(`${w}: unknown npc ${e.npc}`);
    if (!['hourly', 'onArrive', 'chained'].includes(e.check)) err(`${w}: unknown check ${e.check}`);
    checkCond(e.when, w);
    checkEffects(e.effects, w);
    for (const f of e.followUps || []) if (!content.events[f.id]) err(`${w}: follow-up ${f.id} missing`);
  }

  // shops, containers, docs, notices, facts
  for (const [id, s] of Object.entries(content.shops)) {
    if (s.owner != null && !charIds.has(s.owner)) err(`shop ${id}: unknown owner ${s.owner}`); // null = unmanned
    for (const it of [...Object.keys(s.stock), ...Object.keys(s.buys || {})]) if (!content.items[it]) err(`shop ${id}: unknown item ${it}`);
  }
  for (const [id, c] of Object.entries(content.containers)) {
    if (c.owner != null && c.owner !== 'player' && !charIds.has(c.owner) && !factionIds.has(c.owner)) err(`container ${id}: unknown owner ${c.owner}`);
    for (const it of Object.keys(c.items)) if (!content.items[it]) err(`container ${id}: unknown item ${it}`);
  }
  for (const [id, d] of Object.entries(content.docs)) checkEffects(d.effects, `doc ${id}`);
  for (const n of content.notices || []) {
    checkCond(n.if, 'notice');
    if (n.learn && !content.facts[n.learn]) err(`notice: unknown fact ${n.learn}`);
  }
  for (const [id, f] of Object.entries(content.facts)) {
    for (const fac of Object.keys(f.reputation || {})) if (!factionIds.has(fac)) err(`fact ${id}: unknown faction ${fac}`);
    if (!f.text) err(`fact ${id}: no text`);
  }
  // crime facts referenced by trespass locks
  for (const m of maps.values()) {
    for (const d of m.doors) if (d.lock?.trespass && !content.facts[`fact_player_trespassed_${d.lock.trespass}`]) err(`door ${d.id}: missing trespass fact`);
  }

  // audio
  for (const [id, s] of Object.entries(content.songs)) {
    try {
      const c = compileSong(s);
      if (c.melodySteps !== c.totalSteps) err(`song ${id}: melody length ${c.melodySteps} != ${c.totalSteps} steps`);
    } catch (e) {
      err(`song ${id}: ${e.message}`);
    }
  }
  for (const [id, mo] of Object.entries(content.motifs)) {
    try { parseMelody(mo.notes); } catch (e) { err(`motif ${id}: ${e.message}`); }
    if (!charIds.has(mo.character)) err(`motif ${id}: unknown character ${mo.character}`);
  }
  const reg = new Set(content.audioRegistry.map((a) => a.id));
  for (const id of [...Object.keys(content.songs), ...Object.keys(content.motifs), ...Object.keys(SFX), ...AMBIENCE_IDS]) if (!reg.has(id)) err(`audio ${id}: missing from AUDIO_REGISTRY`);
  for (const id of reg) if (!content.songs[id] && !content.motifs[id] && !SFX[id] && !AMBIENCE_IDS.includes(id) && !['voice_blips', 'loop_engine', 'loop_siren'].includes(id)) err(`AUDIO_REGISTRY ${id}: no implementation`);

  // weapons and combat temperaments (src/systems/combat.js)
  for (const [id, it] of Object.entries(content.items)) {
    const w = it.weapon;
    if (!w) continue;
    if (!['melee', 'gun'].includes(w.kind)) err(`weapon ${id}: kind must be melee or gun`);
    for (const k of ['damage', 'range', 'cooldown']) if (!(w[k] > 0)) err(`weapon ${id}: ${k} must be > 0`);
    if (w.kind === 'gun') {
      if (!content.items[w.ammo]) err(`weapon ${id}: unknown ammo ${w.ammo}`);
      if (!(w.mag > 0) || !(w.reload > 0)) err(`weapon ${id}: guns need mag and reload`);
    }
    if (w.sound && !SFX[w.sound]) err(`weapon ${id}: unknown sound ${w.sound}`);
  }
  for (const c of Object.values(content.characters)) {
    if (c.origin === 'imported' && !c.killable && !c.wrath?.line) warn(`character ${c.id}: imported (protected) but has no wrath.line for the Wrath cutscene`);
    if (c.wrath?.theme && !WRATH_THEMES[c.wrath.theme]) err(`character ${c.id}: unknown wrath.theme ${c.wrath.theme} (have: ${Object.keys(WRATH_THEMES).join(', ')})`);
    const cb = c.combat;
    if (!cb) continue;
    if (cb.weapon && !content.items[cb.weapon]?.weapon) err(`character ${c.id}: combat.weapon ${cb.weapon} is not a weapon`);
    if (Array.isArray(cb.defends)) for (const d of cb.defends) if (!charIds.has(d)) err(`character ${c.id}: defends unknown ${d}`);
    if (cb.maxHealth !== undefined && !(cb.maxHealth > 0)) err(`character ${c.id}: combat.maxHealth must be > 0`);
  }

  // property plots and blueprints (src/content/properties.js, docs/PROPERTIES.md)
  const bps = content.blueprints || {};
  for (const [id, bp] of Object.entries(bps)) {
    if (!bp.name || !(bp.cost > 0) || !(bp.days >= 1)) err(`blueprint ${id}: needs name, cost > 0 and days >= 1`);
  }
  for (const [id, plot] of Object.entries(content.plots || {})) {
    const m = maps.get(plot.map);
    if (!m) { err(`plot ${id}: unknown map ${plot.map}`); continue; }
    if (m.kind === 'interior') err(`plot ${id}: plots must be on outdoor maps`);
    for (const b of plot.allowed || []) if (!bps[b]) err(`plot ${id}: unknown blueprint ${b}`);
    if (!plot.door || plot.door.y !== plot.y + plot.h - 1 || plot.door.x < plot.x || plot.door.x >= plot.x + plot.w) err(`plot ${id}: door must be on the footprint's bottom row`);
    for (let y = plot.y; y < plot.y + plot.h; y++)
      for (let x = plot.x; x < plot.x + plot.w; x++) {
        const t = m.tileAt(x, y);
        if (t === 'B' || t === 'D' || t === '~' || t === 'W' || t === 'x') { err(`plot ${id}: footprint overlaps ${t} at ${x},${y}`); y = 1e9; break; }
      }
    if (!plot.outside || m.blockedTile(plot.outside.x, plot.outside.y)) err(`plot ${id}: outside spot must be walkable`);
    for (const b of m.buildings) if (plot.x < b.x + b.w && b.x < plot.x + plot.w && plot.y < b.y + b.h && b.y < plot.y + plot.h) err(`plot ${id}: overlaps building ${b.id}`);
  }
  for (const [i, p] of (content.puns || []).entries()) if (!p.setup || !p.punchline) err(`pun #${i}: needs setup and punchline`);

  // start
  if (!maps.get(content.startingMap)?.spot(content.startingSpot)) err('startingMap/startingSpot invalid');

  validateLogistics(content, err, warn);
  return { errors, warnings };
}

/** Ober & Sons Maritime (v0.21.0+): ports, ships, contracts, piracy, missions. */
function validateLogistics(content, err, warn) {
  const L = content.logistics;
  if (!L) return;
  const where = 'logistics';
  const countries = content.arms?.countries || {};
  const num = (v, label, { min = 0, max = Infinity } = {}) => { if (typeof v !== 'number' || !(v >= min) || v > max) err(`${where}: ${label} is ${v} (expected ${min}–${max})`); };
  // ports
  for (const [id, p] of Object.entries(L.ports)) {
    if (!L.portTypes[p.type]) err(`${where}: port ${id} has unknown type ${p.type}`);
    if (p.country && !countries[p.country]) err(`${where}: port ${id} has unknown country ${p.country}`);
    num(p.lat, `port ${id} lat`, { min: -78, max: 80 });
    num(p.lon, `port ${id} lon`, { min: -180, max: 180 });
  }
  for (const [id, t] of Object.entries(L.portTypes)) for (const f of ['berths', 'maxSize', 'price', 'upkeep', 'fee']) num(t[f], `port type ${id} ${f}`, { min: f === 'berths' || f === 'maxSize' ? 1 : 0 });
  for (const id of L.rules.starterPorts) if (!L.ports[id]) err(`${where}: starter port ${id} doesn't exist`);
  if (L.rules.starterPorts.length > L.rules.maxPorts) err(`${where}: more starter ports than the port cap`);
  if (!L.ships[L.rules.starterShip.model]) err(`${where}: starter ship model ${L.rules.starterShip.model} doesn't exist`);
  if (!L.ports[L.rules.armsPort]) err(`${where}: arms port ${L.rules.armsPort} doesn't exist`);
  // ships
  const tags = new Set();
  for (const [id, m] of Object.entries(L.ships)) {
    const k = L.classes[m.cls] || L.warshipClasses?.[m.cls];
    if (!k) err(`${where}: ship ${id} has unknown class ${m.cls}`);
    for (const f of ['price', 'speed', 'range', 'opex', 'upkeep']) num(m[f], `ship ${id} ${f}`, { min: 1 });
    num(m.capacity, `ship ${id} capacity`);
    num(m.reliability, `ship ${id} reliability`, { min: 0, max: 1 });
    if (m.kind === 'cargo' && !(m.capacity > 0)) err(`${where}: cargo ship ${id} carries nothing`);
    if (!m.look?.hull) err(`${where}: ship ${id} has no look`);
    for (const b of m.bonuses || []) if (!L.bonuses?.[b]) err(`${where}: ship ${id} has unknown bonus ${b}`);
    for (const t of [].concat(m.needsPortType || k?.needsPortType || [])) if (!L.portTypes[t]) err(`${where}: ship ${id} needs unknown port type ${t}`);
    const size = m.size ?? k?.size;
    if (!Object.values(L.portTypes).some((t) => t.maxSize >= size)) err(`${where}: ship ${id} (size ${size}) fits no port`);
    for (const t of m.tags || []) tags.add(t);
  }
  for (const id of [...L.dealership, ...(L.warshipDealership || [])]) if (!L.ships[id]) err(`${where}: dealership lists unknown ship ${id}`);
  // contracts
  for (const [id, t] of Object.entries(L.contractTypes)) {
    if (t.needs && !tags.has(t.needs)) err(`${where}: contract type ${id} needs "${t.needs}" but no ship has it`);
    for (const c of t.clients) if (!L.clients[c]) err(`${where}: contract type ${id} has unknown client ${c}`);
    if (!(t.units[0] > 0 && t.units[1] >= t.units[0])) err(`${where}: contract type ${id} has bad units`);
    if (!Object.values(L.ships).some((m) => m.capacity >= t.units[0] && (!t.needs || (m.tags || []).includes(t.needs)))) err(`${where}: no ship can carry the smallest ${id} contract`);
  }
  // piracy and missions
  for (const [id, z] of Object.entries(L.pirateWaters || {})) { num(z.danger, `pirate water ${id} danger`, { max: 1 }); num(z.radius, `pirate water ${id} radius`, { min: 1 }); }
  for (const [id, m] of Object.entries(L.missionTypes || {})) {
    const N = m.needs || {};
    if (N.tag && !tags.has(N.tag)) err(`${where}: mission ${id} needs "${N.tag}" but no ship has it`);
    if (!(m.difficulty[0] >= 0 && m.difficulty[1] <= 1 && m.difficulty[1] >= m.difficulty[0])) err(`${where}: mission ${id} has bad difficulty`);
    for (const k of Object.keys(m.weights)) if (!['attack', 'defense', 'detection', 'stealth', 'speed'].includes(k)) err(`${where}: mission ${id} weighs unknown stat ${k}`);
  }
  // the shipyard (v0.24.0)
  const FAM = ['propulsion', 'power', 'cargo', 'navigation', 'defense', 'weapons', 'sensors', 'support'];
  const FITS = { sail: ['sail', 'any'], modern: ['modern', 'any'], advanced: ['modern', 'advanced', 'any'] };
  for (const [id, c] of Object.entries(L.components || {})) {
    if (!FAM.includes(c.family)) err(`${where}: component ${id} has unknown family ${c.family}`);
    if (!['sail', 'modern', 'advanced', 'any'].includes(c.tech)) err(`${where}: component ${id} has unknown tech ${c.tech}`);
    num(c.price, `component ${id} price`, { min: 1 });
    num(c.weight, `component ${id} weight`);
    if (c.needs && !L.components[c.needs]) err(`${where}: component ${id} needs unknown ${c.needs}`);
    for (const b of c.bonuses) if (!L.bonuses[b]) err(`${where}: component ${id} has unknown bonus ${b}`);
  }
  for (const [id, H] of Object.entries(L.hulls || {})) {
    if (!FITS[H.tech]) err(`${where}: hull ${id} has unknown tech ${H.tech}`);
    if (!(L.classes[H.cls] || L.warshipClasses[H.cls])) err(`${where}: hull ${id} has unknown class ${H.cls}`);
    for (const [fam, min, tech] of H.requires) {
      if (!FAM.includes(fam)) { err(`${where}: hull ${id} requires unknown family ${fam}`); continue; }
      const options = Object.values(L.components).filter((c) => c.family === fam && c.kinds.includes(H.kind) && FITS[H.tech]?.includes(c.tech) && (!tech || c.tech === tech) && (!c.minSize || H.size >= c.minSize));
      const most = options.reduce((a, c) => a + c.max, 0);
      if (most < min) err(`${where}: hull ${id} needs ${min}× ${fam}${tech ? ` (${tech})` : ''} but only ${most} can be fitted`);
    }
    // a minimal seaworthy fit exists: the lightest parts that meet the requirements fit the slots, weight and power
    let slots = 0, weight = 0, power = H.power;
    for (const [fam, min, tech] of H.requires) {
      const c = Object.values(L.components).filter((x) => x.family === fam && x.kinds.includes(H.kind) && FITS[H.tech]?.includes(x.tech) && (!tech || x.tech === tech)).sort((a, b) => a.weight - b.weight)[0];
      if (!c) continue;
      slots += min; weight += c.weight * min; power += c.power * min;
    }
    if (slots > H.slots || weight > H.maxWeight) err(`${where}: hull ${id} can't fit its own required parts (${slots} slots, ${weight} t)`);
    if (power < 0 && !Object.values(L.components).some((x) => x.family === 'power' && FITS[H.tech]?.includes(x.tech))) err(`${where}: hull ${id} can never be powered`);
  }
  for (const t of Object.keys(L.shipyard?.cost || {})) if (!L.portTypes[t]) err(`${where}: shipyard cost for unknown port type ${t}`);
  void warn;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { errors, warnings } = validateContent();
  for (const w of warnings) console.log(`warning: ${w}`);
  for (const e of errors) console.log(`ERROR: ${e}`);
  console.log(`\nContent validation: ${errors.length} error(s), ${warnings.length} warning(s).`);
  process.exit(errors.length ? 1 : 0);
}
