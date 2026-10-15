// v0.23.0: piracy and dangerous routes, the warship dealership, escorts,
// guards and cargo insurance, naval missions and fleet bonuses.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, setTime, CONTENT, Game } from './helpers.mjs';
import { roll, assess, exposure } from '../src/systems/piracy.js';

const C = CONTENT.logistics;
const owned = (money = 5_000_000) => {
  const g = newGame(21);
  setTime(g, 1, '09:00');
  g.player.money = money;
  assert.ok(g.logistics.buyCompany().ok);
  return g;
};
const reload = (g) => { const g2 = new Game(CONTENT, { seed: 3 }); g2.loadState(JSON.parse(JSON.stringify(g.serialize()))); return g2; };
/** An rng that returns these numbers, then 0.5 forever. */
const seq = (...xs) => ({ next: () => (xs.length ? xs.shift() : 0.5), pick: (a) => a[0] });
/** A test contract out of Mill Road to a port. */
const contract = (g, to, extra = {}) => {
  const c = { id: `ct${Math.random().toString(36).slice(2, 7)}`, type: 'general', client: 'cl_halver_mills', units: 10, from: 'port_millroad', to, km: g.logistics.route('port_millroad', to).km, pay: 6000, deadline: g.clock.total + 30 * 1440, offered: g.clock.day, expiresDay: g.clock.day + 9, status: 'available', ...extra };
  g.logistics.state.contracts.push(c);
  return c;
};

test('the warship dealership: every required class, distinct roles, no cargo unless the hull carries it', () => {
  const W = C.warshipDealership.map((id) => C.ships[id]);
  const names = W.map((m) => m.name);
  for (const n of ['Schooner', 'Brig', 'Galleon', 'Man-o\'-war', 'Cruiser', 'Frigate', 'Destroyer', 'Corvette', 'Patrol Skiff', 'Battleship']) assert.ok(names.includes(n), n);
  assert.ok(W.filter((m) => m.cls === 'futuristic').length >= 2, 'more than one futuristic warship');
  const fut = Math.min(...W.filter((m) => m.cls === 'futuristic').map((m) => m.price));
  assert.ok(W.filter((m) => m.cls !== 'futuristic').every((m) => m.price < fut), 'futuristic warships are the dearest');
  assert.ok(W.every((m) => m.kind === 'warship' && m.combat));
  assert.equal(C.ships.destroyer.capacity, 0);
  assert.ok(C.ships.galleon.capacity > 0, 'the galleon really has a hold');
  // no class is best at everything: the battleship out-fights the skiff, the skiff out-scouts and out-hides it
  const b = C.ships.battleship.combat;
  const s = C.ships.skiff.combat;
  assert.ok(b.attack > s.attack && s.stealth > b.stealth);
  // buying one
  const g = owned();
  const r = g.logistics.buyShip('frigate', 'port_millroad', 'HMS Kettle');
  assert.ok(r.ok, r.text);
  assert.equal(r.vessel.kind, 'warship');
  assert.equal(g.logistics.buyShip('sentinel', 'port_millroad').ok, false, 'futuristic warships need an advanced port or naval base');
  // a warship with no hold can't take a cargo contract
  const c = contract(g, 'port_sund');
  assert.match(g.logistics.quote(c.id, r.vessel.id).reasons.join(), /holds 0/);
});

test('risk follows the world: wars and embargoes make water dangerous; safe home water stays safe', () => {
  const g = owned();
  const Lg = g.logistics;
  const v = Lg.vessels()[0];
  // the guaranteed first offer at each port keeps to safe water
  for (const port of Lg.ownedPorts()) {
    const first = Lg.contracts('available').find((x) => x.from === port);
    if (first) assert.ok(exposure(Lg.route(first.from, first.to), Lg.zones()).maxDanger < 0.2, `${port}'s first offer is in safe water`);
  }
  const home = Lg.voyageRisk(v, 'port_millroad', 'port_sund', { cargo: 'general' });
  assert.equal(home.category, 'low');
  assert.equal(home.worst, 'delay', 'safe water never costs a cargo or a ship');
  const M = g.market.state;
  M.wars = [];
  const before = Lg.voyageRisk(v, 'port_millroad', 'port_ostmark', { cargo: 'general' });
  M.wars.push({ a: 'ostmark', b: 'sund', since: 1 });
  const after = Lg.voyageRisk(v, 'port_millroad', 'port_ostmark', { cargo: 'general' });
  assert.ok(after.chance > before.chance * 1.5, `war raises the risk (${before.chance} → ${after.chance})`);
  assert.ok(after.exposure.names.some((n) => /war zone/.test(n)));
  // high-value cargo and arms attract more trouble than an empty hull
  const empty = Lg.voyageRisk(v, 'port_millroad', 'port_ostmark', {});
  const arms = Lg.voyageRisk(v, 'port_millroad', 'port_ostmark', { cargo: 'arms' });
  assert.ok(arms.chance > after.chance && after.chance > empty.chance);
});

test('escorts and guards: lower risk, stronger defence, and an escorted ship is never captured', () => {
  const g = owned();
  const Lg = g.logistics;
  const v = Lg.vessels()[0];
  const f = Lg.buyShip('frigate', 'port_millroad', 'Kettle').vessel;
  const to = 'port_pallas_south';
  const alone = Lg.voyageRisk(v, 'port_millroad', to, { cargo: 'general' });
  const guarded = Lg.voyageRisk(v, 'port_millroad', to, { cargo: 'general', guards: true });
  const escorted = Lg.voyageRisk(v, 'port_millroad', to, { cargo: 'general', escorts: [f.id] });
  assert.ok(escorted.chance < alone.chance);
  assert.ok(guarded.defense > alone.defense && escorted.defense > guarded.defense);
  assert.equal(alone.worst, 'captured');
  assert.equal(escorted.worst, 'cargo', 'escorts never let a ship be taken');
  // the dice: a sure encounter and a terrible fight
  const sure = { ...alone, chance: 1 };
  assert.equal(roll(seq(0, 0.99), sure, C.risk, { defense: 0, escorted: false, cargo: true }).outcome, 'captured');
  assert.equal(roll(seq(0, 0.99), sure, C.risk, { defense: 0, escorted: true, cargo: true }).outcome, 'cargo');
  assert.equal(roll(seq(0, 0.0), sure, C.risk, { defense: 300, escorted: true, cargo: true }).outcome, 'repelled');
  assert.equal(roll(seq(0.99), alone, C.risk, { defense: 0, escorted: false, cargo: true }), null, 'no encounter at all, mostly');
});

test('a convoy: escorts load, sail and arrive with the cargo ship; costs once; the risk is rolled once and kept', () => {
  const g = owned();
  const Lg = g.logistics;
  const v = Lg.vessels()[0];
  const f = Lg.buyShip('corvette', 'port_millroad', 'Bramble').vessel;
  const c = contract(g, 'port_lirre');
  const q = Lg.quote(c.id, v.id, { escorts: [f.id], guards: true, insure: true });
  assert.ok(q.ok, q.reasons.join());
  assert.ok(q.escortCost > 0 && q.services > 0);
  const m0 = g.player.money;
  assert.ok(Lg.assign(c.id, v.id, { escorts: [f.id], guards: true, insure: true }).ok);
  assert.equal(m0 - g.player.money, q.cost);
  assert.equal(f.status, 'loading');
  assert.equal(Lg.assign(contract(g, 'port_sund').id, v.id).ok, false, 'busy');
  g.skipTime(v.loadUntil - g.clock.total + 5);
  assert.equal(v.status, 'underway');
  assert.equal(f.status, 'underway');
  assert.equal(f.voyage.escortOf, v.id);
  assert.equal(f.voyage.arrive, v.voyage.arrive, 'they sail together');
  const events = JSON.stringify(v.voyage.events);
  const g2 = reload(g);
  assert.equal(JSON.stringify(g2.logistics.vessel(v.id).voyage.events), events, 'nothing re-rolled on load');
  g2.skipTime(4 * 1440);
  const v2 = g2.logistics.vessel(v.id);
  const f2 = g2.logistics.vessel(f.id);
  assert.equal(f2.status, 'docked');
  assert.equal(f2.port, 'port_lirre');
  assert.ok(['docked', 'lost'].includes(v2.status));
  assert.notEqual(v2.status, 'lost', 'escorted: never captured');
});

test('pirates take a ship: the contract is lost, insurance pays, the ship is gone — and none of it repeats after a reload', () => {
  const g = owned();
  const Lg = g.logistics;
  const v = Lg.vessels()[0];
  const c = contract(g, 'port_pallas_south');
  assert.ok(Lg.assign(c.id, v.id, { insure: true }).ok);
  g.skipTime(v.loadUntil - g.clock.total + 5);
  // force the stored encounter (as if it had been rolled at departure)
  v.voyage.events = [{ kind: 'pirates', at: g.clock.total + 120, hours: 10, done: false, outcome: 'captured', cost: 0, damage: 0, pirates: 99, where: 'the Pallas Reach' }];
  const g2 = reload(g);
  const L2 = g2.logistics;
  const rev0 = L2.state.ledger.revenue;
  g2.skipTime(200);
  const v2 = L2.vessel(v.id);
  const c2 = L2.contract(c.id);
  assert.equal(v2.status, 'lost');
  assert.equal(c2.status, 'lost');
  assert.equal(L2.state.ledger.revenue - rev0, Math.round(c.pay * C.risk.insurance.payout), 'insurance paid once');
  g2.skipTime(5 * 1440);
  assert.equal(L2.state.ledger.revenue - rev0, Math.round(c.pay * C.risk.insurance.payout), 'and never again');
  assert.equal(L2.position(v2), null);
  assert.ok(L2.state.reports.some((r) => /captured/.test(r.text)));
  assert.ok(!L2.vessels().filter((x) => x.status !== 'lost').includes(v2));
});

test('pirates seize arms cargo from your own ship: the market settles it as hijacked, once', () => {
  const g = owned();
  const Lg = g.logistics;
  g.world.arms.licence = true;
  g.setFlag('arms_licence', true);
  g.setFlag('owns_aw1', true);
  const M = g.market;
  const item = Object.keys(CONTENT.items).find((id) => CONTENT.items[id].arms?.crate);
  M.state.orders = [{ id: 901, country: 'lirre', item, qty: 10, price: 900, posted: 1, expires: 9, status: 'open' }];
  g.world.containers[g.arms.def('aw1').outCrate].items[item] = 10;
  const v = Lg.vessels()[0];
  assert.ok(M.ship({ wh: 'aw1', order: 901, vessel: v.id }).ok);
  g.skipTime(v.loadUntil - g.clock.total + 5);
  v.voyage.events = [{ kind: 'pirates', at: g.clock.total + 60, hours: 8, done: false, outcome: 'cargo', cost: 0, damage: 12, pirates: 80, where: 'open water' }];
  const earned = M.state.earned;
  g.skipTime(120);
  assert.equal(M.state.orders[0].status, 'lost');
  assert.equal(v.cargo, null);
  assert.equal(v.status, 'underway', 'the ship sails on');
  g.skipTime(4 * 1440);
  assert.equal(v.status, 'docked');
  assert.equal(M.state.earned, earned, 'no payment for a hijacked cargo');
});

test('missions: the right ship for the job, requirements enforced, the outcome rolled once, paid once', () => {
  const g = owned();
  const Lg = g.logistics;
  const Ms = Lg.missions;
  const sk = Lg.buyShip('skiff', 'port_millroad', 'Gnat').vessel;
  const bb = Lg.buyShip('battleship', 'port_lirre', 'Unthinkable');
  assert.ok(!bb.ok, 'a battleship needs a big port');
  const de = Lg.buyShip('destroyer', 'port_millroad', 'Vexed').vessel;
  const mk = (type, extra = {}) => { const m = { id: `mx${type}`, type, port: 'port_millroad', zone: Ms.nearestZone('port_millroad'), difficulty: 0.5, hours: 30, reward: 8000, status: 'available', offered: g.clock.day, expiresDay: g.clock.day + 3, vessels: [], ...extra }; Ms.state.missions.push(m); return m; };
  const recon = mk('recon');
  const deter = mk('deterrence');
  // the skiff is the better scout; the destroyer the better enforcer
  assert.ok(Ms.score('recon', [sk.id]) > Ms.score('deterrence', [sk.id]));
  assert.ok(Ms.score('deterrence', [de.id]) > Ms.score('deterrence', [sk.id]));
  // requirements: a cargo coaster can't do a deterrence sweep
  assert.match(Ms.quote(deter.id, [Lg.vessels()[0].id]).reasons.join(), /escort/);
  assert.equal(Ms.quote(deter.id, []).ok, false);
  // run one, through a reload
  const q = Ms.quote(deter.id, [de.id]);
  assert.ok(q.ok, q.reasons.join());
  const m0 = g.player.money;
  assert.ok(Ms.start(deter.id, [de.id]).ok);
  assert.equal(m0 - g.player.money, q.cost);
  assert.equal(de.status, 'mission');
  assert.equal(Ms.start(recon.id, [de.id]).ok, false, 'one mission at a time');
  const g2 = reload(g);
  const M2 = g2.logistics.missions;
  const res = M2.get(deter.id).outcome.result;
  const rev0 = g2.logistics.state.ledger.revenue;
  g2.skipTime(31 * 60);
  const m2 = M2.get(deter.id);
  assert.equal(m2.status, res === 'failure' ? 'failed' : res, 'the stored outcome');
  assert.equal(g2.logistics.vessel(de.id).status, 'docked');
  const paid = g2.logistics.state.ledger.revenue - rev0;
  assert.equal(paid, res === 'success' ? 8000 : res === 'partial' ? 4000 : 0);
  g2.skipTime(600);
  assert.equal(g2.logistics.state.ledger.revenue - rev0, paid, 'paid once');
  if (res === 'success') assert.ok(g2.logistics.state.suppressed[deter.zone] > g2.clock.total, 'the pirate water is suppressed');
});

test('a successful deterrence sweep makes its water safer for everyone', () => {
  const g = owned();
  const Lg = g.logistics;
  const v = Lg.vessels()[0];
  const before = Lg.voyageRisk(v, 'port_millroad', 'port_pallas_south', { cargo: 'general' });
  Lg.state.suppressed.pz_pallas = g.clock.total + 5 * 1440;
  const after = Lg.voyageRisk(v, 'port_millroad', 'port_pallas_south', { cargo: 'general' });
  assert.ok(after.chance < before.chance);
  // port protection
  Lg.state.protected.port_millroad = g.clock.total + 1440;
  assert.ok(Lg.voyageRisk(v, 'port_millroad', 'port_pallas_south', { cargo: 'general' }).chance < after.chance);
});

test('fleet bonuses apply in their scope, once each', () => {
  const g = owned();
  const Lg = g.logistics;
  assert.equal(Lg.activeBonuses('port_millroad').length, 0);
  Lg.buyShip('frigate', 'port_millroad', 'A');
  Lg.buyShip('frigate', 'port_millroad', 'B');
  const b = Lg.activeBonuses('port_millroad');
  assert.equal(b.filter((x) => x.id === 'fleet_comms').length, 1, 'two frigates, one bonus');
  const cr = Lg.buyShip('cruiser', 'port_millroad', 'C').vessel;
  assert.ok(Lg.activeBonuses('port_millroad').some((x) => x.id === 'fleet_support'), 'at its port');
  assert.ok(!Lg.activeBonuses('port_sund').some((x) => x.id === 'fleet_support'), 'not elsewhere');
  void cr;
});

test('content: logistics registries validate', async () => {
  const { validateContent } = await import('../tools/validate-content.mjs');
  const { errors } = validateContent(CONTENT);
  assert.deepEqual(errors.filter((e) => e.startsWith('logistics')), []);
  // a broken entry is caught
  const bad = { ...CONTENT, logistics: { ...C, ships: { ...C.ships, broken: { name: 'Broken', kind: 'cargo', cls: 'nope', price: -1, capacity: 0, speed: 0, range: 0, reliability: 2, opex: 0, upkeep: 0, look: {} } } } };
  assert.ok(validateContent(bad).errors.filter((e) => e.includes('broken')).length >= 3);
  void assess;
});
