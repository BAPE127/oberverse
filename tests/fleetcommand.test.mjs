// v0.25.0: the helpers behind Fleet Command's one-click orders — the best ship
// for a contract, a suggested escort, the best mission team, idle ships, the
// best jobs right now, and the next thing that will happen to the fleet.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, setTime } from './helpers.mjs';

const owned = (money = 5_000_000) => {
  const g = newGame(41);
  setTime(g, 1, '09:00');
  g.player.money = money;
  assert.ok(g.logistics.buyCompany().ok);
  return g;
};
const contract = (g, to, extra = {}) => {
  const c = { id: `cf${Math.random().toString(36).slice(2, 7)}`, type: 'general', client: 'cl_halver_mills', units: 10, from: 'port_millroad', to, km: g.logistics.route('port_millroad', to).km, pay: 6000, deadline: g.clock.total + 30 * 1440, offered: g.clock.day, expiresDay: g.clock.day + 9, status: 'available', ...extra };
  g.logistics.state.contracts.push(c);
  return c;
};

test('bestShipFor picks a ship that can actually do the job, and prefers the more profitable one', () => {
  const g = owned();
  const Lg = g.logistics;
  const c = contract(g, 'port_sund', { units: 50 });
  assert.equal(Lg.bestShipFor(c.id), null, 'the starter ship is too small for 50 units');
  assert.ok(Lg.buyShip('freighter', 'port_millroad').ok || Lg.buyShip(Lg.cfg.dealership[3], 'port_millroad').ok);
  const big = Lg.vessels().find((v) => Lg.stats(v).capacity >= 50);
  const b = Lg.bestShipFor(c.id);
  assert.equal(b.vessel.id, big.id);
  assert.ok(b.quote.ok && b.quote.onTime);
  // the chosen ship is never one that the quote rejects
  const small = contract(g, 'port_sund', { units: 5 });
  const s = Lg.bestShipFor(small.id);
  assert.ok(Lg.quote(small.id, s.vessel.id).ok);
  // and it really can be sent: accept + assign succeed
  assert.ok(Lg.accept(c.id).ok);
  assert.ok(Lg.assign(c.id, b.vessel.id).ok);
  assert.equal(Lg.bestShipFor(small.id)?.vessel.id === b.vessel.id, false, 'a busy ship is not offered again');
});

test('idle and opportunities: free ships, and jobs sorted by profit that only name ships able to take them', () => {
  const g = owned();
  const Lg = g.logistics;
  assert.equal(Lg.idle().length, 1);
  const a = contract(g, 'port_sund', { pay: 3000 });
  const b = contract(g, 'port_sund', { pay: 9000 });
  const ops = Lg.opportunities(10);
  assert.ok(ops.length >= 2);
  for (let i = 1; i < ops.length; i++) assert.ok(ops[i - 1].quote.profit >= ops[i].quote.profit, 'best first');
  assert.ok(ops.findIndex((o) => o.contract.id === b.id) < ops.findIndex((o) => o.contract.id === a.id));
  for (const o of ops) assert.ok(Lg.quote(o.contract.id, o.vessel.id).ok);
  Lg.accept(b.id);
  Lg.assign(b.id, ops[0].vessel.id);
  assert.equal(Lg.idle().length, 0, 'the only ship is busy');
  assert.equal(Lg.opportunities().length, 0, 'so nothing can be offered');
});

test('suggestEscort offers a free escort warship at the contract\'s port, never one already chosen', () => {
  const g = owned();
  const Lg = g.logistics;
  const c = contract(g, 'port_sund');
  assert.equal(Lg.suggestEscort(c.id), null, 'no warships yet');
  const id = Lg.cfg.warshipDealership.find((w) => Lg.cfg.ships[w].tags?.includes('escort'));
  assert.ok(id, 'an escort-class warship is for sale');
  assert.ok(Lg.buyShip(id, 'port_millroad').ok);
  const w = Lg.suggestEscort(c.id);
  assert.equal(w.kind, 'warship');
  assert.equal(Lg.suggestEscort(c.id, [w.id]), null, 'excluded once chosen');
});

test('bestTeam picks free ships at the mission\'s port that the quote accepts', () => {
  const g = owned();
  const Lg = g.logistics;
  for (const id of Lg.cfg.warshipDealership.slice(0, 3)) Lg.buyShip(id, 'port_millroad');
  g.skipTime(1440);
  const m = Lg.missions.list('available').find((x) => x.port === 'port_millroad');
  assert.ok(m, 'a mission at the home port');
  const t = Lg.missions.bestTeam(m.id);
  assert.ok(t, 'three warships make a team');
  assert.ok(t.ships.length >= 1 && t.ships.length <= Lg.L.missionShips);
  assert.deepEqual(Lg.missions.quote(m.id, t.ships), t.quote);
  for (const id of t.ships) assert.equal(Lg.vessel(id).port, m.port);
  assert.ok(Lg.missions.start(m.id, t.ships).ok);
  assert.equal(Lg.missions.bestTeam(m.id), null, 'not twice');
});

test('nextEvent is the next arrival/departure, and skipping to it changes the fleet', () => {
  const g = owned();
  const Lg = g.logistics;
  assert.equal(Lg.nextEvent(), null, 'nothing scheduled');
  const c = contract(g, 'port_sund');
  Lg.accept(c.id);
  const v = Lg.vessels()[0];
  assert.ok(Lg.assign(c.id, v.id).ok);
  const t1 = Lg.nextEvent();
  assert.ok(t1 > g.clock.total);
  g.skipTime(t1 - g.clock.total + 1);
  assert.equal(Lg.vessel(v.id).status, 'underway', 'loading done → under way');
  const t2 = Lg.nextEvent();
  assert.equal(t2, Lg.vessel(v.id).voyage.arrive);
  g.skipTime(t2 - g.clock.total + 1);
  assert.equal(Lg.vessel(v.id).status, 'docked');
  assert.equal(c.status, 'delivered');
});
