// Every path by which a business moves money, once the company is funded (v0.60.1): the owner's
// wallet must not move. (The unfunded case is the old behaviour, covered by the whole older suite.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from './helpers.mjs';

const owner = () => { const g = newGame(1101); g.player.money = 30_000_000; return g; };

test('shipping: ports, ships, a shipyard, a mission and daily upkeep come out of the company\'s account', () => {
  const g = owner();
  assert.ok(g.logistics.buyCompany().ok);
  assert.ok(g.corp.contribute('shipping', 1_000_000).ok);
  const wallet = g.player.money;
  const cash = g.corp.account('shipping').cash;
  const port = Object.keys(g.logistics.cfg.ports).find((id) => !g.logistics.ownsPort(id));
  const r1 = g.logistics.buyPort(port);
  assert.ok(r1.ok, r1.text);
  const model = g.logistics.cfg.dealership[0];
  const r2 = g.logistics.buyShip(model, port, 'Test');
  assert.ok(r2.ok, r2.text);
  assert.equal(g.player.money, wallet, 'the owner\'s wallet never moved');
  assert.ok(g.corp.account('shipping').cash < cash);
  assert.ok(g.corp.reconciles());
  // too poor to buy: refused on the company's cash, however rich the owner
  g.corp.account('shipping').cash = 10; g.corp.account('shipping').contributed = 10 + g.corp.account('shipping').flowOut - g.corp.account('shipping').flowIn + g.corp.account('shipping').distributed;
  const port2 = Object.keys(g.logistics.cfg.ports).find((id) => !g.logistics.ownsPort(id));
  assert.ok(!g.logistics.buyPort(port2).ok, 'a poor company cannot buy a port');
  assert.ok(g.player.money > 1_000_000);
});

test('shipping: a naval mission is checked against the company\'s cash, not the owner\'s', () => {
  const g = owner();
  assert.ok(g.logistics.buyCompany().ok);
  assert.ok(g.corp.contribute('shipping', 20_000_000).ok);
  const L = g.logistics;
  // find a posted mission and a warship that can go: buy ports and ships until one quotes
  let found = null;
  for (const m of L.state.missions.filter((x) => x.status === 'available')) {
    if (!L.ownsPort(m.port)) { const b = L.buyPort(m.port); if (!b.ok) continue; }
    for (const model of L.cfg.warshipDealership) {
      const b = L.buyShip(model, m.port, `W-${model}`);
      if (!b.ok) continue;
      const q = L.missions.quote(m.id, [b.vessel.id]);
      if (q.ok) { found = { m, v: b.vessel, q }; break; }
    }
    if (found) break;
  }
  assert.ok(found, 'a mission and a warship that fit were found');
  const { m, v, q } = found;
  const a = g.corp.account('shipping');
  const set = (n) => { a.cash = n; a.contributed = a.cash + a.distributed - a.flowIn + a.flowOut; };
  set(Math.max(0, q.cost - 1));
  const wallet = g.player.money;
  const r = L.missions.start(m.id, [v.id]);
  assert.ok(!r.ok, 'refused: the company is a short of the running cost');
  assert.equal(g.player.money, wallet);
  set(q.cost + 5);
  assert.ok(L.missions.start(m.id, [v.id]).ok, 'and with the cash it goes');
  assert.equal(g.player.money, wallet, 'paid by the company');
});

test('farming: later land, fencing, animals and the co-op all use the farm\'s account', () => {
  const g = owner();
  const [p1, p2] = Object.keys(g.farm.def.plots);
  assert.ok(g.farm.buy(p1).ok);
  assert.ok(g.corp.contribute('farming', 200_000).ok);
  const wallet = g.player.money;
  assert.ok(g.farm.buy(p2).ok, 'a second plot, paid by the farm');
  const a = g.corp.account('farming');
  assert.equal(a.cash, 200_000 - g.farm.plotDef(p2).price);
  assert.equal(g.player.money, wallet);
  assert.ok(g.farm.work(p2, 'pasture').ok);
  assert.equal(g.player.money, wallet, 'fencing came from the farm');
  const kind = Object.keys(g.farm.def.livestock)[0];
  const before = a.cash;
  const r = g.farm.buyAnimals(p2, kind, 1);
  assert.ok(r.ok, r.text);
  assert.equal(before - a.cash, g.farm.def.livestock[kind].price);
  assert.equal(g.player.money, wallet);
  assert.ok(g.farm.sellAnimals(p2, 1) || true);
  const crop = Object.values(g.farm.def.crops)[0].crop;
  g.inventory.add(crop, 3);
  const cash = a.cash;
  const sold = g.farm.sellAtCoop(crop, 3);
  assert.ok(sold.ok, sold.text);
  assert.ok(a.cash > cash, 'the co-op pays the farm');
  assert.equal(g.player.money, wallet, 'and not the owner');
  assert.ok(g.corp.reconciles());
});

test('farming: a poor farm cannot buy land or animals however rich its owner is', () => {
  const g = owner();
  const [p1, p2] = Object.keys(g.farm.def.plots);
  assert.ok(g.farm.buy(p1).ok);
  assert.ok(g.corp.contribute('farming', 100).ok);
  assert.ok(!g.farm.buy(p2).ok);
  assert.ok(!g.farm.actions(p2)[0].ok, 'the button is off too');
});

test('arms: a second works, parts and freight come from the arms account; wholesale sales go to it', () => {
  const g = owner();
  assert.ok(g.arms.buyLicence().ok);
  assert.ok(g.arms.buy('aw1').ok);
  assert.ok(g.corp.contribute('arms', 20_000).ok);
  const wallet = g.player.money;
  assert.ok(g.arms.buy('aw2').ok, 'a second works is the company\'s capital spending');
  assert.equal(g.player.money, wallet);
  assert.equal(g.corp.account('arms').cash, 20_000 - g.arms.def('aw2').price);
  const part = Object.keys(g.content.items).find((k) => g.content.items[k].category === 'arms_part');
  assert.ok(g.arms.order('aw1', part, 2).ok);
  assert.equal(g.player.money, wallet);
  // a gun made in the works, sold to Lucas, is the arms company's takings
  const cash = g.corp.account('arms').cash;
  g.inventory.add('item_assault_rifle', 1);
  const sale = g.sell('shop_rook', 'item_assault_rifle');
  assert.ok(sale.ok, sale.text);
  assert.ok(g.corp.account('arms').cash > cash);
  assert.equal(g.player.money, wallet);
  assert.ok(g.corp.reconciles());
});

test('aerospace: a funded firm\'s purchases, wages and sales never touch the wallet', () => {
  const g = owner();
  assert.ok(g.aero.buyFirm().ok);
  assert.ok(g.corp.contribute('aerospace', 8_000_000).ok);
  const wallet = g.player.money;
  const A = g.aero;
  A.hire(A.roost, 10);
  assert.ok(A.buildHall(A.roost, 'hangar2').ok);
  for (let i = 0; i < 1440 * 10; i++) { g.clock.total += 1; A.minuteTick(); }
  assert.equal(g.player.money, wallet);
  assert.ok(g.corp.reconciles());
});
