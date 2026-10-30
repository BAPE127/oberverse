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
import { INCOME } from '../content/income.js';
import { clamp } from '../core/util.js';
import { seaRoute, pointAlong } from '../world/seaRoutes.js';
import { Missions } from './missions.js';
import { Shipyard } from './shipyard.js';
import { Docks } from './docks.js';
import { zones as pirateZones, exposure as routeExposure, assess as assessRisk, roll as rollPirates } from './piracy.js';

const REPORTS_MAX = 80;
const LEDGER_DAYS = 30;
/** Spending that buys an asset rather than running the line (tallied apart for operating figures, v0.56.0). */
const CAPEX = new Set(['company', 'ship', 'shipbuilding']);

export const VESSEL_STATES = ['docked', 'loading', 'underway', 'mission', 'lost', 'retired'];
/** Allowed status changes (a vessel is in exactly one place at a time). */
const TRANSITIONS = {
  docked: ['loading', 'underway', 'mission', 'retired', 'lost'],
  loading: ['underway', 'docked', 'lost'],
  underway: ['docked', 'lost'],
  mission: ['docked', 'lost'],
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
    // v0.23.0
    missions: [], nextMission: 1, lastMissionDay: 0, suppressed: {}, protected: {},
  };
}

const fmtHours = (h) => (h >= 48 ? `${(h / 24).toFixed(1)} days` : `${Math.round(h)} h`);

export class Logistics {
  constructor(game) {
    this.game = game;
    this.missions = new Missions(this);
    this.shipyard = new Shipyard(this);
    this.docks = new Docks(this);
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

  /** A ship model: from the catalogues, or a custom design from your own yard (v0.24.0). */
  model(id) {
    return this.cfg.ships[id] || this.shipyard.spec(id) || null;
  }

  /** A vessel's model (or a not-yet-launched design's spec, for checks). */
  specOf(v) {
    return v._spec || this.model(v.model);
  }

  cls(model) {
    return this.cfg.classes[model.cls] || this.cfg.warshipClasses?.[model.cls] || {};
  }

  className(model) {
    return this.cls(model).name || model.cls;
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
    if (why === 'company') g.corp.found('shipping', amount, this.L.company); // the owner buys the firm: equity in kind
    else g.corp.pay('shipping', amount, { cat: why, owe: true }); // short of cash: owed, never free
    this.book(0, amount, why);
    // capital spending (the company, ships) is tallied too, so operating figures can leave it out (v0.56.0)
    if (CAPEX.has(why)) {
      const L = this.state.ledger;
      L.capex = (L.capex || 0) + amount;
      L.days[0].capex = (L.days[0].capex || 0) + amount;
    }
  }

  earn(amount, why) {
    const g = this.game;
    if (amount <= 0) return;
    g.corp.receive('shipping', amount, { cat: why });
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
    if (g.player.money < L.price) return { ok: false, text: `${L.company} costs ${L.price} obols. You have ${g.player.money}.` }; // the owner's money: the company does not exist yet
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
    this.missions.state.lastMissionDay = g.clock.day;
    this.missions.post();
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
    if (!g.corp.canAfford('shipping', price)) return { ok: false, text: `${p.name} costs ${price} obols.` };
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
    this.docks.sync();
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

  /**
   * Effective stats (the shipyard's components will modify these). combat is
   * what piracy, escorts and missions read now — and what a future playable
   * encounter would read: one set of numbers per ship, nowhere else.
   */
  stats(v) {
    const m = this.specOf(v);
    const k = this.cls(m);
    return {
      capacity: m.capacity, speed: m.speed, range: m.range, reliability: m.reliability, opex: m.opex, upkeep: m.upkeep, tags: m.tags || [],
      size: m.size ?? k.size, wear: m.wear ?? k.wear ?? 1, needsPortType: m.needsPortType ?? k.needsPortType ?? null,
      combat: { attack: 0, defense: 5, detection: 10, stealth: 10, mounts: 0, ...(k.combat || {}), ...(m.combat || {}) }, bonuses: m.bonuses || [],
    };
  }

  setStatus(v, to) {
    if (!TRANSITIONS[v.status]?.includes(to)) throw new Error(`vessel ${v.id}: ${v.status} → ${to} is not allowed`);
    v.status = to;
  }

  /** Ships at (or loading in) a port, and ships on their way there. */
  atPort(portId) {
    return this.vessels().filter((v) => (v.status === 'docked' || v.status === 'loading' || v.status === 'mission') && v.port === portId);
  }

  inbound(portId) {
    return this.vessels().filter((v) => v.status === 'underway' && v.voyage?.to === portId);
  }

  /** Can this ship berth at that port? (size and type; owned ports also by berths free). */
  berthCheck(v, portId, { arriving = true } = {}) {
    const p = this.port(portId);
    const pt = this.portType(portId);
    const st = this.stats(v);
    const m = this.specOf(v);
    const need = [].concat(st.needsPortType || []);
    if (!p) return 'no such port';
    if (need.length && !need.includes(p.type)) return `the ${m.name} only berths at ${need.map((t) => this.cfg.portTypes[t].name.toLowerCase()).join(' or ')}s`;
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
    this.docks.sync();
    return { ok: true };
  }

  setVisible(id, visible) {
    const v = this.vessel(id);
    if (!v) return { ok: false };
    v.visible = Boolean(visible);
    this.docks.sync();
    return { ok: true };
  }

  /** The dealership: a complete ship, delivered to one of your ports. */
  buyShip(modelId, portId, name) {
    const g = this.game;
    const s = this.state;
    const m = this.model(modelId);
    if (!s.owned) return { ok: false, text: 'You need a shipping company first.' };
    if (!m || !(this.cfg.dealership.includes(modelId) || this.cfg.warshipDealership?.includes(modelId))) return { ok: false, text: 'That ship isn\'t for sale here.' };
    if (!this.ownsPort(portId)) return { ok: false, text: 'Deliver it to a port you own.' };
    const probe = { model: modelId, status: 'docked' };
    const why = this.berthCheck(probe, portId);
    if (why) return { ok: false, text: `Can't deliver there: ${why}.` };
    if (!g.corp.canAfford('shipping', m.price)) return { ok: false, text: `The ${m.name} costs ${m.price} obols. You have ${g.corp.cashOf('shipping')}.` };
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
    if (!g.corp.canAfford('shipping', cost)) return { ok: false, text: `Repairs cost ${cost} obols.` };
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

  // ------------------------------------------------------------- risk (v0.23.0)
  /** Dangerous water right now: pirate waters (some suppressed by your missions), war zones, blockades. */
  zones() {
    const s = this.state;
    return pirateZones(this.game.content, this.game.market.state, { suppressed: s.suppressed || {}, now: this.game.clock.total });
  }

  /** Fleet bonuses in force for a voyage leaving `from` with these escorts — each bonus once, however many ships have it. */
  activeBonuses(from, escorts = []) {
    const B = this.cfg.bonuses || {};
    const on = new Set();
    for (const v of this.vessels()) {
      if (v.status === 'lost') continue;
      for (const id of this.stats(v).bonuses) {
        const b = B[id];
        if (!b) continue;
        if (b.scope === 'fleet') on.add(id);
        if (b.scope === 'port' && (v.status === 'docked' || v.status === 'mission') && v.port === from) on.add(id);
        if (b.scope === 'group' && escorts.includes(v.id)) on.add(id);
      }
    }
    return [...on].map((id) => ({ id, ...B[id] }));
  }

  /** Escorts' combined strength (0–0.75: how much they cut the chance of trouble) and fighting weight. */
  escortPower(escorts, bonuses) {
    let strength = 0;
    let defense = 0;
    for (const id of escorts) {
      const c = this.stats(this.vessel(id)).combat;
      strength += (c.attack + c.detection) / 400;
      defense += c.attack * 0.6 + c.defense * 0.4;
    }
    const boost = bonuses.reduce((a, b) => a + (b.escortStrength || 0), 0);
    return { strength: Math.min(0.75, strength * (1 + boost)), defense: defense * (1 + boost) };
  }

  /**
   * The risk of a voyage, shown before departure. opts: { cargo: 'arms' | contract type | null,
   * escorts: [vessel ids], guards: bool, value: cargo value (for ransoms) }.
   */
  voyageRisk(v, from, to, { cargo = null, escorts = [], guards = false, value = 0 } = {}) {
    const st = this.stats(v);
    const route = this.route(from, to);
    const bonuses = this.activeBonuses(from, escorts);
    const ep = this.escortPower(escorts, bonuses);
    const speeds = [st.speed, ...escorts.map((id) => this.stats(this.vessel(id)).speed)];
    const chanceMod = bonuses.reduce((a, b) => a + (b.chance || 0), 0) + (this.state.protected?.[from] > this.game.clock.total ? -0.3 : 0);
    const risk = assessRisk({ R: this.cfg.risk, route, zones: this.zones(), cargo, speed: Math.min(...speeds), stealth: st.combat.stealth, escortStrength: ep.strength, chanceMod });
    const defense = st.combat.defense + ep.defense + (guards ? this.cfg.risk.guards.defense : 0) + bonuses.reduce((a, b) => a + (b.defense || 0), 0);
    const worst = escorts.length && risk.worst === 'captured' ? 'cargo' : !cargo && risk.worst === 'cargo' ? 'ransom' : risk.worst;
    return { ...risk, worst, defense: Math.round(defense), escorted: escorts.length > 0, bonuses: bonuses.map((b) => b.name), value };
  }

  /** Check escorts for a convoy from `from` to `to`; returns { reasons, cost, speed }. */
  escortCheck(escorts, from, to) {
    const reasons = [];
    let cost = 0;
    let speed = Infinity;
    for (const id of escorts) {
      const e = this.vessel(id);
      if (!e) { reasons.push('no such escort'); continue; }
      if (e.kind !== 'warship' || !this.stats(e).tags.includes('escort')) reasons.push(`the ${e.name} can't escort`);
      if (e.contract || e.cargo || e.status !== 'docked') reasons.push(`the ${e.name} isn't free`);
      if (e.port !== from) reasons.push(`the ${e.name} is at ${this.port(e.port)?.name || 'sea'}, not ${this.port(from).name}`);
      const pl = this.plan(e, to, 0, from);
      for (const r of pl.reasons) if (!r.startsWith('it\'s already') && !r.includes('isn\'t free')) reasons.push(`escort: ${r}`);
      cost += pl.cost;
      speed = Math.min(speed, this.stats(e).speed);
    }
    if (new Set(escorts).size !== escorts.length) reasons.push('an escort is listed twice');
    return { reasons, cost, speed };
  }

  /** Optional per-voyage services on a cargo's value: guards (+defence) and insurance (pays out on a lost cargo). */
  servicesCost(value, { guards = false, insure = false } = {}) {
    const R = this.cfg.risk;
    return (guards ? Math.max(R.guards.min, Math.round(value * R.guards.costShare)) : 0) + (insure ? Math.round(value * R.insurance.rate) : 0);
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

  /**
   * Put a ship to sea. Everything random about the voyage — delays, and since
   * v0.23.0 whether pirates strike and how it goes — is rolled here and stored.
   * opts.speed: a convoy sails at its slowest ship; opts.risk: { cargo, escorts, guards, value }.
   */
  startVoyage(v, to, { purpose, contract = null, depart, speed = null, risk = null, events = null }) {
    const pl = this.plan(v, to);
    const hours = speed ? this.sailHours(pl.km, speed) : pl.hours;
    const base = Math.max(30, Math.round(hours * 60));
    const ev = events ? events.map((e) => ({ ...e })) : this.rollEvents(v, pl.km, base, depart);
    if (!events && risk) {
      const rk = this.voyageRisk(v, v.port, to, risk);
      const hit = rollPirates(this.game.rng, rk, this.cfg.risk, { defense: rk.defense, escorted: rk.escorted, cargo: Boolean(risk.cargo), value: risk.value });
      if (hit) ev.push({ kind: 'pirates', at: Math.round(depart + base * hit.at), hours: hit.hours, done: false, outcome: hit.outcome, cost: hit.cost, damage: hit.damage, pirates: hit.pirates, where: rk.exposure.names[0] || 'open water' });
    }
    v.voyage = { from: v.port, to, km: pl.km, depart, base, arrive: depart + base, purpose, contract, events: ev };
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
    if (v.cargo?.type === 'aero') return { ok: false, text: `The ${v.name} is reserved for aerospace freight (release it on the aerospace terminal's Supply page).` };
    const pl = this.plan(v, to);
    if (!pl.ok) return { ok: false, text: `Can't sail: ${pl.reasons[0]}.` };
    if (!g.corp.canAfford('shipping', pl.cost)) return { ok: false, text: `The passage costs ${pl.cost} obols (running costs and port fees).` };
    const from = v.port;
    this.spend(pl.cost, 'voyage');
    this.startVoyage(v, to, { purpose: 'reposition', depart: g.clock.total, risk: { cargo: null } });
    this.report('voyage', `⛴ The ${v.name} sails from ${this.port(from).name} for ${this.port(to).name} — ${pl.km} km, about ${fmtHours(pl.hours)}.`, null);
    return { ok: true, text: `The ${v.name} is under way.` };
  }

  /** Where a ship is now: { lat, lon, f (voyage fraction), port? }. Derived from the clock. */
  position(v) {
    if (v.status === 'lost') return null;
    if (v.status === 'mission') {
      // on station: a slow circle off the port
      const p = this.port(v.port);
      const a = (this.game.clock.total / 180) % (Math.PI * 2);
      return p ? { lat: p.lat + Math.sin(a) * 1.5, lon: p.lon + Math.cos(a) * 2, f: 0, port: v.port, onStation: true } : null;
    }
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
          // the guaranteed offer keeps to safe water (early players can't be ruined by bad luck)
          if (easy && routeExposure(rr, this.zones()).maxDanger >= 0.2) continue;
          to = cand;
          route = rr;
        }
        if (!route) continue;
        const [u0, u1] = T.units;
        let units = Math.round(u0 + R.next() * (u1 - u0));
        if (easy) units = Math.min(units, maxCap);
        const pay = Math.round((T.base + units * T.rate * (route.km / 1000)) * INCOME.business.contracts); // v0.82.0: clients pay more (INCOME)
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
    this.spend(Math.min(fee, Math.max(0, this.game.corp.cashOf('shipping'))), 'penalty');
    c.status = 'failed';
    c.result = { paid: 0, penalty: fee, note: 'cancelled' };
    this.report('contract', `✖ You cancelled the ${this.cfg.contractTypes[c.type].name.toLowerCase()} contract for ${this.cfg.clients[c.client].name} (penalty ${fee}).`, 'warn');
    return { ok: true, text: `Cancelled (penalty ${fee} obols).` };
  }

  /**
   * Everything about putting a ship on a contract, without doing it.
   * opts (v0.23.0): { escorts: [warship ids], guards, insure }.
   */
  quote(cid, vid, { escorts = [], guards = false, insure = false } = {}) {
    const c = this.contract(cid);
    const v = this.vessel(vid);
    if (!c || !v) return { ok: false, reasons: ['nothing to quote'] };
    const st = this.stats(v);
    const T = this.cfg.contractTypes[c.type];
    const reasons = [];
    if (!['available', 'accepted'].includes(c.status)) reasons.push('the contract is no longer open');
    if (v.kind !== 'cargo' && !st.capacity) reasons.push(`the ${v.name} carries no cargo`);
    if (v.contract) reasons.push(`the ${v.name} is already on a contract`);
    if (!v.contract && v.cargo) reasons.push(`the ${v.name} is carrying (or reserved for) other cargo`);
    if (v.port !== c.from) reasons.push(`the ${v.name} is at ${this.port(v.port)?.name || 'sea'}, not ${this.port(c.from).name}`);
    if (st.capacity < c.units) reasons.push(`it holds ${st.capacity} units; this is ${c.units}`);
    if (T.needs && !st.tags.includes(T.needs)) reasons.push(`it needs ${/^[aeiou]/.test(T.needs) ? 'an' : 'a'} ${T.needs} ship`);
    const pl = this.plan(v, c.to, c.units, c.from);
    for (const r of pl.reasons) if (!reasons.includes(r) && !r.startsWith('it\'s already')) reasons.push(r);
    const esc = this.escortCheck(escorts, c.from, c.to);
    reasons.push(...esc.reasons);
    const now = this.game.clock.total;
    const speed = Math.min(st.speed, esc.speed);
    const hours = pl.load + this.sailHours(pl.km, speed);
    const arrive = now + Math.round(hours * 60);
    const onTime = arrive <= c.deadline;
    const pay = this.payFor(c, arrive);
    const services = this.servicesCost(c.pay, { guards, insure });
    const cost = pl.cost + esc.cost + services;
    const risk = this.voyageRisk(v, c.from, c.to, { cargo: c.type, escorts, guards, value: c.pay });
    return { ok: reasons.length === 0, reasons, arrive, onTime, pay, cost, opex: pl.opex, fees: pl.fees, escortCost: esc.cost, services, profit: pay - cost, hours, risk };
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

  /** Put a ship on a contract: it loads, then sails (with any escorts). Running costs, fees and services are paid now. */
  assign(cid, vid, opts = {}) {
    const g = this.game;
    const c = this.contract(cid);
    const v = this.vessel(vid);
    const q = this.quote(cid, vid, opts);
    if (!q.ok) return { ok: false, text: `Can't: ${q.reasons[0]}.` };
    if (!g.corp.canAfford('shipping', q.cost)) return { ok: false, text: `The voyage costs ${q.cost} obols up front (running costs, fees${q.escortCost ? ', escorts' : ''}${q.services ? ', services' : ''}).` };
    this.spend(q.cost, 'voyage');
    c.status = 'loading';
    c.vessel = v.id;
    c.insured = Boolean(opts.insure);
    c.guards = Boolean(opts.guards);
    v.contract = c.id;
    v.cargo = { type: c.type, units: c.units, contract: c.id };
    this.setStatus(v, 'loading');
    v.loadUntil = g.clock.total + Math.round(this.L.loadHoursBase * 60 + c.units * this.L.loadHoursPerUnit * 60);
    this.formConvoy(v, opts.escorts || [], { cargo: c.type, guards: c.guards, value: c.pay });
    this.report('contract', `📦 The ${v.name} is loading ${c.units} units for ${this.cfg.clients[c.client].name} at ${this.port(c.from).name}.`, null);
    return { ok: true, text: `The ${v.name} is loading. It should reach ${this.port(c.to).name} ${this.when(q.arrive)}${q.onTime ? '' : ' — late'}.` };
  }

  // ------------------------------------------------------------- arms exports (v0.22.0)
  /** Where a country takes delivery: its first-listed (main) port. */
  portFor(countryId) {
    return Object.keys(this.cfg.ports).find((id) => this.cfg.ports[id].country === countryId) || null;
  }

  /** Can this ship carry `crates` of an order to that country? Nothing changes. opts: { escorts, guards, value }. */
  armsQuote(vid, countryId, crates, { escorts = [], guards = false, value = 0 } = {}) {
    const v = this.vessel(vid);
    const to = this.portFor(countryId);
    if (!v) return { ok: false, reasons: ['no such ship'] };
    if (!to) return { ok: false, reasons: ['that country has no port'] };
    const st = this.stats(v);
    const reasons = [];
    if (v.contract || v.cargo) reasons.push(`the ${v.name} already has cargo`);
    if (v.port !== this.L.armsPort) reasons.push(`the ${v.name} must be at ${this.port(this.L.armsPort).name}, where the export cages are`);
    if (st.capacity < crates) reasons.push(`it holds ${st.capacity} units; the order is ${crates} crates`);
    const pl = this.plan(v, to, 0, this.L.armsPort);
    for (const r of pl.reasons) if (!reasons.includes(r) && !r.startsWith('it\'s already')) reasons.push(r);
    const esc = this.escortCheck(escorts, this.L.armsPort, to);
    reasons.push(...esc.reasons);
    const load = this.L.loadHoursBase + crates * this.L.armsLoadHoursPerCrate;
    const hours = load + this.sailHours(pl.km, Math.min(st.speed, esc.speed));
    const services = this.servicesCost(value, { guards });
    const risk = this.voyageRisk(v, this.L.armsPort, to, { cargo: 'arms', escorts, guards, value });
    return { ok: reasons.length === 0, reasons, to, km: pl.km, hours, load, cost: pl.cost + esc.cost + services, opex: pl.opex, fees: pl.fees, escortCost: esc.cost, services, risk, escorts, guards };
  }

  /** Called by Market.shipOwn once the order is committed: pay, load and sail. */
  carryArms(vid, shp, q) {
    const g = this.game;
    const v = this.vessel(vid);
    this.spend(q.cost, 'voyage');
    v.cargo = { type: 'arms', units: Object.values(shp.items).reduce((a, b) => a + b, 0), shipment: shp.id, country: shp.country };
    // customs: an embargo run is decided now and kept with the voyage (a reload can't change it)
    const fate = shp.embargo && g.rng.next() < this.L.ownEmbargoSeizure ? 'seized' : 'delivered';
    this.setStatus(v, 'loading');
    v.loadUntil = g.clock.total + Math.round(q.load * 60);
    v.pending = { to: q.to, purpose: 'arms', shipment: shp.id, fate };
    this.formConvoy(v, q.escorts || [], { cargo: 'arms', guards: q.guards, value: shp.value });
    this.report('arms', `📦 The ${v.name} is loading ${v.cargo.units} crates for ${g.content.arms.countries[shp.country].name} at ${this.port(v.port).name}.`, null);
  }

  /** Escorts wait in port with the loading ship and sail with it (status 'loading', convoyOf). */
  formConvoy(v, escorts, risk) {
    v.convoy = [...escorts];
    v.riskOpts = { ...risk, escorts: [...escorts] };
    for (const id of escorts) {
      const e = this.vessel(id);
      this.setStatus(e, 'loading');
      e.convoyOf = v.id;
    }
    if (escorts.length) this.report('convoy', `🛡 ${escorts.map((id) => `the ${this.vessel(id).name}`).join(' and ')} will escort the ${v.name}.`, null);
  }

  /** The convoy sails together at its slowest ship's speed, sharing one set of events. */
  sailConvoy(v, to, opts) {
    const esc = (v.convoy || []).map((id) => this.vessel(id)).filter(Boolean);
    const speed = Math.min(this.stats(v).speed, ...esc.map((e) => this.stats(e).speed));
    const vo = this.startVoyage(v, to, { ...opts, speed, risk: v.riskOpts || { cargo: opts.purpose === 'arms' ? 'arms' : null } });
    for (const e of esc) {
      delete e.convoyOf;
      const ev = this.startVoyage(e, to, { purpose: 'escort', depart: vo.depart, speed, events: vo.events });
      ev.escortOf = v.id;
      ev.base = vo.base;
      ev.arrive = vo.arrive;
    }
    delete v.riskOpts;
    vo.convoy = esc.map((e) => e.id);
    delete v.convoy;
    return vo;
  }

  // ------------------------------------------------------------- aerospace freight (v0.56.0)
  // Internal shipping jobs for Roost Aeroworks (src/systems/aerospace.js owns the job and its
  // purchase orders). Here only the ship's side: reserve it, send it empty to the supplier's port,
  // load, sail the sea lane like any voyage (delays, pirates), land at Mill Road. The voyage's real
  // running costs and port fees are spent here, once; the aerospace division pays the shipping
  // division a small internal charge (earnInternal), which group accounts eliminate.

  /** Hold a free ship for an aerospace job (a reserved cargo marker keeps every other use off it). */
  reserveForAero(v, job) {
    v.cargo = { type: 'aero', units: job.units, job: job.id, reserved: true };
  }

  releaseAero(v) {
    if (v?.cargo?.type === 'aero' && v.cargo.reserved) v.cargo = null;
  }

  /** Send a reserved ship empty to the supplier's port. Running costs and fees are paid now. */
  repositionForAero(v, to, job) {
    const pl = this.plan(v, to);
    if (!pl.ok) return { ok: false, text: pl.reasons[0] };
    if (!this.game.corp.canAfford('shipping', pl.cost)) return { ok: false, text: `the passage costs ${pl.cost} obols` };
    const from = v.port;
    this.spend(pl.cost, 'voyage');
    const vo = this.startVoyage(v, to, { purpose: 'reposition', depart: this.game.clock.total, risk: { cargo: null } });
    vo.forJob = job.id;
    this.report('voyage', `⛴ The ${v.name} sails empty from ${this.port(from).name} for ${this.port(to).name} to collect aerospace materials (${job.id}).`, null);
    return { ok: true, cost: pl.cost, arrive: vo.arrive };
  }

  /** Load an aerospace cargo at the supplier's port and sail it to Mill Road. Running costs and fees are paid now, once. */
  loadAero(v, job, value) {
    const g = this.game;
    const pl = this.plan(v, job.dest, job.units, job.origin);
    if (v.port !== job.origin) return { ok: false, text: `the ${v.name} isn't at ${this.port(job.origin).name}` };
    if (!pl.ok && !(pl.reasons.length === 1 && pl.reasons[0].includes('isn\'t free'))) return { ok: false, text: pl.reasons[0] };
    if (!g.corp.canAfford('shipping', pl.cost)) return { ok: false, text: `the voyage costs ${pl.cost} obols up front` };
    this.spend(pl.cost, 'voyage');
    v.cargo = { type: 'aero', units: job.units, job: job.id };
    this.setStatus(v, 'loading');
    v.loadUntil = g.clock.total + Math.round(pl.load * 60);
    v.pending = { to: job.dest, purpose: 'aero', job: job.id };
    this.formConvoy(v, [], { cargo: 'aero', guards: false, value });
    this.report('aero', `📦 The ${v.name} is loading ${job.units} units of aerospace materials at ${this.port(job.origin).name} for Mill Road (${job.id}).`, null);
    return { ok: true, cost: pl.cost, opex: pl.opex, fees: pl.fees, load: pl.load, hours: pl.hours };
  }

  /** The aerospace division pays the shipping division for a job: money moves between your own pockets; the ledger notes it as internal. */
  earnInternal(amount) {
    const s = this.state;
    if (amount <= 0) return;
    this.earn(amount, 'internal');
    s.ledger.internal = (s.ledger.internal || 0) + amount;
    const d = s.ledger.days[0];
    if (d) d.internal = (d.internal || 0) + amount;
  }

  /** Keep the market's shipment in step with the voyage (its ETA moves with delays). */
  syncShipment(v) {
    if (v.voyage?.job) this.game.aero.syncJob(v); // v0.56.0
    const id = v.voyage?.shipment;
    if (!id) return;
    const shp = this.game.market.state.shipments.find((x) => x.id === id);
    if (shp) { shp.arrives = v.voyage.arrive; shp.departs = v.voyage.depart; }
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
    this.missions.tick();
    this.shipyard.tick();
    this.docks.sync();
    for (const v of this.vessels()) {
      if (v.status === 'loading' && v.loadUntil !== undefined && now >= v.loadUntil) this.depart(v);
      if (v.status !== 'underway') continue;
      for (const e of v.voyage.events) {
        if (e.done || e.at > now) continue;
        e.done = true;
        if (e.kind === 'pirates') { this.pirates(v, e); if (v.status !== 'underway') break; continue; }
        v.voyage.arrive += e.hours * 60;
        this.syncShipment(v);
        if (v.voyage.purpose !== 'escort') this.report('delay', `⏳ The ${v.name} is delayed ${e.hours} h by ${e.why}. New arrival ${this.when(v.voyage.arrive)}.`, 'warn');
      }
      if (v.status === 'underway' && now >= v.voyage.arrive) this.arrive(v);
    }
  }

  /** A pirate encounter (rolled at departure) happens now. */
  pirates(v, e) {
    const g = this.game;
    const V = v.voyage;
    const escort = V.purpose === 'escort';
    const where = e.where;
    const hurt = (ship, n) => { ship.condition = Math.max(0, Math.round((ship.condition - n) * 10) / 10); };
    if (escort) {
      // the escort shares the fight: some damage, the same delay
      hurt(v, Math.round(e.damage * 0.6));
      if (['delay', 'ransom', 'cargo'].includes(e.outcome)) V.arrive += e.hours * 60;
      return;
    }
    const escorted = (V.convoy || []).length > 0;
    const log = (text, kind = 'warn') => { (V.incidents ||= []).push({ at: g.clock.total, outcome: e.outcome, text }); this.report('piracy', text, kind); };
    if (e.outcome === 'repelled') {
      log(`🏴 Pirates in ${where} went for the ${v.name} — ${escorted ? 'her escort drove them off' : 'she showed them her stern and outran them'}.`, 'info');
      return;
    }
    if (e.outcome === 'delay') {
      hurt(v, e.damage);
      V.arrive += e.hours * 60;
      this.syncShipment(v);
      log(`🏴 Pirates in ${where} chased the ${v.name} off course: ${e.hours} h lost, some damage (${Math.round(v.condition)}%).`);
      return;
    }
    if (e.outcome === 'ransom') {
      hurt(v, e.damage);
      V.arrive += e.hours * 60;
      this.syncShipment(v);
      const paid = Math.min(e.cost, Math.max(0, g.corp.cashOf('shipping')));
      this.spend(paid, 'ransom');
      this.state.arrears += e.cost - paid;
      log(`🏴 Pirates in ${where} boarded the ${v.name} and took ${e.cost} obols to let her go${paid < e.cost ? ` (${e.cost - paid} owed — added to arrears)` : ''}.`);
      return;
    }
    // cargo or ship lost: the business that owns the cargo settles it now, once
    this.loseCargo(v, e.outcome === 'captured' ? 'captured' : 'hijacked');
    if (e.outcome === 'cargo') {
      hurt(v, e.damage);
      log(`🏴 Pirates in ${where} seized the ${v.name}'s cargo. The ship limps on (${Math.round(v.condition)}%).`);
      return;
    }
    // captured: the ship is gone
    this.setStatus(v, 'lost');
    v.lostAt = g.clock.total;
    v.voyage = { ...V, lost: true };
    log(`☠ Pirates in ${where} captured the ${v.name}. She is lost, with her cargo.`);
  }

  /** The cargo aboard is lost: contracts fail (insurance pays if bought), arms exports are hijacked. */
  loseCargo(v, how) {
    const g = this.game;
    const V = v.voyage;
    if (V.shipment) {
      g.market.settleOwn(V.shipment, 'hijacked');
      V.shipment = null;
    }
    if (V.job) {
      g.aero.jobLost(V.job, how); // v0.56.0
      V.job = null;
    }
    const c = V.contract && this.contract(V.contract);
    if (c && c.status === 'transit') {
      c.status = 'lost';
      if (c.insured) {
        const payout = Math.round(c.pay * this.cfg.risk.insurance.payout);
        c.result = { paid: 0, insurance: payout, note: how };
        this.earn(payout, 'insurance');
        this.report('contract', `🛟 Cargo insurance paid ${payout} obols for ${this.cfg.clients[c.client].name}'s lost cargo.`, 'info');
      } else {
        const fee = Math.round(c.pay * this.L.failPenalty);
        c.result = { paid: 0, penalty: fee, note: how };
        this.spend(Math.min(fee, Math.max(0, g.corp.cashOf('shipping'))), 'penalty');
      }
    }
    V.contract = null;
    v.contract = null;
    v.cargo = null;
  }

  depart(v) {
    delete v.loadUntil;
    if (v.pending) {
      const P = v.pending;
      delete v.pending;
      if (P.purpose === 'aero') {
        const vo = this.sailConvoy(v, P.to, { purpose: 'aero', depart: this.game.clock.total });
        vo.job = P.job;
        this.game.aero.jobSailed(P.job, v);
        this.report('aero', `⛴ The ${v.name} sails from ${this.port(vo.from).name} for ${this.port(vo.to).name} with ${v.cargo.units} units of aerospace materials — due ${this.when(vo.arrive)}.`, 'info');
        return;
      }
      const vo = this.sailConvoy(v, P.to, { purpose: P.purpose, depart: this.game.clock.total });
      vo.shipment = P.shipment;
      vo.fate = P.fate;
      this.syncShipment(v);
      this.report('voyage', `⛴ The ${v.name} sails from ${this.port(vo.from).name} for ${this.port(vo.to).name} with ${v.cargo.units} crates — due ${this.when(vo.arrive)}.`, 'info');
      return;
    }
    const c = this.contract(v.contract);
    const vo = this.sailConvoy(v, c.to, { purpose: 'contract', contract: c.id, depart: this.game.clock.total });
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
    v.log.unshift({ from: V.from, to: V.to, km: V.km, departed: V.depart, arrived: g.clock.total, contract: V.contract, shipment: V.shipment || null, cargo: v.cargo?.reserved ? `empty, to collect ${v.cargo.job}` : v.cargo ? `${v.cargo.units} ${v.cargo.type === 'arms' ? 'crates' : 'units'}` : V.purpose === 'escort' ? 'escort duty' : null, delays: V.events.filter((e) => e.done && e.kind === 'delay').length, incidents: (V.incidents || []).map((i) => i.outcome) });
    v.log.length = Math.min(v.log.length, 10);
    if (V.shipment) {
      // the market owns the order: it pays (or doesn't) exactly once
      v.cargo = null;
      const fate = g.market.settleOwn(V.shipment, V.fate || 'delivered');
      if (fate) this.report('arms', fate === 'delivered' ? `✅ The ${v.name} delivered its crates at ${this.port(V.to).name}.` : `⚓ Customs at ${this.port(V.to).name} seized the ${v.name}'s cargo. The ship was released.`, fate === 'delivered' ? null : 'warn');
      return;
    }
    if (V.job) {
      // v0.56.0: aerospace materials landed at Mill Road: the trucks take them up the Cut
      v.cargo = null;
      g.aero.jobLanded(V.job, v);
      this.report('aero', `✅ The ${v.name} landed aerospace materials at ${this.port(V.to).name}; trucks are taking them up the Cut.`, null);
      return;
    }
    if (V.purpose === 'escort') return; // the escorted ship reports the arrival
    if (!V.contract) {
      this.report('voyage', `⚓ The ${v.name} reached ${this.port(V.to).name}${(V.convoy || []).length ? ' with her escort' : ''}.`, 'info');
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
      this.spend(Math.min(fee, Math.max(0, g.corp.cashOf('shipping'))), 'penalty');
      this.report('contract', `✖ The ${v.name} reached ${this.port(c.to).name} days late — ${client} refused the cargo and charged ${fee} obols.`, 'warn');
    }
  }

  daily() {
    const g = this.game;
    const s = this.state;
    // upkeep: your ports and your ships (unpaid → arrears, paid first next time)
    let run = 0;
    for (const id of this.ownedPorts()) run += this.portType(id).upkeep;
    for (const v of this.vessels()) if (v.status !== 'lost') run += this.stats(v).upkeep;
    const due = s.arrears + Math.round(run * (1 - g.corp.personnel.effect('shipping', 'upkeep'))); // v0.62.0: a good manager keeps it sound for less
    const pay = Math.min(due, Math.max(0, g.corp.cashOf('shipping')));
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
        this.spend(Math.min(fee, Math.max(0, g.corp.cashOf('shipping'))), 'penalty');
        this.report('contract', `✖ You never shipped ${this.cfg.clients[c.client].name}'s cargo. Penalty ${fee} obols.`, 'warn');
      }
    }
    s.contracts = s.contracts.filter((c) => !['expired', 'delivered', 'failed', 'lost'].includes(c.status) || g.clock.day - c.offered < 10);
    if (s.lastContractDay < g.clock.day) {
      s.lastContractDay = g.clock.day;
      this.postContracts();
    }
    this.missions.daily();
    this.shipyard.daily();
  }

  /** Pay off arrears now (if you can). */
  payArrears() {
    const s = this.state;
    if (!s.arrears) return { ok: false, text: 'Nothing owed.' };
    if (!this.game.corp.canAfford('shipping', s.arrears)) return { ok: false, text: `You owe ${s.arrears} obols.` };
    this.spend(s.arrears, 'upkeep');
    s.arrears = 0;
    return { ok: true, text: 'Arrears paid. Your ships may sail.' };
  }

  /** Daily running cost of the company at rest. */
  dailyUpkeep() {
    let n = 0;
    for (const id of this.ownedPorts()) n += this.portType(id).upkeep;
    for (const v of this.vessels()) if (v.status !== 'lost') n += this.stats(v).upkeep;
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
    if (act.action === 'wheel' || act.action === 'logbook') {
      const v = this.vessel(act.vessel);
      if (!v) return { type: 'message', text: prop.examine || '' };
      if (act.action === 'logbook') return { type: 'panel', panel: 'logbook', opts: { vessel: v.id } };
      const m = this.model(v.model);
      const where = v.status === 'loading' ? `loading at ${this.port(v.port).name}` : `alongside at ${this.port(v.port).name}`;
      const st = this.stats(v);
      const lines = [
        `You take the ${v.name}'s wheel. She's ${where}, hull at ${Math.round(v.condition)}%${v.cargo ? `, ${v.cargo.units} units in the hold` : ''}.`,
        `${m.name}: ${st.speed} knots flat out, ${Math.round(st.range / 1000)}k km between fuel stops.`,
        v.log.length ? `Last voyage: ${this.port(v.log[0].from || v.port)?.name || '—'} → ${this.port(v.log[0].to || v.port)?.name || '—'}.` : 'She hasn\'t sailed for you yet.',
        'Orders are given from Fleet Command — but it does feel good to hold her.',
      ];
      return { type: 'message', text: lines.join(' ') };
    }
    return { type: 'message', text: prop.examine || '' };
  }

  // ------------------------------------------------------------- choosing for you (v0.25.0)
  /**
   * The best ship for a contract right now: on time first, then the most
   * profit after the expected cost of trouble (chance × pay). Returns
   * { vessel, quote } or null when no ship can take it. opts as for quote().
   */
  bestShipFor(cid, opts = {}) {
    const c = this.contract(cid);
    if (!c) return null;
    let best = null;
    for (const v of this.vessels()) {
      if (v.status !== 'docked' || (opts.escorts || []).includes(v.id)) continue;
      const q = this.quote(cid, v.id, opts);
      if (!q.ok) continue;
      const score = (q.onTime ? 1e9 : 0) + q.profit - q.risk.chance * c.pay * (c.insured || opts.insure ? 0.4 : 1);
      if (!best || score > best.score) best = { vessel: v, quote: q, score };
    }
    return best;
  }

  /** A free warship at the contract's port that would escort it (the strongest), or null. */
  suggestEscort(cid, exclude = []) {
    const c = this.contract(cid);
    if (!c) return null;
    const ws = this.vessels().filter((w) => w.kind === 'warship' && w.status === 'docked' && w.port === c.from && !exclude.includes(w.id) && this.stats(w).tags.includes('escort'));
    ws.sort((a, b) => { const A = this.stats(a).combat; const B = this.stats(b).combat; return (B.attack + B.defense) - (A.attack + A.defense); });
    return ws[0] || null;
  }

  /** Ships with nothing to do (docked, no cargo). */
  idle() {
    return this.vessels().filter((v) => v.status === 'docked' && !v.contract && !v.cargo);
  }

  /** Contracts you could send right now, best first: [{ contract, vessel, quote }]. */
  opportunities(limit = 5) {
    const out = [];
    for (const c of this.contracts(['available', 'accepted'])) {
      const b = this.bestShipFor(c.id);
      if (b) out.push({ contract: c, vessel: b.vessel, quote: b.quote });
    }
    return out.sort((a, b) => b.quote.profit - a.quote.profit).slice(0, limit);
  }

  /** When the next thing happens in the fleet (an arrival, a departure, a mission's end, a launch), or null. */
  nextEvent() {
    const now = this.game.clock.total;
    const times = [];
    for (const v of this.vessels()) {
      if (v.status === 'underway') times.push(v.voyage.arrive);
      if (v.status === 'loading' && v.loadUntil !== undefined) times.push(v.loadUntil);
    }
    for (const m of this.missions.list('active')) times.push(m.end);
    for (const b of this.shipyard.state.builds) if (b.status === 'building') times.push(b.end);
    for (const id of this.ownedPorts()) { const y = this.shipyard.yard(id); if (y?.status === 'building') times.push(y.end); }
    const next = times.filter((t) => t > now).sort((a, b) => a - b)[0];
    return next ?? null;
  }

  /** What's on the home shipyard's slip (for the Yards slipway drawing). */
  slip() {
    if (!this.owned) return null;
    const b = this.shipyard.buildsAt(this.L.homePort)[0];
    if (!b) return null;
    const spec = this.shipyard.compute(b.design);
    return { name: b.design.name, look: spec.look, progress: Math.min(1, (this.game.clock.total - b.start) / Math.max(1, b.end - b.start)) };
  }

  /** Ships to draw at a Yards berth (slot 0–2): the port it represents, and its docked ships you've left visible. */
  berth(slot) {
    const id = this.game.world.logistics?.display?.berths?.[slot];
    if (!id || !this.owned) return null;
    return { port: id, name: this.port(id).name, ships: this.atPort(id).filter((v) => v.visible && v.status !== 'mission') };
  }
}
