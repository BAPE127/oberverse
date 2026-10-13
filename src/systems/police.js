// The police: a criminal record, Wanted levels, calls from witnesses, dispatch,
// pursuit and arrest, bribes and fines, jail sentences and breakouts.
// State lives in game.world.police (saved). Officers are ordinary characters
// with faction 'fac_police'; Chief Lawrence Order is imported and protected.
//
//   crime ──▶ record += severity
//     ├─ an officer saw it ──────────────▶ Wanted (unless bribed / too petty for a lax chief)
//     └─ civilians saw it ──▶ a call ──(delay; ignored or hours late if bribed)──▶ Wanted + dispatch
//   Wanted ──▶ officers who see you pursue and cuff you (or shoot, at 3 stars)
//   arrested or killed ──▶ jail: serve the sentence, or break out (dig · keys · bribe the guard · the vent)
import { TILE, clamp, dist } from '../core/util.js';
import { remember } from '../sim/memory.js';
import { isDown } from './combat.js';

export const CHIEF = 'npc_lawrence';
export const GUARD = 'npc_hugh';
export const CELLMATE = 'npc_petty';
export const JAIL_MAP = 'jail';
export const BRIBE_DAYS = 3;
/** Below this record Chief Order can't be bothered with petty stuff. */
export const KNOWN_CRIMINAL = 8;
/** Game minutes without being seen before each Wanted level lapses. */
const WANTED_LAPSE = { 1: 60, 2: 180, 3: 480 };
const CUFF_SECONDS = 1.4;
const PURSUE_SPEED = 84;
const LOSE_SIGHT_SECONDS = 10;

export function freshPolice() {
  return { record: 0, wanted: 0, lastSeen: 0, bribedUntilDay: 0, calls: [], jail: null, arrests: 0, escapes: 0, lastCrimeDay: 0, officersKilled: 0, lastDecayDay: 1 };
}

const STOP = ['Stop! Police!', 'Hold it right there!', 'Halvermouth Police — freeze!', 'You! Hands where I can see them!'];

export class Police {
  constructor(game) {
    this.game = game;
    game.bus.on('crime', (e) => this.onCrime(e));
    game.bus.on('map:entered', ({ map }) => this.checkEscape(map));
  }

  get state() {
    if (!this.game.world.police) this.game.world.police = freshPolice();
    return this.game.world.police;
  }

  isOfficer(npc) {
    return npc?.profile.faction === 'fac_police' && npc.id !== CELLMATE;
  }

  /** Officers able to act (alive, conscious) — not the chief, who stays at his desk. */
  activeOfficers() {
    const now = this.game.clock.total;
    return [...this.game.npcs.values()].filter((n) => this.isOfficer(n) && n.id !== CHIEF && !isDown(n, now));
  }

  bribed() {
    return this.state.bribedUntilDay >= this.game.clock.day;
  }

  lax() {
    return this.state.record < KNOWN_CRIMINAL;
  }

  jailed() {
    return Boolean(this.state.jail);
  }

  // ------------------------------------------------------------------ crime
  severityOf(e) {
    const victim = e.victim ? this.game.npcs.get(e.victim) : null;
    const onOfficer = this.isOfficer(victim);
    switch (true) {
      case e.fact === 'fact_player_murder': return onOfficer ? 20 : 10;
      case e.fact === 'fact_player_assault': return onOfficer ? 6 : 3;
      case e.fact === 'gunfire': return 2;
      case e.fact === 'jailbreak': return 8;
      case e.fact === 'fact_player_dealing': return 2;
      case e.fact === 'fact_player_embargo': return 8;
      case e.fact === 'fact_player_explosion': return 10;
      case /trespass/.test(e.fact || ''): return 1;
      case /stole|theft/.test(e.fact || ''): return 1;
      default: return 1;
    }
  }

  levelFor(sev) {
    return sev >= 10 ? 3 : sev >= 3 ? 2 : 1;
  }

  onCrime(e) {
    const g = this.game;
    if (this.jailed() && e.fact !== 'jailbreak') return;
    const s = this.state;
    const sev = this.severityOf(e);
    s.record += sev;
    s.lastCrimeDay = g.clock.day;
    if (e.fact === 'fact_player_murder' && this.isOfficer(g.npcs.get(e.victim))) s.officersKilled += 1;
    const ids = [...new Set([...(e.witnesses || []), ...(e.victim ? [e.victim] : [])])];
    const people = ids.map((id) => g.npcs.get(id)).filter((n) => n && !isDown(n, g.clock.total));
    const officers = people.filter((n) => this.isOfficer(n) && n.id !== CHIEF);
    const pos = { map: e.map || g.player.map, x: e.x ?? g.player.x, y: e.y ?? g.player.y };
    if (officers.length) {
      if (this.bribed() && sev < 10) {
        g.bark(officers[0], 'I didn\'t see anything. Chief\'s orders.');
        return;
      }
      if (this.lax() && sev <= 1) {
        g.bark(officers[0], 'Eh. Not worth the paperwork.');
        return;
      }
      this.raiseWanted(sev, `${officers[0].profile.shortName} saw that!`);
      for (const o of officers) this.startPursuit(o);
      return;
    }
    // the Sumps doesn't snitch: gang members and their customers never call the police
    if (people.some((n) => !this.isOfficer(n) && !n.profile.noSnitch)) this.placeCall(sev, pos);
  }

  /** A civilian phones it in. */
  placeCall(sev, pos) {
    const g = this.game;
    const s = this.state;
    if (this.bribed() && sev < 10) {
      g.notify('Someone called the police. Nobody is coming — Chief Order is looking the other way.', 'info');
      return;
    }
    if (this.lax() && sev <= 2) {
      g.notify('Someone called the police. Chief Order told them to file a form.', 'info');
      return;
    }
    // several witnesses to the same scene make one call (the worst crime they saw)
    const open = s.calls.find((c) => c.map === pos.map && Math.hypot(c.x - pos.x, c.y - pos.y) < 20 * 32 && c.at > g.clock.total);
    if (open) { open.sev = Math.max(open.sev, sev); return; }
    const delay = this.bribed() ? 240 : 8 + g.rng.int(0, 10);
    s.calls.push({ at: g.clock.total + delay, sev, ...pos });
    g.notify(this.bribed() ? 'Someone called the police about a killing. Even Chief Order can\'t sit on that for long…' : 'Someone is calling the police!', 'warn');
  }

  raiseWanted(sev, why) {
    const g = this.game;
    const s = this.state;
    const lvl = Math.max(s.wanted, this.levelFor(sev));
    const up = lvl > s.wanted;
    s.wanted = lvl;
    s.lastSeen = g.clock.total;
    if (up) {
      g.notify(`${why ? why + ' ' : ''}WANTED ${'★'.repeat(lvl)}${lvl >= 3 ? ' — they will shoot on sight.' : ''}`, 'warn');
      g.bus.emit('police:wanted', { level: lvl });
    }
  }

  /** Send the nearest free officers to a call. */
  respond(call) {
    const g = this.game;
    this.raiseWanted(call.sev, 'The police are responding to a call.');
    const officers = this.activeOfficers().filter((o) => o.activity !== 'sleep' || call.sev >= 10);
    const score = (o) => (o.map === call.map ? dist(o.x, o.y, call.x, call.y) / TILE : 400);
    officers.sort((a, b) => score(a) - score(b));
    for (const o of officers.slice(0, call.sev >= 10 ? 3 : call.sev >= 3 ? 2 : 1)) this.dispatch(o, call.map, call.x, call.y);
  }

  dispatch(npc, mapId, x, y) {
    const g = this.game;
    const map = g.maps.get(mapId);
    if (!map) return;
    let best = null;
    let bestD = Infinity;
    for (const [name, sp] of Object.entries(map.spots)) {
      const d = Math.hypot(sp.x * TILE - x, sp.y * TILE - y);
      if (d < bestD) { bestD = d; best = name; }
    }
    if (!best) return;
    npc.intent = { source: 'dispatch', activity: 'respond', spot: `${mapId}:${best}`, until: g.clock.total + 150 };
    npc.activity = 'respond';
    npc.arrived = false;
    g.npcSystem.plan(npc);
    g.bus.emit('police:dispatch', { npcId: npc.id, map: mapId, spot: best });
  }

  startPursuit(npc) {
    const g = this.game;
    if (!npc.pursuit) g.bark(npc, g.rng.pick(STOP));
    npc.pursuit = { lastSeen: g.realTime };
    npc.cuffT = 0;
    npc.path = null;
    npc.activity = 'pursue';
  }

  endPursuit(npc) {
    npc.pursuit = null;
    npc.cuffT = 0;
    npc.activity = 'idle';
    this.game.npcSystem.think(npc, true);
  }

  // ------------------------------------------------------------- per frame
  update(dt) {
    const g = this.game;
    const s = this.state;
    if (this.jailed() || g.combat.wrath) return;
    const p = g.player;
    const map = g.currentMap();
    for (const npc of this.activeOfficers()) {
      if (npc.map !== p.map || npc.hostile || npc.inDialogue || npc.activity === 'sleep') continue;
      if (s.wanted <= 0) {
        if (npc.pursuit) this.endPursuit(npc);
        continue;
      }
      const sees = g.canSee(npc, p.x, p.y, map, 10);
      if (sees) {
        if (!npc.pursuit) this.startPursuit(npc);
        npc.pursuit.lastSeen = g.realTime;
        s.lastSeen = g.clock.total;
      }
      if (!npc.pursuit) continue;
      if (g.realTime - npc.pursuit.lastSeen > LOSE_SIGHT_SECONDS) {
        g.bark(npc, 'Lost them…');
        this.endPursuit(npc);
        continue;
      }
      if (s.wanted >= 3) {
        // shoot on sight: hand over to the combat AI
        npc.pursuit = null;
        npc.hostile = { mode: 'fight', until: g.clock.total + 30 };
        npc.activity = 'fight';
        continue;
      }
      const dx = p.x - npc.x;
      const dy = p.y - npc.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < 30) {
        npc.moving = false;
        npc.cuffT = (npc.cuffT || 0) + dt;
        if (npc.cuffT >= CUFF_SECONDS) {
          this.arrest(npc);
          return;
        }
      } else {
        npc.cuffT = Math.max(0, (npc.cuffT || 0) - dt * 2);
        g.combat.steer(npc, dx / d, dy / d, PURSUE_SPEED, dt, true);
      }
    }
  }

  /** The cuffing bar shown over the player (0–1), or 0. */
  cuffProgress() {
    let best = 0;
    for (const npc of this.game.npcs.values()) if (npc.cuffT) best = Math.max(best, npc.cuffT / CUFF_SECONDS);
    return clamp(best, 0, 1);
  }

  // ------------------------------------------------------------ per minute
  minuteTick() {
    const g = this.game;
    const s = this.state;
    const now = g.clock.total;
    // calls come due
    const due = s.calls.filter((c) => c.at <= now);
    if (due.length) {
      s.calls = s.calls.filter((c) => c.at > now);
      if (!this.jailed()) for (const c of due) this.respond(c);
    }
    // dispatched officers give up after a while
    for (const npc of g.npcs.values()) if (npc.intent?.source === 'dispatch' && now >= npc.intent.until) { npc.intent = null; g.npcSystem.think(npc, true); }
    // Wanted lapses when nobody has seen you for a while
    if (s.wanted > 0 && !this.jailed() && now - s.lastSeen > WANTED_LAPSE[s.wanted] && !this.activeOfficers().some((o) => o.pursuit)) {
      s.wanted = 0;
      g.notify('The police seem to have lost interest in you. For now.', 'good');
      g.bus.emit('police:wanted', { level: 0 });
    }
    // a clean day takes a point off your record
    if (g.clock.day > s.lastDecayDay) {
      s.lastDecayDay = g.clock.day;
      if (s.lastCrimeDay < g.clock.day - 1 && s.record > 0) s.record -= 1;
    }
    // sentence served (e.g. by waiting it out)
    if (s.jail && now >= s.jail.until && g.player.map === JAIL_MAP) this.release();
  }

  // --------------------------------------------------- bribes and fines
  bribePrice() {
    return 40 + this.state.record * 8;
  }

  finePrice() {
    return 20 * this.state.wanted + this.state.record * 3;
  }

  bribe() {
    const g = this.game;
    const price = this.bribePrice();
    if (g.player.money < price) return { ok: false, text: 'You can\'t afford that.' };
    g.player.money -= price;
    g.bus.emit('money:changed', { delta: -price, total: g.player.money });
    this.state.bribedUntilDay = g.clock.day + BRIBE_DAYS;
    g.setFlag('police_bribed', true);
    const chief = g.npcs.get(CHIEF);
    if (chief) remember(chief, { text: `${g.player.name} bought ${BRIBE_DAYS} days of my looking the other way.`, tag: 'bribed', about: 'player', importance: 6 }, g.clock.total);
    return { ok: true, text: `Paid ${price} obols. The police will look the other way until the end of Day ${this.state.bribedUntilDay}.` };
  }

  payFine() {
    const g = this.game;
    const price = this.finePrice();
    if (g.player.money < price) return { ok: false, text: 'You can\'t afford the fine.' };
    g.player.money -= price;
    g.bus.emit('money:changed', { delta: -price, total: g.player.money });
    this.state.wanted = 0;
    this.state.calls = [];
    for (const o of this.activeOfficers()) { if (o.pursuit) this.endPursuit(o); if (o.intent?.source === 'dispatch') o.intent = null; o.hostile = null; }
    g.bus.emit('police:wanted', { level: 0 });
    return { ok: true, text: `Fine paid: ${price} obols. Your warrant has been "misplaced".` };
  }

  // ------------------------------------------------------------- arrest
  /** Press G near an officer while Wanted. */
  surrender() {
    const g = this.game;
    if (this.jailed()) return { ok: false, text: '' };
    if (this.state.wanted <= 0) return { ok: false, text: 'Nobody is trying to arrest you.' };
    const near = this.activeOfficers().find((o) => o.map === g.player.map && dist(o.x, o.y, g.player.x, g.player.y) < 8 * TILE);
    if (!near) return { ok: false, text: 'There\'s no officer close enough to surrender to.' };
    g.bark(near, 'Smart choice. Hands behind your back.');
    this.arrest(near, true);
    return { ok: true, text: 'You put your hands up.' };
  }

  arrest(officer, surrendered = false) {
    const g = this.game;
    if (officer) remember(officer, { text: `Arrested ${g.player.name}.`, tag: 'arrested_player', about: 'player', importance: 6 }, g.clock.total);
    g.bus.emit('police:arrest', { by: officer?.id || null, surrendered });
    this.sendToJail(surrendered ? 'surrendered' : 'arrested');
  }

  sentenceHours() {
    return clamp(Math.round(4 + this.state.record * 2), 4, 168);
  }

  /** Arrested, beaten, or struck down: everything ends in a cell. */
  sendToJail(reason) {
    const g = this.game;
    const s = this.state;
    const p = g.player;
    // confiscate weapons, ammunition, stolen goods and any jail keys
    const evidence = {};
    for (const [id, n] of Object.entries(p.inventory || {})) {
      const def = g.content.items[id];
      if (!n || !def) continue;
      if (def.weapon || def.category === 'ammo' || p.stolen?.[id] || def.tags?.includes('contraband') || id === 'item_jail_keys') {
        evidence[id] = n;
        g.inventory.remove(id, n);
      }
    }
    p.equipped = null;
    const locker = g.world.containers.ct_evidence;
    if (locker) for (const [id, n] of Object.entries(evidence)) if (g.content.items[id].weapon || g.content.items[id].category === 'ammo') locker.items[id] = (locker.items[id] || 0) + n;
    const hours = this.sentenceHours();
    s.jail = { since: g.clock.total, until: g.clock.total + hours * 60, reason, dig: 0, evidence, trayDay: 0 };
    s.wanted = 0;
    s.calls = [];
    s.arrests += 1;
    for (const npc of g.npcs.values()) {
      npc.hostile = null;
      npc.pursuit = null;
      npc.cuffT = 0;
      if (npc.intent?.source === 'dispatch') npc.intent = null;
    }
    for (const f of ['jail_cell_open', 'jail_stairs_open', 'jail_tunnel_open']) g.setFlag(f, false);
    g.combat.reloading = null;
    p.health = Math.max(p.health, reason === 'killed' || reason === 'wrath' ? 60 : p.health);
    g.changeMap(JAIL_MAP, 'cell_a');
    g.bus.emit('police:jailed', { reason, hours });
    const why = { arrested: 'You\'ve been arrested.', surrendered: 'You came quietly.', killed: 'You wake up behind bars, patched up by the precinct doctor.', wrath: 'You come to on a cold cot, behind bars, smelling of ink.' }[reason] || 'You\'re in jail.';
    g.notify(`${why} Sentence: ${hours} hours. (Lie on the cot to serve it — or find another way out.)`, 'warn');
  }

  hoursLeft() {
    const j = this.state.jail;
    return j ? Math.max(0, Math.ceil((j.until - this.game.clock.total) / 60)) : 0;
  }

  serveSentence() {
    const g = this.game;
    const j = this.state.jail;
    if (!j) return { ok: false };
    const mins = Math.max(0, Math.ceil(j.until - g.clock.total));
    g.skipTime(mins);
    if (this.state.jail) this.release();
    return { ok: true, text: 'You do your time.' };
  }

  release() {
    const g = this.game;
    const s = this.state;
    const j = s.jail;
    if (!j) return;
    s.jail = null;
    s.record = Math.floor(s.record / 2);
    s.wanted = 0;
    // your weapons back, if they're still in the locker
    const locker = g.world.containers.ct_evidence;
    for (const [id, n] of Object.entries(j.evidence || {})) {
      const def = g.content.items[id];
      if (!(def?.weapon || def?.category === 'ammo')) continue;
      const have = Math.min(n, locker?.items[id] || 0);
      if (have > 0) {
        locker.items[id] -= have;
        g.inventory.add(id, have, { silent: true });
      }
    }
    g.changeMap('police_station', 'release');
    g.bus.emit('police:released', {});
    g.notify('Sentence served. Your belongings are returned (the legal ones). Your record is half what it was.', 'good');
  }

  /** Leaving the cell block while serving time — however you managed it. */
  checkEscape(mapId) {
    const g = this.game;
    const s = this.state;
    if (!s.jail || mapId === JAIL_MAP) return;
    const how = g.getFlag('jail_escape_method') || 'stairs';
    s.jail = null;
    s.escapes += 1;
    for (const f of ['jail_cell_open', 'jail_stairs_open', 'jail_tunnel_open', 'jail_escape_method']) g.setFlag(f, false);
    g.bus.emit('police:escaped', { how });
    if (how === 'bribe') {
      // Jury files it as a clerical error: no warrant, but no gear back either
      g.notify('You stroll out past the front desk. Officially you were "released early for good behaviour". Your gear is still in the evidence locker.', 'warn');
      return;
    }
    this.onCrime({ fact: 'jailbreak', witnesses: [], map: mapId, x: g.player.x, y: g.player.y });
    this.raiseWanted(8, 'JAILBREAK!');
    g.setFlag('escaped_jail', (g.getFlag('escaped_jail') || 0) + 1);
    const lines = {
      tunnel: 'You squeeze through the tunnel into the old sewer and come up in the Sumps, filthy and free.',
      vent: 'You crawl through the vent, drop into the harbour drain and come out by the docks.',
      stairs: 'You walk up the stairs and out of the precinct as if you belong there. You do not.',
    };
    g.notify(`${lines[how] || lines.stairs} Your gear is still in the evidence locker.`, 'warn');
  }

  // ---------------------------------------------------------------- jail props
  guard() {
    const g = this.game;
    const h = g.npcs.get(GUARD);
    return h && h.map === JAIL_MAP && !isDown(h, g.clock.total) ? h : null;
  }

  night() {
    const m = this.game.clock.minuteOfDay;
    return m >= 22 * 60 || m < 5 * 60;
  }

  /** Interactions with the cell's props (interact kind 'jail'). */
  jailInteract(prop) {
    const g = this.game;
    const action = prop.interact.action;
    const j = this.state.jail;
    if (!j && action !== 'whisper') return { type: 'message', text: prop.examine || 'Nothing to do here — you\'re not a prisoner. Right now.' };
    switch (action) {
      case 'serve':
        return {
          type: 'choices', title: 'The cot', text: `${this.hoursLeft()} hours left on your sentence.`,
          options: [{ label: 'Lie down and serve your time', call: ['police', 'jailAction', 'serve'] }, { label: 'Not yet', call: ['police', 'jailAction', 'none'] }],
        };
      case 'tray':
        if (j.trayDay === g.clock.day) return { type: 'message', text: 'The tray is empty. Breakfast was gruel. Lunch was the memory of gruel.' };
        j.trayDay = g.clock.day;
        if (!g.inventory.count('item_spoon')) {
          g.inventory.add('item_spoon', 1);
          return { type: 'message', text: 'Lukewarm gruel. Nobody notices when you keep the spoon.' };
        }
        return { type: 'message', text: 'More gruel. You already have a spoon. You keep that quiet.' };
      case 'dig': return this.dig();
      case 'vent': return this.vent();
      case 'whisper': return { type: 'dialogue', npcId: CELLMATE };
      case 'bars': {
        const guard = this.guard();
        const opts = [];
        if (guard && guard.activity === 'sleep') opts.push({ label: `Reach through the bars for ${guard.profile.shortName}'s keys (Finesse ${Math.round(this.reachChance() * 100)}%)`, call: ['police', 'jailAction', 'keys'] });
        if (guard && guard.activity !== 'sleep') opts.push({ label: `Whisper to ${guard.profile.shortName}: "${this.guardPrice()} obols says this door is unlocked."`, call: ['police', 'jailAction', 'bribeGuard'] });
        opts.push({ label: 'Rattle the bars', call: ['police', 'jailAction', 'rattle'] });
        return { type: 'choices', title: 'Cell bars', text: guard ? (guard.activity === 'sleep' ? `${guard.profile.shortName} is snoring at the desk. His keys hang from the back of his chair.` : `${guard.profile.shortName} is at the desk, doing a crossword badly.`) : 'Nobody is at the guard desk. The keys are gone with whoever left.', options: opts };
      }
      default:
        return { type: 'message', text: prop.examine || '' };
    }
  }

  reachChance() {
    return clamp(0.3 + this.game.stat('finesse') * 0.08, 0.1, 0.85);
  }

  guardPrice() {
    return 60 + this.state.record * 2;
  }

  /** Called from the choices panel: ['police', 'jailAction', name]. */
  jailAction(name) {
    const g = this.game;
    const j = this.state.jail;
    if (!j) return { ok: false, text: '' };
    const guard = this.guard();
    switch (name) {
      case 'serve': return this.serveSentence();
      case 'rattle':
        if (guard) g.bark(guard, guard.activity === 'sleep' ? '…mmf… five more minutes…' : 'Knock it off.');
        return { ok: true, text: 'You rattle the bars. It\'s very satisfying and achieves nothing.' };
      case 'keys': {
        if (!guard || guard.activity !== 'sleep') return { ok: false, text: 'He\'s awake.' };
        if (g.rng.next() < this.reachChance()) {
          g.inventory.add('item_jail_keys', 1);
          g.setFlag('jail_escape_method', 'stairs');
          return { ok: true, text: 'Your fingers close on the key ring. Slowly… slowly… got them. Hugh snores on.' };
        }
        guard.activity = 'work';
        g.bark(guard, 'HEY! Hands in the cell!');
        this.extend(12, `${guard.profile.shortName} caught you reaching for his keys`);
        return { ok: false, text: 'The keys jingle. Hugh snorts awake. Twelve more hours.' };
      }
      case 'bribeGuard': {
        if (!guard || guard.activity === 'sleep') return { ok: false, text: 'Nobody to bribe.' };
        if (this.state.officersKilled > 0) return { ok: false, text: `${guard.profile.shortName}: "You killed a cop. There isn't enough money in Halvermouth."` };
        const price = this.guardPrice();
        if (g.player.money < price) return { ok: false, text: `${guard.profile.shortName}: "${price}. Not a penny less. Come back when you've got it — oh wait, you can't."` };
        g.player.money -= price;
        g.bus.emit('money:changed', { delta: -price, total: g.player.money });
        g.setFlag('jail_cell_open', true);
        g.setFlag('jail_stairs_open', true);
        g.setFlag('jail_escape_method', 'bribe');
        remember(guard, { text: `Took ${price} obols to leave ${g.player.name}'s cell unlocked.`, tag: 'took_bribe', about: 'player', importance: 6 }, g.clock.total);
        return { ok: true, text: `${guard.profile.shortName} pockets the ${price} obols, unlocks your door and the stairwell, and becomes extremely interested in his crossword.` };
      }
      default:
        return { ok: true, text: '' };
    }
  }

  extend(hours, why) {
    const j = this.state.jail;
    if (!j) return;
    j.until += hours * 60;
    this.game.notify(`${why}: +${hours} hours on your sentence.`, 'warn');
  }

  dig() {
    const g = this.game;
    const j = this.state.jail;
    if (g.getFlag('jail_tunnel_open')) {
      g.setFlag('jail_escape_method', 'tunnel');
      g.changeMap('halvermouth', 'sumps_gate');
      return { type: 'none' };
    }
    if (!g.inventory.count('item_spoon')) return { type: 'message', text: 'The brick is loose, but you can\'t dig mortar with your fingernails. Something from the meal tray, perhaps.' };
    if (!this.night()) return { type: 'message', text: 'Too many people about. Scraping at a wall in broad daylight is the kind of thing guards notice. Wait for night (22:00–05:00).' };
    const guard = this.guard();
    if (guard && guard.activity !== 'sleep' && g.rng.chance(0.5)) {
      g.inventory.remove('item_spoon', 1);
      g.bark(guard, 'What\'s that scraping? Give me that spoon.');
      this.extend(12, `${guard.profile.shortName} heard you digging`);
      return { type: 'message', text: 'Hugh confiscates your spoon. (Tip: dig while he naps, 01:00–04:00.)' };
    }
    g.skipTime(60);
    j.dig += 1;
    if (j.dig >= 4) {
      g.setFlag('jail_tunnel_open', true);
      return { type: 'message', text: 'The brick slides out — and behind it, the darkness of the old sewer. A way out. (Use the hole to crawl through.)' };
    }
    return { type: 'message', text: `An hour of quiet scraping. The mortar crumbles. (${j.dig}/4)` };
  }

  vent() {
    const g = this.game;
    if (!g.getFlag('petty_vent_tip')) return { type: 'message', text: 'A rusty vent screwed shut. It looks like it goes somewhere — but where, and how would you open it?' };
    if (!g.inventory.count('item_bent_fork')) return { type: 'message', text: 'The screws won\'t turn with your fingers. Petty said something about a fork.' };
    g.setFlag('jail_escape_method', 'vent');
    g.inventory.remove('item_bent_fork', 1);
    g.changeMap('halvermouth', 'docks_quay');
    return { type: 'none' };
  }

  /** Petty Larson's deal (effect { police: { pettyDeal: true } }). */
  pettyDeal(payWith) {
    const g = this.game;
    if (payWith === 'money') {
      g.player.money = Math.max(0, g.player.money - 25);
      g.bus.emit('money:changed', { delta: -25, total: g.player.money });
    } else if (payWith) g.inventory.remove(payWith, 1);
    g.inventory.add('item_bent_fork', 1);
    g.setFlag('petty_vent_tip', true);
  }
}
