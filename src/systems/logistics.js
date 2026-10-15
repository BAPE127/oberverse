// Ober & Sons Maritime (v0.21.0): the shipping company you buy from Captain
// Ober. Ports, a fleet of cargo ships, commercial contracts and voyages that
// sail the globe's sea lanes on the game clock. Content: src/content/logistics.js;
// docs: docs/LOGISTICS.md.
//
// Voyages are abstract and persistent: a voyage saves where it left from,
// where it's going, when it left and its pre-rolled events (delays), so a
// ship's position is always derived from the clock — never animated, never
// re-rolled — and survives saving and loading.
//
//   vessel.status: docked → loading → underway → docked (at the destination)
//                  docked → underway (repositioning)           · lost · retired
//   contract.status: available → accepted → loading → transit → delivered | failed
//
// Money moves exactly once and only here: the company and ports on purchase,
// a ship on purchase, a voyage's running costs and foreign port fees when it
// departs, the client's payment on delivery, upkeep each morning at 06:00
// (unpaid upkeep becomes arrears, which hold sailings until paid).
//
// State: game.world.logistics (created on first use; saves from before
// v0.21.0 get it fresh and unowned).
import { clamp } from '../core/util.js';
import { seaRoute, pointAlong } from '../world/seaRoutes.js';

const REPORTS_MAX = 80;
const LEDGER_DAYS = 30;

export const VESSEL_STATES = ['docked', 'loading', 'underway', 'lost', 'retired'];
/** Allowed status changes (a vessel is in exactly one place at a time). */
const TRANSITIONS = {
  docked: ['loading', 'underway', 'retired', 'lost'],
  loading: ['underway', 'docked', 'lost'],
  underway: ['docked', 'lost'],
  lost: [],
  retired: [],
};

export function freshLogistics() {
  return {
    owned: false, boughtDay: null,
    ports: {}, vessels: {}, nextVessel: 1,
    contracts: [], nextContract: 1, lastContractDay: 0, lastUpkeepDay: 0, arrears: 0,
    ledger: { revenue: 0, expenses: 0, days: [] },
    reports: [], nextReport: 1,
    display: { berths: [] },
  };
}

const fmtHours = (h) => (h >= 48 ? `${(h / 24).toFixed(1)} days` : `${Math.round(h)} h`);

export class Logistics {
  constructor(game) {
    this.game = game;
  }

  // ------------------------------------------------------------- content
  get cfg() {
    return this.game.content.logistics;
  }

  get L() {
    return this.cfg.rules;
  }

  get state() {
    const g = this.game;
    if (!g.world.logistics) g.world.logistics = freshLogistics();
    return g.world.logistics;
  }

  get owned() {
    return Boolean(this.game.world.logistics?.owned);
  }

  port(id) {
    return this.cfg.ports[id] || null;
  }

  portType(id) {
    return this.cfg.portTypes[this.port(id)?.type] || null;
  }

  model(id) {
    return this.cfg.ships[id] || null;
  }

  cls(model) {
    return this.cfg.classes[model.cls];
  }

  /** The sea route between two ports (cached), or null. */
  route(from, to) {
    const a = this.port(from);
    const b = this.port(to);
    if (!a || !b) return null;
    return seaRoute([a.lat, a.lon], [b.lat, b.lon], this.game.content.arms.countries);
  }

  /** Hours at sea for a ship over a distance. */
  sailHours(km, knots) {
    return km / (knots * 1.852) / this.L.seaTime;
  }

  // ------------------------------------------------------------- money
  spend(amount, why) {
    const g = this.game;
    if (amount <= 0) return;
    g.player.money -= amount;
    g.bus.emit('money:changed', { delta: -amount, total: g.player.money });
    this.book(0, amount, why);
  }

  earn(amount, why) {
    const g = this.game;
    if (amount <= 0) return;
    g.player.money += amount;
    g.bus.emit('money:changed', { delta: amount, total: g.player.money });
    this.book(amount, 0, why);
  }

  book(revenue, expenses) {
    const s = this.state;
    const day = this.game.clock.day;
    s.ledger.revenue += revenue;
    s.ledger.expenses += expenses;
    let d = s.ledger.days[0];
    if (!d || d.day !== day) {
      d = { day, revenue: 0, expenses: 0 };
      s.ledger.days.unshift(d);
      s.ledger.days.length = Math.min(s.ledger.days.length, LEDGER_DAYS);
    }
    d.revenue += revenue;
    d.expenses += expenses;
  }

  report(kind, text, notify = 'info') {
    const s = this.state;
    s.reports.unshift({ id: s.nextReport++, at: this.game.clock.total, kind, text });
    if (s.reports.length > REPORTS_MAX) s.reports.length = REPORTS_MAX;
    if (notify) this.game.tablet.post('ships', text, notify);
  }

  // ------------------------------------------------------------- the company
  /** What Captain Ober is selling (shown before you buy). */
  offer() {
    const L = this.L;
    const st = this.model(L.starterShip.model);
    return {
      company: L.company,
      price: L.price,
      ports: L.starterPorts.map((id) => this.port(id).name),
      ship: `${st.name} "${L.starterShip.name}" (${this.cls(st).name}, ${st.capacity} units)`,
      access: ['The logistics terminal (and the Ships app on your tablet)', 'The ship brokerage', 'Commercial shipping contracts'],
    };
  }

  /** Buy Ober & Sons: all or nothing. */
  buyCompany() {
    const g = this.game;
    const L = this.L;
    const s = this.state;
    if (s.owned) return { ok: false, text: `You already own ${L.company}.` };
    if (g.player.money < L.price) return { ok: false, text: `${L.company} costs ${L.price} obols. You have ${g.player.money}.` };
    // build everything first, then commit in one go
    const ports = {};
    for (const id of L.starterPorts) {
      if (!this.port(id)) return { ok: false, text: `Missing port ${id}.` };
      ports[id] = { id, since: g.clock.day, upgrades: [], shipyard: null };
    }
    const m = this.model(L.starterShip.model);
    if (!m) return { ok: false, text: 'Missing starter ship.' };
    this.spend(L.price, 'company');
    s.owned = true;
    s.boughtDay = g.clock.day;
    s.lastUpkeepDay = g.clock.day;
    s.ports = ports;
    s.display.berths = L.starterPorts.slice(0, L.physicalBerths);
    this.addVessel(L.starterShip.model, L.starterShip.port, L.starterShip.name);
    s.lastContractDay = g.clock.day;
    this.postContracts();
    g.setFlag('owns_shipping', true);
    this.report('company', `⚓ ${L.company} is yours: ${L.starterPorts.length} ports and the ${L.starterShip.name}. The logistics terminal is in the harbour office.`, 'good');
    g.bus.emit('logistics:bought', {});
    return { ok: true, text: `You bought ${L.company} for ${L.price} obols.` };
  }

  ownedPorts() {
    return Object.keys(this.state.ports);
  }

  ownsPort(id) {
    return Boolean(this.state.ports[id]);
  }

  buyPort(id) {
    const g = this.game;
    const s = this.state;
    const p = this.port(id);
    if (!s.owned) return { ok: false, text: 'You need a shipping company first.' };
    if (!p) return { ok: false, text: 'No such port.' };
    if (s.ports[id]) return { ok: false, text: `You already own ${p.name}.` };
    if (this.ownedPorts().length >= this.L.maxPorts) return { ok: false, text: `You can own at most ${this.L.maxPorts} ports.` };
    const price = this.portType(id).price;
    if (g.player.money < price) return { ok: false, text: `${p.name} costs ${price} obols.` };
    this.spend(price, 'port');
    s.ports[id] = { id, since: g.clock.day, upgrades: [], shipyard: null };
    const free = s.display.berths.length < this.L.physicalBerths;
    if (free) s.display.berths.push(id);
    this.report('port', `🏗 You bought ${p.name} (${this.portType(id).name}) for ${price} obols.`, 'good');
    return { ok: true, text: `${p.name} is yours.` };
  }

  /** Which owned port each of the Yards docks' three berths shows (doesn't change ownership). */
  setBerth(slot, portId) {
    const s = this.state;
    if (slot < 0 || slot >= this.L.physicalBerths) return { ok: false, text: 'No such berth.' };
    if (portId && !s.ports[portId]) return { ok: false, text: 'You don\'t own that port.' };
    const b = [...s.display.berths];
    while (b.length < this.L.physicalBerths) b.push(null);
    // a port appears at one berth at most
    for (let i = 0; i < b.length; i++) if (b[i] === portId) b[i] = null;
    b[slot] = portId || null;
    s.display.berths = b;
    return { ok: true };
  }

  // ------------------------------------------------------------- vessels
  vessels() {
    return Object.values(this.state.vessels).filter((v) => v.status !== 'retired');
  }

  vessel(id) {
    return this.state.vessels[id] || null;
  }

  addVessel(modelId, portId, name) {
    const s = this.state;
    const m = this.model(modelId);
    const id = `v${s.nextVessel++}`;
    const v = {
      id, name: String(name || m.name).trim().slice(0, 28) || m.name, model: modelId, kind: m.kind, cls: m.cls,
      status: 'docked', port: portId, voyage: null, contract: null, cargo: null,
      condition: 100, sailedKm: 0, components: [], appearance: { ...m.look }, visible: true, bought: this.game.clock.day, log: [],
    };
    s.vessels[id] = v;
    return v;
  }

  /** Effective stats (components will modify these in the shipyard update). */
  stats(v) {
    const m = this.model(v.model);
    return { capacity: m.capacity, speed: m.speed, range: m.range, reliability: m.reliability, opex: m.opex, upkeep: m.upkeep, tags: m.tags, size: this.cls(m).size, wear: this.cls(m).wear };
  }

  setStatus(v, to) {
    if (!TRANSITIONS[v.status]?.includes(to)) throw new Error(`vessel ${v.id}: ${v.status} → ${to} is not allowed`);
    v.status = to;
  }

  /** Ships at (or loading in) a port, and ships on their way there. */
  atPort(portId) {
    return this.vessels().filter((v) => (v.status === 'docked' || v.status === 'loading') && v.port === portId);
  }

  inbound(portId) {
    return this.vessels().filter((v) => v.status === 'underway' && v.voyage?.to === portId);
  }

  /** Can this ship berth at that port? (size and type; owned ports also by berths free). */
  berthCheck(v, portId, { arriving = true } = {}) {
    const p = this.port(portId);
    const pt = this.portType(portId);
    const st = this.stats(v);
    const m = this.model(v.model);
    const need = this.cls(m).needsPortType;
    if (!p) return 'no such port';
    if (need && p.type !== need) return `the ${m.name} only berths at ${this.cfg.portTypes[need].name.toLowerCase()}s`;
    if (st.size > pt.maxSize) return `${p.name} (${pt.name.toLowerCase()}) can't take a ship that size`;
    if (arriving && this.ownsPort(portId)) {
      const used = this.atPort(portId).filter((x) => x !== v).length + this.inbound(portId).filter((x) => x !== v).length;
      if (used >= pt.berths) return `${p.name}'s ${pt.berths} berths are all taken`;
    }
    return null;
  }

  rename(id, name) {
    const v = this.vessel(id);
    const n = String(name || '').trim().slice(0, 28);
    if (!v || !n) return { ok: false, text: 'Give it a name.' };
    v.name = n;
    return { ok: true };
  }

  setVisible(id, visible) {
    const v = this.vessel(id);
    if (!v) return { ok: false };
    v.visible = Boolean(visible);
    return { ok: true };
  }

  /** The dealership: a complete ship, delivered to one of your ports. */
  buyShip(modelId, portId, name) {
    const g = this.game;
    const s = this.state;
    const m = this.model(modelId);
    if (!s.owned) return { ok: false, text: 'You need a shipping company first.' };
    if (!m || !this.cfg.dealership.includes(modelId)) return { ok: false, text: 'That ship isn\'t for sale here.' };
    if (!this.ownsPort(portId)) return { ok: false, text: 'Deliver it to a port you own.' };
    const probe = { model: modelId, status: 'docked' };
    const why = this.berthCheck(probe, portId);
    if (why) return { ok: false, text: `Can't deliver there: ${why}.` };
    if (g.player.money < m.price) return { ok: false, text: `The ${m.name} costs ${m.price} obols. You have ${g.player.money}.` };
    this.spend(m.price, 'ship');
    const v = this.addVessel(modelId, portId, name);
    this.report('fleet', `🚢 The ${m.name} "${v.name}" is delivered to ${this.port(portId).name}.`, 'good');
    return { ok: true, vessel: v, text: `The ${v.name} is yours.` };
  }

  /** Repairs at a port that offers them (one you own, or a foreign one at 50% more). */
  repairQuote(v) {
    const m = this.model(v.model);
    const pts = 100 - v.condition;
    const foreign = !this.ownsPort(v.port);
    return Math.round(pts * m.price * this.L.repairPerPoint * (foreign ? 1.5 : 1));
  }

  repair(id) {
    const g = this.game;
    const v = this.vessel(id);
    if (!v || v.status !== 'docked') return { ok: false, text: 'It has to be docked.' };
    if (!this.portType(v.port).services.includes('repairs')) return { ok: false, text: `${this.port(v.port).name} has no repair yard.` };
    if (v.condition >= 100) return { ok: false, text: 'It\'s in perfect shape.' };
    const cost = this.repairQuote(v);
    if (g.player.money < cost) return { ok: false, text: `Repairs cost ${cost} obols.` };
    this.spend(cost, 'repairs');
    v.condition = 100;
    this.report('repair', `🔧 The ${v.name} is repaired at ${this.port(v.port).name} (${cost} obols).`, null);
    return { ok: true, text: `Repaired for ${cost} obols.` };
  }

  // ------------------------------------------------------------- voyages
  /** Everything about sending a ship from its port to another, without doing it. */
  plan(v, to, units = 0, from = v.port) {
    const st = this.stats(v);
    const reasons = [];
    if (v.status !== 'docked') reasons.push(`the ${v.name} isn't free (${v.status})`);
    if (from === to) reasons.push('it\'s already there');
    const r = this.route(from, to);
    if (!r) reasons.push('no sea route');
    const km = r?.km ?? 0;
    if (r && km > st.range) reasons.push(`${km} km is beyond its ${st.range} km range`);
    if (v.condition < this.L.minSailCondition) reasons.push(`its condition (${Math.round(v.condition)}%) is too poor to sail — repair it`);
    const berth = this.berthCheck(v, to);
    if (berth) reasons.push(berth);
    if (this.state.arrears > 0) reasons.push(`the harbourmasters are holding your ships until ${this.state.arrears} obols of unpaid upkeep are paid`);
    const load = units ? this.L.loadHoursBase + units * this.L.loadHoursPerUnit : 0;
    const hours = this.sailHours(km, st.speed);
    const days = hours / 24;
    const opex = Math.ceil(Math.max(0.25, days) * st.opex);
    const fees = (this.ownsPort(from) ? 0 : this.portType(from).fee) + (this.ownsPort(to) ? 0 : this.portType(to)?.fee || 0);
    return { ok: reasons.length === 0, reasons, km, hours, load, opex, fees, cost: opex + fees, route: r };
  }

  /** Pre-roll a voyage's delays (stored, so a reload can't change them). */
  rollEvents(v, km, base, depart) {
    const st = this.stats(v);
    const R = this.game.rng;
    const events = [];
    const legs = Math.max(1, Math.round(km / 1000));
    const p = (1 - st.reliability) * this.L.delayPerKkm * (v.condition < 50 ? 1.6 : 1) * (km / legs / 1000);
    const [h0, h1] = this.L.delayHours;
    for (let i = 0; i < legs; i++) {
      if (R.next() < p) events.push({ kind: 'delay', at: Math.round(depart + base * ((i + R.next()) / legs)), hours: Math.round(h0 + R.next() * (h1 - h0)), done: false, why: R.pick(['a gale', 'engine trouble', 'fog', 'a crew dispute', 'a customs inspection', 'a pilot who never showed up']) });
    }
    return events;
  }

  startVoyage(v, to, { purpose, contract = null, depart }) {
    const pl = this.plan(v, to);
    const base = Math.max(30, Math.round(pl.hours * 60));
    const events = this.rollEvents(v, pl.km, base, depart);
    v.voyage = { from: v.port, to, km: pl.km, depart, base, arrive: depart + base, purpose, contract, events };
    this.setStatus(v, 'underway');
    v.port = null;
    return v.voyage;
  }

  /** Send an idle ship to another port (no cargo). */
  sail(id, to) {
    const g = this.game;
    const v = this.vessel(id);
    if (!v) return { ok: false, text: 'No such ship.' };
    if (!this.port(to)) return { ok: false, text: 'No such port.' };
    const pl = this.plan(v, to);
    if (!pl.ok) return { ok: false, text: `Can't sail: ${pl.reasons[0]}.` };
    if (g.player.money < pl.cost) return { ok: false, text: `The passage costs ${pl.cost} obols (running costs and port fees).` };
    const from = v.port;
    this.spend(pl.cost, 'voyage');
    this.startVoyage(v, to, { purpose: 'reposition', depart: g.clock.total });
    this.report('voyage', `⛴ The ${v.name} sails from ${this.port(from).name} for ${this.port(to).name} — ${pl.km} km, about ${fmtHours(pl.hours)}.`, null);
    return { ok: true, text: `The ${v.name} is under way.` };
  }

  /** Where a ship is now: { lat, lon, f (voyage fraction), port? }. Derived from the clock. */
  position(v) {
    if (v.status !== 'underway' || !v.voyage) {
      const p = this.port(v.port);
      return p ? { lat: p.lat, lon: p.lon, f: 0, port: v.port } : null;
    }
    const V = v.voyage;
    const now = this.game.clock.total;
    let held = 0;
    for (const e of V.events) if (e.at <= now) held += Math.min(e.hours * 60, now - e.at);
    const f = clamp((now - V.depart - held) / V.base, 0, 1);
    const r = this.route(V.from, V.to);
    const [lat, lon] = r ? pointAlong(r, f) : [this.port(V.to).lat, this.port(V.to).lon];
    return { lat, lon, f };
  }

  // ------------------------------------------------------------- contracts
  contracts(status = null) {
    return this.state.contracts.filter((c) => !status || (Array.isArray(status) ? status.includes(c.status) : c.status === status));
  }

  contract(id) {
    return this.state.contracts.find((c) => c.id === id) || null;
  }

  /** A day's new offers from your ports (weighted towards work your fleet can do). */
  postContracts() {
    const g = this.game;
    const s = this.state;
    const R = g.rng;
    const L = this.L;
    const fleet = this.vessels().filter((v) => v.kind === 'cargo');
    const tags = new Set(fleet.flatMap((v) => this.stats(v).tags));
    const maxCap = Math.max(20, ...fleet.map((v) => this.stats(v).capacity));
    const portIds = Object.keys(this.cfg.ports);
    const types = Object.entries(this.cfg.contractTypes);
    for (const from of this.ownedPorts()) {
      for (let k = 0; k < L.contractsPerPort; k++) {
        if (this.contracts('available').length >= L.maxAvailable) return;
        const weights = types.map(([, t]) => (t.needs && !tags.has(t.needs) ? 0.4 : 3) * ((t.minUnits || 0) > maxCap ? 0.2 : 1));
        let r = R.next() * weights.reduce((a, b) => a + b, 0);
        let [typeId, T] = types[0];
        for (let i = 0; i < types.length; i++) { r -= weights[i]; if (r <= 0) { [typeId, T] = types[i]; break; } }
        // the first offer at each port is always one your fleet can carry
        const easy = k === 0;
        if (easy && T.needs && !tags.has(T.needs)) { typeId = 'general'; T = this.cfg.contractTypes.general; }
        let to = null;
        let route = null;
        for (let tries = 0; tries < 12 && !route; tries++) {
          const cand = portIds[Math.floor(R.next() * portIds.length)];
          if (cand === from) continue;
          const rr = this.route(from, cand);
          if (!rr || rr.km < 300 || rr.km > (easy ? 9000 : 26000)) continue;
          to = cand;
          route = rr;
        }
        if (!route) continue;
        const [u0, u1] = T.units;
        let units = Math.round(u0 + R.next() * (u1 - u0));
        if (easy) units = Math.min(units, maxCap);
        const pay = Math.round(T.base + units * T.rate * (route.km / 1000));
        const refHours = this.sailHours(route.km, 14) + L.loadHoursBase + units * L.loadHoursPerUnit;
        const deadline = g.clock.total + Math.round((refHours * T.slack + 12) * 60);
        s.contracts.push({
          id: `c${s.nextContract++}`, type: typeId, client: T.clients[Math.floor(R.next() * T.clients.length)], units, from, to, km: route.km,
          pay, deadline, offered: g.clock.day, expiresDay: g.clock.day + L.offerDays, status: 'available', vessel: null, depart: null, arrive: null, result: null,
        });
      }
    }
  }

  accept(id) {
    const c = this.contract(id);
    if (!c || c.status !== 'available') return { ok: false, text: 'That contract isn\'t on offer.' };
    if (c.deadline <= this.game.clock.total) return { ok: false, text: 'That contract has run out of time.' };
    c.status = 'accepted';
    return { ok: true, text: `Accepted: ${this.cfg.clients[c.client].name}. Assign a ship before ${this.when(c.deadline)}.` };
  }

  /** Give up an accepted contract (the client charges a penalty). */
  abandon(id) {
    const c = this.contract(id);
    if (!c || c.status !== 'accepted') return { ok: false, text: 'Only an accepted contract that hasn\'t loaded can be cancelled.' };
    const fee = Math.round(c.pay * this.L.cancelPenalty);
    this.spend(Math.min(fee, Math.max(0, this.game.player.money)), 'penalty');
    c.status = 'failed';
    c.result = { paid: 0, penalty: fee, note: 'cancelled' };
    this.report('contract', `✖ You cancelled the ${this.cfg.contractTypes[c.type].name.toLowerCase()} contract for ${this.cfg.clients[c.client].name} (penalty ${fee}).`, 'warn');
    return { ok: true, text: `Cancelled (penalty ${fee} obols).` };
  }

  /** Everything about putting a ship on a contract, without doing it. */
  quote(cid, vid) {
    const c = this.contract(cid);
    const v = this.vessel(vid);
    if (!c || !v) return { ok: false, reasons: ['nothing to quote'] };
    const st = this.stats(v);
    const T = this.cfg.contractTypes[c.type];
    const reasons = [];
    if (!['available', 'accepted'].includes(c.status)) reasons.push('the contract is no longer open');
    if (v.kind !== 'cargo' && !st.capacity) reasons.push(`the ${v.name} carries no cargo`);
    if (v.contract) reasons.push(`the ${v.name} is already on a contract`);
    if (v.port !== c.from) reasons.push(`the ${v.name} is at ${this.port(v.port)?.name || 'sea'}, not ${this.port(c.from).name}`);
    if (st.capacity < c.units) reasons.push(`it holds ${st.capacity} units; this is ${c.units}`);
    if (T.needs && !st.tags.includes(T.needs)) reasons.push(`it needs ${/^[aeiou]/.test(T.needs) ? 'an' : 'a'} ${T.needs} ship`);
    const pl = this.plan(v, c.to, c.units, c.from);
    for (const r of pl.reasons) if (!reasons.includes(r) && !r.startsWith('it\'s already')) reasons.push(r);
    const now = this.game.clock.total;
    const arrive = now + Math.round((pl.load + pl.hours) * 60);
    const onTime = arrive <= c.deadline;
    const pay = this.payFor(c, arrive);
    return { ok: reasons.length === 0, reasons, arrive, onTime, pay, cost: pl.cost, opex: pl.opex, fees: pl.fees, profit: pay - pl.cost, hours: pl.load + pl.hours };
  }

  /** What the client pays for a delivery at a given time. */
  payFor(c, at) {
    const T = this.cfg.contractTypes[c.type];
    const lateDays = Math.max(0, (at - c.deadline) / 1440);
    if (lateDays > this.L.lateGraceDays) return 0;
    if (lateDays > 0) return Math.round(c.pay * Math.max(0, 1 - Math.ceil(lateDays) * this.L.latePenaltyPerDay));
    const early = T.earlyBonus && at < c.deadline - 12 * 60 ? T.earlyBonus : 0;
    return Math.round(c.pay * (1 + early));
  }

  /** Put a ship on a contract: it loads, then sails. Running costs and port fees are paid now. */
  assign(cid, vid) {
    const g = this.game;
    const c = this.contract(cid);
    const v = this.vessel(vid);
    const q = this.quote(cid, vid);
    if (!q.ok) return { ok: false, text: `Can't: ${q.reasons[0]}.` };
    if (g.player.money < q.cost) return { ok: false, text: `The voyage costs ${q.cost} obols up front (running costs and port fees).` };
    this.spend(q.cost, 'voyage');
    c.status = 'loading';
    c.vessel = v.id;
    v.contract = c.id;
    v.cargo = { type: c.type, units: c.units, contract: c.id };
    this.setStatus(v, 'loading');
    v.loadUntil = g.clock.total + Math.round(this.L.loadHoursBase * 60 + c.units * this.L.loadHoursPerUnit * 60);
    this.report('contract', `📦 The ${v.name} is loading ${c.units} units for ${this.cfg.clients[c.client].name} at ${this.port(c.from).name}.`, null);
    return { ok: true, text: `The ${v.name} is loading. It should reach ${this.port(c.to).name} ${this.when(q.arrive)}${q.onTime ? '' : ' — late'}.` };
  }

  when(t) {
    const d = Math.floor(t / 1440) + 1;
    const m = Math.floor(t % 1440);
    return `Day ${d}, ${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  }

  // ------------------------------------------------------------- time
  minuteTick() {
    const s = this.game.world.logistics;
    if (!s?.owned) return;
    const g = this.game;
    const now = g.clock.total;
    if (g.clock.day > s.lastUpkeepDay && g.clock.minuteOfDay >= this.L.upkeepHour * 60) {
      s.lastUpkeepDay = g.clock.day;
      this.daily();
    }
    for (const v of this.vessels()) {
      if (v.status === 'loading' && now >= v.loadUntil) this.depart(v);
      if (v.status !== 'underway') continue;
      for (const e of v.voyage.events) {
        if (e.done || e.at > now) continue;
        e.done = true;
        v.voyage.arrive += e.hours * 60;
        this.report('delay', `⏳ The ${v.name} is delayed ${e.hours} h by ${e.why}. New arrival ${this.when(v.voyage.arrive)}.`, 'warn');
      }
      if (now >= v.voyage.arrive) this.arrive(v);
    }
  }

  depart(v) {
    const c = this.contract(v.contract);
    delete v.loadUntil;
    const vo = this.startVoyage(v, c.to, { purpose: 'contract', contract: c.id, depart: this.game.clock.total });
    c.status = 'transit';
    c.depart = vo.depart;
    c.arrive = vo.arrive;
    this.report('voyage', `⛴ The ${v.name} sails from ${this.port(vo.from).name} for ${this.port(vo.to).name} with ${c.units} units — due ${this.when(vo.arrive)}.`, 'info');
  }

  arrive(v) {
    const g = this.game;
    const V = v.voyage;
    const st = this.stats(v);
    this.setStatus(v, 'docked');
    v.port = V.to;
    v.voyage = null;
    v.sailedKm += V.km;
    v.condition = Math.max(0, Math.round((v.condition - (V.km / 1000) * this.L.wearPerKkm * st.wear) * 10) / 10);
    v.log.unshift({ from: V.from, to: V.to, km: V.km, arrived: g.clock.total, contract: V.contract });
    v.log.length = Math.min(v.log.length, 10);
    if (!V.contract) {
      this.report('voyage', `⚓ The ${v.name} reached ${this.port(V.to).name}.`, 'info');
      return;
    }
    const c = this.contract(V.contract);
    v.contract = null;
    v.cargo = null;
    if (!c || c.status !== 'transit') return; // already settled (never pays twice)
    const pay = this.payFor(c, g.clock.total);
    const client = this.cfg.clients[c.client].name;
    if (pay > 0) {
      c.status = 'delivered';
      c.result = { paid: pay, at: g.clock.total, late: g.clock.total > c.deadline };
      this.earn(pay, 'contract');
      this.report('contract', `✅ The ${v.name} delivered ${c.units} units to ${this.port(c.to).name} for ${client}: ${pay} obols${c.result.late ? ' (late)' : ''}.`, 'good');
    } else {
      const fee = Math.round(c.pay * this.L.failPenalty);
      c.status = 'failed';
      c.result = { paid: 0, penalty: fee, at: g.clock.total, note: 'too late' };
      this.spend(Math.min(fee, Math.max(0, g.player.money)), 'penalty');
      this.report('contract', `✖ The ${v.name} reached ${this.port(c.to).name} days late — ${client} refused the cargo and charged ${fee} obols.`, 'warn');
    }
  }

  daily() {
    const g = this.game;
    const s = this.state;
    // upkeep: your ports and your ships (unpaid → arrears, paid first next time)
    let due = s.arrears;
    for (const id of this.ownedPorts()) due += this.portType(id).upkeep;
    for (const v of this.vessels()) if (v.status !== 'lost') due += this.stats(v).upkeep;
    const pay = Math.min(due, Math.max(0, g.player.money));
    this.spend(pay, 'upkeep');
    s.arrears = due - pay;
    if (s.arrears > 0) this.report('upkeep', `⚠ Upkeep: ${due} obols due, ${pay} paid. ${s.arrears} in arrears — your ships can't sail until it's paid.`, 'warn');
    // contracts: offers lapse, deadlines pass, new offers come in
    for (const c of s.contracts) {
      if (c.status === 'available' && (c.expiresDay < g.clock.day || c.deadline <= g.clock.total)) c.status = 'expired';
      if (c.status === 'accepted' && c.deadline + this.L.lateGraceDays * 1440 <= g.clock.total) {
        const fee = Math.round(c.pay * this.L.failPenalty);
        c.status = 'failed';
        c.result = { paid: 0, penalty: fee, note: 'never shipped' };
        this.spend(Math.min(fee, Math.max(0, g.player.money)), 'penalty');
        this.report('contract', `✖ You never shipped ${this.cfg.clients[c.client].name}'s cargo. Penalty ${fee} obols.`, 'warn');
      }
    }
    s.contracts = s.contracts.filter((c) => !['expired', 'delivered', 'failed'].includes(c.status) || g.clock.day - c.offered < 10);
    if (s.lastContractDay < g.clock.day) {
      s.lastContractDay = g.clock.day;
      this.postContracts();
    }
  }

  /** Pay off arrears now (if you can). */
  payArrears() {
    const s = this.state;
    if (!s.arrears) return { ok: false, text: 'Nothing owed.' };
    if (this.game.player.money < s.arrears) return { ok: false, text: `You owe ${s.arrears} obols.` };
    this.spend(s.arrears, 'upkeep');
    s.arrears = 0;
    return { ok: true, text: 'Arrears paid. Your ships may sail.' };
  }

  /** Daily running cost of the company at rest. */
  dailyUpkeep() {
    let n = 0;
    for (const id of this.ownedPorts()) n += this.portType(id).upkeep;
    for (const v of this.vessels()) n += this.stats(v).upkeep;
    return n;
  }

  /** A logistics prop: the harbour-office terminal or a berth board. */
  interact(prop) {
    const act = prop.interact;
    if (act.action === 'terminal') {
      if (!this.owned) return { type: 'message', text: 'The terminal shows a login screen: "OBER & SONS MARITIME — staff only." A sticky note on the bezel: "Password is the name of the boat. — Capt."' };
      return { type: 'panel', panel: 'logistics', opts: {} };
    }
    if (act.action === 'berth') {
      const b = this.berth(act.slot);
      if (!this.owned) return { type: 'message', text: `BERTH ${act.slot + 1} — OBER & SONS MARITIME. Private berth. Enquiries to the Captain.` };
      if (!b) return { type: 'message', text: `Berth ${act.slot + 1} is empty. Choose which of your ports it shows on the terminal's Ports page.` };
      const ships = b.ships.map((v) => v.name);
      return { type: 'message', text: `BERTH ${act.slot + 1} — ${b.name}. ${ships.length ? `In port: ${ships.join(', ')}.` : 'No ships in port.'} (Which port each berth shows is set on the terminal's Ports page.)` };
    }
    return { type: 'message', text: prop.examine || '' };
  }

  /** Ships to draw at a Yards berth (slot 0–2): the port it represents, and its docked ships you've left visible. */
  berth(slot) {
    const id = this.game.world.logistics?.display?.berths?.[slot];
    if (!id || !this.owned) return null;
    return { port: id, name: this.port(id).name, ships: this.atPort(id).filter((v) => v.visible) };
  }
}
