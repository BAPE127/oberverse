// Ober & Sons Maritime (v0.21.0): buying the company, ports and the 30-port
// cap, the ship brokerage, contracts and voyages on the clock, sea routes,
// upkeep and arrears, the Yards berths, saves.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, setTime, CONTENT, Game } from './helpers.mjs';
import { seaRoute, pointAlong } from '../src/world/seaRoutes.js';
import { isLand } from '../src/world/globe.js';
import { findPath } from '../src/world/pathfinding.js';

const C = CONTENT.logistics;
const fresh = (money = 200000) => {
  const g = newGame(11);
  setTime(g, 1, '09:00');
  g.player.money = money;
  return g;
};
const owned = (money) => {
  const g = fresh(money);
  assert.ok(g.logistics.buyCompany().ok);
  return g;
};
const tick = (g, minutes) => { for (let i = 0; i < minutes; i++) { g.clock.total++; g.minuteTick(); } };
const reload = (g) => { const g2 = new Game(CONTENT, { seed: 1 }); g2.loadState(JSON.parse(JSON.stringify(g.serialize()))); return g2; };
/** A contract the starter ship can take right now (offers are posted with one per port it can carry). */
const doable = (g) => {
  const Lg = g.logistics;
  const v = Lg.vessels()[0];
  return { v, c: Lg.contracts('available').find((c) => Lg.quote(c.id, v.id).ok) };
};

test('content: required cargo classes, a valid catalogue, ports with real sea routes', () => {
  for (const k of ['low', 'medium', 'high', 'superhigh', 'futuristic']) assert.ok(C.classes[k], k);
  assert.ok(Object.keys(C.ships).length >= 10);
  const prices = (cls) => Object.values(C.ships).filter((m) => m.cls === cls).map((m) => m.price);
  assert.ok(Math.min(...prices('futuristic')) > Math.max(...prices('superhigh')), 'futuristic is the most expensive');
  for (const m of Object.values(C.ships)) for (const f of ['price', 'capacity', 'speed', 'range', 'reliability', 'opex', 'upkeep']) assert.ok(m[f] > 0, `${m.name} ${f}`);
  assert.ok(Object.keys(C.ports).length > C.rules.maxPorts, 'more ports than the cap, so the cap matters');
  const cs = CONTENT.arms.countries;
  for (const [id, p] of Object.entries(C.ports)) {
    assert.ok(C.portTypes[p.type], `${id} type`);
    assert.ok(!p.country || cs[p.country], `${id} country`);
    const r = seaRoute([C.ports.port_millroad.lat, C.ports.port_millroad.lon], [p.lat, p.lon], cs);
    assert.ok(id === 'port_millroad' || r, `${id} is reachable by sea`);
  }
});

test('sea routes go round the land, not over it', () => {
  const cs = CONTENT.arms.countries;
  const a = C.ports.port_millroad;
  const b = C.ports.port_morrow;
  const r = seaRoute([a.lat, a.lon], [b.lat, b.lon], cs);
  assert.ok(r.km > 10000);
  let land = 0;
  for (let f = 0.02; f < 0.98; f += 0.01) { const [la, lo] = pointAlong(r, f); if (isLand(la, lo, cs)) land++; }
  assert.ok(land <= 3, `${land}% of the route over land`);
});

test('buying the company: the price once, three ports and one low-end ship — and never twice', () => {
  const g = fresh(100000);
  const Lg = g.logistics;
  assert.equal(Lg.owned, false);
  const offer = Lg.offer();
  assert.equal(offer.price, C.rules.price);
  assert.equal(offer.ports.length, 3);
  assert.ok(Lg.buyCompany().ok);
  assert.equal(g.player.money, 100000 - C.rules.price);
  assert.equal(Lg.ownedPorts().length, 3);
  const vs = Lg.vessels();
  assert.equal(vs.length, 1);
  assert.equal(C.ships[vs[0].model].cls, 'low');
  assert.equal(vs[0].status, 'docked');
  assert.equal(vs[0].port, C.rules.starterPorts[0]);
  assert.ok(vs[0].condition === 100 && C.ships[vs[0].model].capacity > 0);
  assert.equal(Lg.buyCompany().ok, false);
  assert.equal(g.player.money, 100000 - C.rules.price);
  assert.equal(Lg.vessels().length, 1);
  assert.ok(Lg.contracts('available').length > 0, 'contracts are on offer straight away');
});

test('no money, no company — and nothing granted', () => {
  const g = fresh(1000);
  const r = g.logistics.buyCompany();
  assert.equal(r.ok, false);
  assert.equal(g.player.money, 1000);
  assert.equal(g.logistics.owned, false);
  assert.equal(g.logistics.vessels().length, 0);
});

test('ports: buy up to 30; the 31st is refused; the berth display never changes ownership', () => {
  const g = owned(10_000_000);
  const Lg = g.logistics;
  const forSale = Object.keys(C.ports).filter((id) => !Lg.ownsPort(id));
  for (const id of forSale) if (Lg.ownedPorts().length < 30) assert.ok(Lg.buyPort(id).ok, id);
  assert.equal(Lg.ownedPorts().length, 30);
  const extra = forSale.find((id) => !Lg.ownsPort(id));
  const before = g.player.money;
  const r = Lg.buyPort(extra);
  assert.equal(r.ok, false);
  assert.match(r.text, /30/);
  assert.equal(g.player.money, before);
  // the Yards berths show any three owned ports
  const ports = Lg.ownedPorts();
  assert.ok(Lg.setBerth(0, ports[10]).ok);
  assert.equal(Lg.state.display.berths[0], ports[10]);
  assert.equal(Lg.setBerth(1, extra).ok, false, 'only ports you own');
  assert.equal(Lg.ownedPorts().length, 30);
  const g2 = reload(g);
  assert.equal(g2.logistics.state.display.berths[0], ports[10], 'kept after loading');
});

test('the brokerage: one ship, charged once; failures change nothing; stable ids', () => {
  const g = owned(100000);
  const Lg = g.logistics;
  const money = g.player.money;
  const r = Lg.buyShip('westbrook_freighter', 'port_millroad', 'Dee\'s Delight');
  assert.ok(r.ok, r.text);
  assert.equal(g.player.money, money - C.ships.westbrook_freighter.price);
  assert.equal(Lg.vessels().length, 2);
  assert.equal(r.vessel.name, 'Dee\'s Delight');
  assert.ok(Lg.vessel(r.vessel.id));
  // can't afford / doesn't fit / not your port
  const m2 = g.player.money;
  assert.equal(Lg.buyShip('starwake_advanced', 'port_millroad').ok, false, 'needs an advanced port');
  assert.equal(Lg.buyShip('grand_meridian', 'port_millroad').ok, false, 'too big for a commercial port (or too dear)');
  assert.equal(Lg.buyShip('gullwing_cutter', 'port_teshvar').ok, false, 'not your port');
  assert.equal(g.player.money, m2);
  assert.equal(Lg.vessels().length, 2);
  // renaming keeps the id
  const id = r.vessel.id;
  Lg.rename(id, 'Second Wind');
  assert.equal(Lg.vessel(id).name, 'Second Wind');
});

test('a contract: accept, assign, load, sail, deliver — paid exactly once; ship and contract stay in step', () => {
  const g = owned(100000);
  const Lg = g.logistics;
  const { v, c } = doable(g);
  assert.ok(c, 'a contract the starter ship can do');
  const q = Lg.quote(c.id, v.id);
  assert.ok(q.onTime);
  assert.ok(Lg.accept(c.id).ok);
  const m0 = g.player.money;
  assert.ok(Lg.assign(c.id, v.id).ok);
  assert.equal(g.player.money, m0 - q.cost, 'running costs and fees, up front');
  assert.equal(v.status, 'loading');
  assert.equal(c.status, 'loading');
  // a second contract can't take the same ship
  const other = Lg.contracts('available')[0];
  if (other) assert.equal(Lg.assign(other.id, v.id).ok, false);
  tick(g, 6 * 60);
  assert.equal(v.status, 'underway');
  assert.equal(c.status, 'transit');
  assert.equal(v.port, null, 'not in two places');
  const rev0 = Lg.state.ledger.revenue;
  g.skipTime(v.voyage.arrive - g.clock.total + 60);
  assert.equal(v.status, 'docked');
  assert.equal(v.port, c.to);
  assert.equal(c.status, 'delivered');
  assert.ok(c.result.paid >= c.pay, 'paid in full');
  assert.equal(Lg.state.ledger.revenue - rev0, c.result.paid, 'and booked once');
  // it never pays again
  const m2 = g.player.money;
  Lg.arrive({ ...v, status: 'underway', voyage: { from: c.from, to: c.to, km: 1, events: [], contract: c.id }, model: v.model });
  assert.equal(g.player.money, m2);
  assert.ok(v.condition < 100, 'the voyage wore the hull');
});

test('capacity, tags and range are enforced by the simulation', () => {
  const g = owned(100000);
  const Lg = g.logistics;
  const v = Lg.vessels()[0];
  const big = { id: 'cX', type: 'general', client: 'cl_halver_mills', units: 999, from: v.port, to: 'port_lirre', km: 7000, pay: 1, deadline: g.clock.total + 99999, offered: 1, expiresDay: 9, status: 'available' };
  const reefer = { ...big, id: 'cY', type: 'reefer', units: 5 };
  Lg.state.contracts.push(big, reefer);
  assert.match(Lg.quote('cX', v.id).reasons.join(), /holds 20/);
  assert.match(Lg.quote('cY', v.id).reasons.join(), /reefer/);
  assert.equal(Lg.assign('cX', v.id).ok, false);
  const far = Lg.plan(v, 'port_morrow');
  assert.equal(far.ok, false);
  assert.match(far.reasons.join(), /range/);
});

test('voyages persist: position comes from the clock, survives saving, and arrival resolves once', () => {
  const g = owned(100000);
  const Lg = g.logistics;
  const v = Lg.vessels()[0];
  assert.ok(Lg.sail(v.id, 'port_lirre').ok);
  tick(g, 600);
  const p1 = Lg.position(v);
  assert.ok(p1.f > 0 && p1.f < 1);
  const g2 = reload(g);
  const v2 = g2.logistics.vessel(v.id);
  assert.equal(v2.status, 'underway');
  assert.deepEqual(g2.logistics.position(v2), p1, 'same place after loading');
  assert.deepEqual(v2.voyage.events, v.voyage.events, 'delays were rolled at departure, not re-rolled');
  const reports = g2.logistics.state.reports.length;
  g2.skipTime(4 * 1440);
  assert.equal(v2.status, 'docked');
  assert.equal(v2.port, 'port_lirre');
  const arrivals = g2.logistics.state.reports.filter((r) => /reached Port Lirre/.test(r.text)).length;
  assert.equal(arrivals, 1);
  g2.skipTime(60);
  assert.equal(g2.logistics.state.reports.filter((r) => /reached Port Lirre/.test(r.text)).length, 1, 'no second arrival');
  assert.ok(g2.logistics.state.reports.length > reports);
});

test('upkeep each morning; unpaid becomes arrears that hold sailings', () => {
  const g = owned(C.rules.price);
  const Lg = g.logistics;
  assert.equal(g.player.money, 0);
  setTime(g, 2, '05:59');
  tick(g, 2);
  assert.ok(Lg.state.arrears > 0);
  const v = Lg.vessels()[0];
  assert.match(Lg.plan(v, 'port_sund').reasons.join(), /arrears|upkeep/);
  g.player.money = 10000;
  assert.ok(Lg.payArrears().ok);
  assert.equal(Lg.state.arrears, 0);
  assert.ok(Lg.plan(v, 'port_sund').ok);
});

test('late and never-shipped contracts: penalties, no pay', () => {
  const g = owned(100000);
  const Lg = g.logistics;
  const { c } = doable(g);
  Lg.accept(c.id);
  g.skipTime(c.deadline - g.clock.total + C.rules.lateGraceDays * 1440 + 1440);
  assert.equal(c.status, 'failed');
  assert.equal(c.result.paid, 0);
  assert.ok(c.result.penalty > 0);
});

test('Old saves load without the company; it is not granted for free', () => {
  const g = fresh(5000);
  const data = JSON.parse(JSON.stringify(g.serialize()));
  delete data.world.logistics;
  data.gameVersion = '0.20.0';
  const g2 = new Game(CONTENT, { seed: 1 });
  g2.loadState(data);
  assert.equal(g2.logistics.owned, false);
  assert.equal(g2.logistics.offer().price, C.rules.price);
});

test('the Yards docks: three berths that show your ports\' ships, the harbour office and the Salty Ober', () => {
  const g = owned(100000);
  const yards = g.maps.get('yards');
  const berths = yards.props.filter((p) => p.type === 'shipberth');
  assert.equal(berths.length, 3);
  const b = g.logistics.berth(0);
  assert.equal(b.port, 'port_millroad');
  assert.equal(b.ships.length, 1);
  g.logistics.setVisible(b.ships[0].id, false);
  assert.equal(g.logistics.berth(0).ships.length, 0, 'hidden ships aren\'t drawn');
  assert.ok(yards.doors.some((d) => d.to?.map === 'ober_office'));
  assert.ok(yards.doors.some((d) => d.to?.map === 'salty_ober'));
  // the office terminal opens the logistics panel
  g.changeMap('ober_office', 'entry');
  const term = g.currentMap().props.find((p) => p.interact?.kind === 'logistics');
  assert.equal(g.logistics.interact(term).type, 'panel');
  // and the quay, the office door and the Salty Ober's gangway are reachable on foot from the yard gate
  for (const spot of ['ober_office_out', 'quay', 'salty_gangway']) {
    const a = yards.spots.east_gate;
    const b = yards.spots[spot];
    assert.ok(findPath(yards, a.x, a.y, b.x, b.y)?.length, spot);
  }
});
