// Bank robbery (v0.79.0): game.robbery — the First Bank of Halvermouth (the central bank) and the Lariat State Bank can be robbed, by a hold-up
// in opening hours or a break-in at night, for a *defined quantity of physical valuables* (notes and gold bars) from the vault's stock.
//
// One explicit state machine for each bank (src/corp/robbery.js): normal → alert → robbery → police → recovery → reopening → normal. The loot is
// paid once for a robbery and cannot be paid again by pressing the vault twice, by reloading, or by an interrupted transition: the only way
// to be paid again is for the bank to have come all the way round, reopened and restocked. The police, witnesses, the wanted level and the
// bank's temporary closure are the consequences; the news and a bounded market reaction (a premium on government bond yields, central bank only)
// are public. NOTHING HERE TOUCHES ANYONE'S FINANCIAL STANDING: this file reads and writes no loan, rating, valuation, ranking, record or
// account of the corporate system, and the corporate system never reads it (the market premium is left out of what your holdings secure).
// See tests/robbery_separation.test.mjs. State: game.world.robbery, created the first time a bank is entered by someone who is not a customer.
import { ROBBERY as R, BAR_VALUE } from '../content/robbery.js';
import { step, lootOf, restockOf, isFull, premiumOf } from '../corp/robbery.js';
import { inWindow } from '../world/clock.js';

const money = (n) => Math.round(n).toLocaleString();
const IDS = Object.keys(R.banks);

export class Robbery {
  constructor(game) {
    this.game = game;
  }

  get g() { return this.game; }
  get now() { return this.g.clock.total; }
  get day() { return this.g.clock.day; }
  peek() { return this.g.world.robbery || null; }
  ensure() { return (this.g.world.robbery ||= { v: 1, banks: {}, events: [], news: [], count: 0 }); }
  cfg(id) { return R.banks[id]; }
  full(id) { return this.cfg(id).stock; }

  /** A bank's record (created, full, the first time it is needed). */
  rec(id) {
    const w = this.ensure();
    return (w.banks[id] ||= { state: 'normal', since: 0, why: null, method: null, vaultOpenAt: null, vaultShutAt: null, alarmAt: null, alarmed: false, sealedAt: null, looted: false, number: 0, stock: { ...this.full(id) }, taken: { cash: 0, gold: 0 }, closedUntil: 0, restockDay: 0, last: null, history: [] });
  }
  state(id) { return this.peek()?.banks[id]?.state || 'normal'; }

  // ------------------------------------------------------------- the player and the room
  inHall(id) { return this.g.player.map === this.cfg(id).hall; }
  armed() { const it = this.g.player.equipped; return Boolean(it && this.g.content.items[it]?.tags?.includes('gun')); }
  inHours(id) { const h = this.cfg(id).hours; return inWindow(this.g.clock.minuteOfDay, h.from, h.to); }
  /** Open to the public: in its hours and not shut for an investigation. */
  openNow(id) { return this.inHours(id) && !['recovery', 'reopening'].includes(this.state(id)); }
  sealed(id) { return ['recovery', 'reopening'].includes(this.state(id)); }

  /** Why the door is shut to the public for this bank, or null (hours are the door's own business). */
  closedReason(id) {
    const s = this.peek()?.banks[id];
    if (!s || !this.sealed(id)) return null;
    return `${this.cfg(id).name}: CLOSED. Police tape across the door and a notice — "Closed during the investigation. Reopens day ${s.closedUntil}." The vault is sealed.`;
  }

  log(text) {
    const w = this.ensure();
    w.news.unshift({ day: this.day, text });
    w.news = w.news.slice(0, 12);
    this.g.tablet.post('news', text, 'event');
  }

  // ------------------------------------------------------------- the state machine
  go(id, event) {
    const s = this.rec(id);
    const to = step(s.state, event);
    if (!to) return false;
    s.state = to; s.since = this.now;
    this.g.bus.emit('robbery:state', { bank: id, state: to, event });
    return true;
  }

  warn(id, why) {
    if (!this.go(id, 'warn')) return false;
    const s = this.rec(id);
    s.why = why;
    s.alarmed = false;
    if (why === 'intruder') { s.alarmAt = this.now + R.breakInAlarm; this.g.notify('A silent alarm trips somewhere in the walls. You do not have long.', 'warn'); }
    else { const guard = this.g.npcs.get(this.cfg(id).guards[0]); if (guard) this.g.bark(guard, 'Easy, friend. Put that away.'); this.g.notify(`${this.cfg(id).name}: the guard has seen your gun.`, 'warn'); }
    return true;
  }

  standDown(id) {
    const s = this.rec(id);
    if (!this.go(id, 'stand_down')) return false;
    s.why = null; s.alarmAt = null;
    return true;
  }

  /** Staff in the hall at the moment of a hold-up: guards stand and fight, the rest run. */
  frighten(id) {
    const g = this.g;
    for (const sid of this.cfg(id).staff) {
      const n = g.npcs.get(sid);
      if (n && n.map === this.cfg(id).hall && !n.dead) g.combat.react(n, null);
    }
  }

  // ------------------------------------------------------------- the two ways in
  /**
   * The hold-up: in opening hours, with a gun drawn, at the counter or the vault. The staff are frightened, someone hits the alarm, and under
   * the gun the vault is opened after a few minutes. Returns { ok, text }.
   */
  holdup(id) {
    const g = this.g;
    const s = this.rec(id);
    if (!this.inHall(id)) return { ok: false, text: 'You are not in the bank.' };
    if (this.sealed(id)) return { ok: false, text: this.closedReason(id) };
    if (!this.inHours(id)) return { ok: false, text: 'The bank is closed. There is nobody here to hold up.' };
    if (!this.armed()) return { ok: false, text: 'You would need a gun in your hand to make anyone open a vault. (A staff member looks at you politely.)' };
    if (s.state === 'normal') this.warn(id, 'drawn');
    if (s.state === 'robbery') return { ok: true, text: s.looted ? 'The vault is open and empty. Time to go.' : `"Just a moment — the dials —" The vault will be open in ${Math.max(0, s.vaultOpenAt - this.now)} minutes.` };
    if (!this.go(id, 'strike')) return { ok: false, text: 'Not now.' };
    s.method = 'holdup'; s.number += 1; s.looted = false; s.alarmed = false;
    s.vaultOpenAt = this.now + R.complyMinutes; s.alarmAt = this.now + R.holdupAlarm;
    this.crime(id);
    this.frighten(id);
    return { ok: true, text: `"EVERYBODY DOWN. Open the vault." The teller's hands shake on the dials: it will take about ${R.complyMinutes} minutes. Somebody is going for the alarm.` };
  }

  /** The break-in: in a closed bank, the vault's time-lock is worked through (a number of minutes), the silent alarm already running. */
  crack(id) {
    const s = this.rec(id);
    if (!this.inHall(id)) return { ok: false, text: 'You are not in the bank.' };
    if (this.sealed(id)) return { ok: false, text: 'The vault is sealed by the investigation: the time-lock is set to the day the bank reopens.' };
    if (this.inHours(id)) return { ok: false, text: 'The bank is open. The vault is not for breaking into in front of customers.' };
    if (s.state === 'normal') this.warn(id, 'intruder');
    if (s.state === 'robbery') return { ok: true, text: s.looted ? 'Open and empty. Go.' : `You are still at the dials: about ${Math.max(0, s.vaultOpenAt - this.now)} minutes to go.` };
    if (!this.go(id, 'strike')) return { ok: false, text: 'Not now.' };
    s.method = 'breakin'; s.number += 1; s.looted = false;
    s.vaultOpenAt = this.now + R.crackMinutes;
    s.alarmAt = s.alarmAt ?? this.now + R.breakInAlarm;
    return { ok: true, text: `You put your ear to the time-lock and start on the dials. About ${R.crackMinutes} minutes, if nobody comes. The silent alarm is already ticking.` };
  }

  crime(id) {
    const g = this.g;
    const c = this.cfg(id);
    g.reportCrime({ fact: 'fact_player_bank_robbery', map: c.hall, x: g.player.x, y: g.player.y, radius: 14 });
  }

  // ------------------------------------------------------------- the vault
  /** E at the vault: the one place loot is paid, once per robbery. */
  vault(id) {
    const g = this.g;
    const s = this.peek()?.banks[id];
    const name = this.cfg(id).name;
    if (this.sealed(id)) return { type: 'message', text: this.closedReason(id) };
    if (!s || s.state === 'normal' || s.state === 'alert') {
      // armed, in the bank's hours: a hold-up; inside after hours with the alarm already running: the time-lock; otherwise it is only a door
      if (this.inHours(id) && this.armed()) { const r = this.holdup(id); return { type: 'message', text: r.text }; }
      if (s?.state === 'alert' && s.why === 'intruder' && !this.inHours(id)) { const r = this.crack(id); return { type: 'message', text: r.text }; }
      return { type: 'message', text: 'The vault door: round, shiny, thick, and shut. A brass plate reads "TIME-LOCKED. NO ONE IS EVER ALONE WITH THIS DOOR." Nothing about it is for you.' };
    }
    if (s.state === 'recovery' || s.state === 'reopening') return { type: 'message', text: this.closedReason(id) };
    // robbery or police: in progress
    if (s.looted) return { type: 'message', text: `${name}: the vault stands open and empty. There is nothing left of what was meant to be taken. (A police siren, getting closer.)` };
    if (this.now < s.vaultOpenAt) return { type: 'message', text: `The time-lock is still turning. About ${s.vaultOpenAt - this.now} minutes.` };
    if (s.vaultShutAt && this.now > s.vaultShutAt) return { type: 'message', text: 'The vault has swung shut again: too late.' };
    const r = this.take(id);
    return { type: 'message', text: r.text };
  }

  /** Pay the haul, once. Idempotent: a second call (a repeated press, a reload, an interrupted transition) pays nothing. */
  take(id) {
    const g = this.g;
    const s = this.rec(id);
    if (!['robbery', 'police'].includes(s.state) || s.looted || this.now < (s.vaultOpenAt ?? Infinity)) return { ok: false, text: 'Nothing to take.' };
    s.looted = true; // first, so nothing below can run twice
    const got = lootOf(s.stock, this.cfg(id).haul);
    s.stock = { cash: s.stock.cash - got.cash, gold: s.stock.gold - got.gold };
    s.taken = { cash: got.cash, gold: got.gold };
    g.player.money += got.cash;
    g.bus.emit('money:changed', { delta: got.cash, total: g.player.money });
    if (got.gold) g.inventory.add('item_gold_bar', got.gold);
    const value = got.cash + got.gold * BAR_VALUE;
    const full = this.cfg(id).haul.cash + this.cfg(id).haul.gold * BAR_VALUE;
    s.last = { day: this.day, method: s.method, cash: got.cash, gold: got.gold };
    s.history.push(s.last);
    while (s.history.length > 10) s.history.shift();
    if (id === 'first') this.ensure().events.push({ day: this.day, share: value / full });
    this.log(`${this.cfg(id).name} was robbed ${s.method === 'holdup' ? 'in a hold-up' : 'in a night raid'}: ${money(got.cash)} obols and ${got.gold} gold bars taken from the vault. The police are on the scene.`);
    g.bus.emit('robbery:loot', { bank: id, cash: got.cash, gold: got.gold });
    return { ok: true, text: `You fill the bags: ${money(got.cash)} obols in notes and ${got.gold} gold bars. The siren is close. GO.`, cash: got.cash, gold: got.gold };
  }

  // ------------------------------------------------------------- the minute
  minuteTick() {
    const g = this.g;
    for (const id of IDS) {
      const hallHere = this.inHall(id);
      const s = this.peek()?.banks[id];
      if (!s && !hallHere) continue;
      const st = s?.state || 'normal';
      if (st === 'normal' && hallHere) {
        if (!this.inHours(id)) this.warn(id, 'intruder'); // a closed bank, and you in it
        else if (this.armed()) this.warn(id, 'drawn');
        continue;
      }
      if (!s) continue;
      if (st === 'alert') {
        if (s.why === 'drawn') {
          if (!hallHere || !this.armed()) this.standDown(id);
          else if (this.now - s.since >= R.warnMinutes) { const guard = g.npcs.get(this.cfg(id).guards[0]); if (guard && !guard.hostile) g.combat.react(guard, null); }
        } else if (s.why === 'intruder') {
          if (this.now >= s.alarmAt && !s.alarmed) this.alarm(id, 8);
          if (!hallHere && this.now - s.since >= 3) this.standDown(id);
        }
      } else if (st === 'robbery') {
        if (s.vaultOpenAt && s.looted === false && this.now >= s.vaultOpenAt + R.openMinutes) s.vaultShutAt = s.vaultOpenAt + R.openMinutes;
        if (this.now >= s.alarmAt && !s.alarmed) this.alarm(id, 12);
        if (s.alarmed) this.go(id, 'alarm');
      } else if (st === 'police') {
        if (this.now >= s.alarmAt + R.policeWindow) this.seal(id);
      } else if (st === 'recovery') {
        this.restock(id);
      } else if (st === 'reopening') {
        const h = this.cfg(id).hours;
        if (this.day >= s.closedUntil && inWindow(g.clock.minuteOfDay, h.from, h.to)) { this.go(id, 'open'); this.log(`${this.cfg(id).name} reopens. The vault is restocked and the guard is on the door.`); }
      }
    }
  }

  /** The silent alarm reaches the police. */
  alarm(id, sev) {
    const g = this.g;
    const s = this.rec(id);
    s.alarmed = true;
    const c = this.cfg(id);
    const pos = { map: c.hall, x: g.player.map === c.hall ? g.player.x : 5 * 32, y: g.player.map === c.hall ? g.player.y : 5 * 32 };
    g.police.placeCall(sev, pos, { fact: 'fact_player_bank_robbery', witnesses: [] });
  }

  /** The police have had their time on the scene: the bank is sealed for the investigation. */
  seal(id) {
    const s = this.rec(id);
    if (!this.go(id, 'seal')) return false;
    s.closedUntil = this.day + this.cfg(id).closeDays;
    s.sealedAt = this.now; s.restockDay = this.day;
    this.log(`${this.cfg(id).name} is shut for the investigation until day ${s.closedUntil}. The vault will be restocked from the treasury.`);
    return true;
  }

  /** In recovery, once a day: the vault is refilled a day's worth; when it is full and the days are up, the bank begins to reopen. */
  restock(id) {
    const s = this.rec(id);
    if (s.restockDay < this.day) { s.stock = restockOf(s.stock, this.full(id), this.cfg(id).restockPerDay); s.restockDay = this.day; }
    if (this.day >= s.closedUntil && isFull(s.stock, this.full(id))) this.go(id, 'restocked');
  }

  // ------------------------------------------------------------- what the world sees
  /** The market's reaction to a robbery of the central bank: a bounded premium on government bond yields (a rate; 0 with none). */
  premium(day = this.day) {
    const e = this.peek()?.events;
    return e?.length ? premiumOf(e, day, R.premium) : 0;
  }

  /** For the screens: each bank's state, its vault and its last robbery. Only facts. */
  view() {
    const out = {};
    for (const id of IDS) {
      const s = this.peek()?.banks[id];
      out[id] = { id, name: this.cfg(id).name, state: s?.state || 'normal', stock: s?.stock || { ...this.full(id) }, full: this.full(id), closedUntil: s?.closedUntil || 0, last: s?.last || null, robberies: s?.history.length || 0 };
    }
    return out;
  }
  news() { return this.peek()?.news || []; }
}
