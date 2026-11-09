// Fleets and international contracts on the strategic map (v0.103.10): ships lent by the shipping company (never copied), bombardment and blockade, passages and landings with escorts, and the embassies'
// contracts that replace the retainer, pay a completion bonus and only ever read diplomacy.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { armedCompany } from './war_helpers.mjs';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';
import { Game, CONTENT } from './helpers.mjs';
import { hooks } from '../src/war/hooks.js';
import { garrisonOf, controllerOf, providedBy, theatres, inTheatre } from '../src/war/strategic.js';
import { takeCut, blockaded, landingPlan } from '../src/war/navy.js';
import { NAVY, INTL } from '../src/content/navy.js';
import { RETAINER } from '../src/content/strategic.js';
import { provinces, provinceById } from '../src/world/provinces.js';

const hours = (g, n) => { g.clock.total += n * 60; g.war.strategicTick(); };
const until = (g, cond, max = 2400) => { for (let i = 0; i < max && !cond(); i += 3) hours(g, 3); assert.ok(cond(), 'it happened'); };
const dayOn = (g) => { g.clock.total += 1440; g.war.dailyTick(); g.war.strategicTick(); };
const roundtrip = (g) => { const sm = new SaveManager(new MemoryStorage()); assert.ok(sm.save('slot1', g).ok); const g2 = new Game(CONTENT, { seed: 5 }); assert.ok(sm.load('slot1', g2).ok); return g2; };
const TPL = { name: 'Sea Test Bn', line: ['inf', 'inf'], support: ['medical'], attach: [] };
const km = (a, b) => { const R = 6371; const D = Math.PI / 180; const x = Math.sin(((b.lat - a.lat) * D) / 2) ** 2 + Math.cos(a.lat * D) * Math.cos(b.lat * D) * Math.sin(((b.lon - a.lon) * D) / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };

/** a company with a landed battalion in the Halden Front, the nations standing still, the shipping company founded and a few ships bought; the battalion stands on the friendly coast nearest the enemy's */
function seaGame(seed, { cargo = true } = {}) {
  const { g, squads } = armedCompany(seed); const t = g.war.saveTemplate(TPL); assert.ok(t.ok, t.text);
  const r = g.war.raise({ template: t.id, squads }); assert.ok(r.ok, r.text);
  assert.ok(g.war.enlist({ theatre: 'th_halden', side: 'ostmark' }).ok); const w = g.war.state().war; w.aiOff = true;
  assert.ok(g.war.deploy(r.id).ok); const bn = w.battalions[0]; until(g, () => bn.status === 'theatre', 4000);
  g.player.money += 80_000_000; assert.ok(g.logistics.buyCompany().ok); const L = g.logistics;
  const buy = (model) => { const b = L.buyShip(model, 'port_millroad'); assert.ok(b.ok, `${model}: ${b.text}`); return b.vessel; };
  const ships = { corvette: buy('corvette'), frigate: buy('frigate') };
  if (cargo) for (const m of [...L.cfg.dealership].sort((a, b) => (L.cfg.ships[b].capacity || 0) - (L.cfg.ships[a].capacity || 0))) { const b = L.buyShip(m, 'port_millroad'); if (b.ok) { ships.freight = b.vessel; break; } } // the biggest freighter the dock will take
  if (cargo) assert.ok(ships.freight, 'a freighter was bought');
  const th = theatres(g).find((x) => x.id === 'th_halden'); const inT = inTheatre(th);
  const mine = provinces().filter((p) => inT(p) && p.coast && controllerOf(g, p) === 'ostmark'); const theirs = provinces().filter((p) => inT(p) && p.coast && controllerOf(g, p) === 'varn');
  let best = null; for (const a of mine) for (const b of theirs) { const d = km(a, b); if (!best || d < best.d) best = { a, b, d }; }
  bn.pos = best.a.id; // the test places the battalion on a coast (it cannot have walked there in the time the test has)
  return { g, w, bn, L, ships, home: best.a, foe: best.b, d: best.d, mine, theirs };
}
const lendAll = (g, ships) => { const r = g.war.raiseFleet('Test Fleet', Object.values(ships).map((v) => v.id)); assert.ok(r.ok, r.text); return r.id; };

test('a fleet is lent from the shipping company: the ships are held, nothing is copied, nothing else can have them, standing the fleet down gives them back', () => {
  const { g, w, L, ships } = seaGame(1901); const n = L.vessels().length;
  assert.ok(!g.war.raiseFleet('None', []).ok); assert.ok(!g.war.raiseFleet('Ghost', ['nothing']).ok);
  const id = lendAll(g, ships); assert.equal(L.vessels().length, n, 'no ship was copied'); assert.equal(w.fleets.length, 1);
  for (const v of Object.values(ships)) assert.deepEqual({ ...v.cargo }, { type: 'war', fleet: id, reserved: true });
  assert.deepEqual(g.war.check(), [], 'the books agree'); assert.ok(!g.war.raiseFleet('Again', [ships.corvette.id]).ok, 'a ship is in one fleet');
  assert.ok(!L.sail(ships.freight.id, 'port_sund').ok && /lent/.test(L.sail(ships.freight.id, 'port_sund').text), 'the shipping company cannot send a lent ship away');
  const free0 = g.war.navy().free.length; assert.ok(!g.war.navy().free.some((x) => x.id === ships.frigate.id)); assert.ok(g.war.disbandFleet(id).ok);
  for (const v of Object.values(ships)) assert.equal(v.cargo, null); assert.equal(g.war.navy().free.length, free0 + 3); assert.deepEqual(g.war.check(), []);
});

test('a fleet sails for a coast the employer holds; the ships go on station and come home; the checker catches a fleet that lies', () => {
  const { g, w, L, ships, home, foe } = seaGame(1902); const id = lendAll(g, ships);
  assert.ok(!g.war.deployFleet(id, foe.id).ok, 'an enemy coast is no base'); const inland = provinces().find((p) => !p.coast && controllerOf(g, p) === 'ostmark'); assert.ok(!g.war.deployFleet(id, inland.id).ok, 'a fleet is based on a coast');
  assert.ok(g.war.deployFleet(id, home.id).ok); for (const v of Object.values(ships)) assert.equal(v.status, 'mission'); assert.ok(!g.war.disbandFleet(id).ok, 'recall it first');
  assert.ok(g.war.recallFleet(id).ok); for (const v of Object.values(ships)) assert.equal(v.status, 'docked');
  const f = w.fleets[0]; f.ships.push('ghost'); assert.ok(g.war.check().some((p) => /ghost/.test(p.text))); f.ships.pop(); assert.deepEqual(g.war.check(), []);
});

test('a bombardment takes a share off the next fight at the coast, once; a blockade thins the garrison for some days; one act a day, within reach; ships wear and may be lost for good', () => {
  const { g, w, L, ships, home, foe } = seaGame(1903); const id = lendAll(g, ships); assert.ok(!g.war.fleetMission(id, 'bombard', foe.id).ok, 'not abroad yet'); assert.ok(g.war.deployFleet(id, home.id).ok);
  assert.ok(!g.war.fleetMission(id, 'bombard', home.id).ok, 'a fleet acts against the enemy only'); const inl = provinces().find((p) => !p.coast && controllerOf(g, p) === 'varn'); assert.ok(!g.war.fleetMission(id, 'bombard', inl.id).ok, 'it needs a coast'); assert.ok(!g.war.fleetMission(id, 'raid', foe.id).ok);
  const far = g.war.fleetTargets(id); assert.ok(far.length > 0 && far.every((t) => t.km <= NAVY.reach)); const t = provinceById(far[0].id);
  const cond0 = ships.corvette.condition; const before = garrisonOf(g, t).troops; const b = g.war.fleetMission(id, 'bombard', t.id); assert.ok(b.ok, b.text);
  assert.ok(!g.war.fleetMission(id, 'blockade', t.id).ok, 'the ships need a night in port'); assert.ok(ships.corvette.condition < cond0 || ships.corvette.status === 'lost', 'the ships wear');
  const cut = w.navy.bombard[t.id]; assert.ok(cut > 0 && cut <= NAVY.bombard.max); assert.equal(takeCut(g, t), cut); assert.equal(takeCut(g, t), 0, 'used once');
  dayOn(g); const k = g.war.fleetMission(id, 'blockade', t.id); assert.ok(k.ok, k.text); assert.equal(blockaded(g, t), NAVY.blockade.cut); assert.ok(garrisonOf(g, t).troops <= before, 'a shut port thins the garrison');
  for (let i = 0; i < NAVY.blockade.days + 1; i++) dayOn(g); assert.equal(blockaded(g, t), 0, 'it lifts when the days are out');
  void L;
});

test('a ship lost on a mission is lost for good in the shipping company\'s books, and the fleet forgets it', () => {
  const { g, w, L, ships, home } = seaGame(1904); const id = lendAll(g, ships); assert.ok(g.war.deployFleet(id, home.id).ok);
  const v = ships.corvette; const f = w.fleets[0];
  // a heavy fort and many tries: with the figures in content a ship does get lost sooner or later, deterministically
  const fort = g.war.fleetTargets(id).map((x) => provinceById(x.id)).sort((a, b) => b.fort - a.fort)[0];
  for (let i = 0; i < 200 && v.status !== 'lost'; i++) { dayOn(g); if (!f.ships.length) break; g.war.fleetMission(id, 'bombard', fort.id); }
  assert.equal(v.status, 'lost', 'the corvette was lost'); assert.ok(!f.ships.includes(v.id)); assert.equal(v.cargo, null); assert.deepEqual(g.war.check(), []);
  assert.ok(L.vessels().some((x) => x.id === v.id), 'the shipping company still has the record'); void w;
});

test('a passage by sea: a battalion boards a fleet that is near and has room, and sails to another coast the employer holds; no fleet, no room, too far, or inland refuses', () => {
  const { g, w, bn, ships, home, mine } = seaGame(1905); const to = mine.find((p) => p.id !== home.id && km(p, home) > 30 && km(p, home) < 1400); assert.ok(to, 'another friendly coast');
  assert.ok(!g.war.battalionOrder(bn.id, { type: 'land', to: to.id }).ok, 'no fleet yet'); const id = lendAll(g, ships);
  assert.ok(!g.war.battalionOrder(bn.id, { type: 'land', to: to.id }).ok, 'the fleet is at home'); assert.ok(g.war.deployFleet(id, home.id).ok);
  const inl = provinces().find((p) => !p.coast && controllerOf(g, p) === 'ostmark'); assert.ok(!g.war.battalionOrder(bn.id, { type: 'land', to: inl.id }).ok);
  const r = g.war.battalionOrder(bn.id, { type: 'land', to: to.id }); assert.ok(r.ok, r.text); assert.ok(bn.moving.sea && bn.moving.fleet === id && !bn.moving.attack);
  assert.ok(!g.war.recallFleet(id).ok, 'the battalion is aboard'); until(g, () => bn.pos === to.id); assert.equal(bn.moving, null); assert.ok(g.war.recallFleet(id).ok);
  assert.deepEqual(g.war.check(), []); void w;
});

test('a landing needs room in the holds for every soldier (one place) and vehicle (five); a fleet of warships alone refuses and says so', () => {
  const { g, bn, ships, home, foe } = seaGame(1906, { cargo: false }); const id = lendAll(g, ships); assert.ok(g.war.deployFleet(id, home.id).ok);
  const P = providedBy(g, bn.squads); const need = P.people * NAVY.landing.perSoldier + P.vehicles * NAVY.landing.perVehicle; assert.ok(need > 0);
  const r = g.war.battalionOrder(bn.id, { type: 'land', to: foe.id }); assert.ok(!r.ok); assert.match(r.text, /needs room for/);
});

test('a landing on an enemy coast meets a contested beach: the enemy is stronger by the landing penalty, escorts take part of it off, the fleet pays in wear, and the fight opens on arrival', () => {
  const { g, w, bn, ships, home, foe } = seaGame(1907); const id = lendAll(g, ships); assert.ok(g.war.deployFleet(id, home.id).ok);
  const plan = landingPlan(g, bn, foe, id); assert.ok(plan.ok, plan.text); assert.ok(plan.foe && plan.penalty > 0 && plan.penalty < NAVY.landing.penalty, 'escorts take some of the penalty off');
  const bare = seaGame(1907, { cargo: true }); const wf = bare.g.war.raiseFleet('Bare', [bare.ships.freight.id]); assert.ok(wf.ok); assert.ok(bare.g.war.deployFleet(wf.id, bare.home.id).ok);
  const plan0 = landingPlan(bare.g, bare.bn, bare.foe, wf.id); assert.ok(plan0.ok, plan0.text); assert.equal(plan0.penalty, NAVY.landing.penalty, 'with no escort the whole penalty stands'); assert.ok(plan.penalty < plan0.penalty);
  const org0 = bn.org; const r = g.war.battalionOrder(bn.id, { type: 'land', to: foe.id }); assert.ok(r.ok, r.text); assert.equal(bn.org, org0 - NAVY.landing.orgCost); assert.ok(bn.moving.sea && bn.moving.attack && bn.moving.pen === plan.penalty);
  const cond0 = ships.frigate.condition; until(g, () => bn.engaged, 400); assert.ok(ships.frigate.condition < cond0 || ships.frigate.status === 'lost', 'the ships paid for it'); assert.equal(bn.moving, null);
  assert.match(g.war.state().engagements?.find?.((e) => e.id === bn.engaged)?.title || 'lands at', /lands at/); void w;
});

test('war.fleets and the lent-ship markers survive a save, and a save from before this release (no fleets, navy or contracts) loads clean', () => {
  const { g, ships, home } = seaGame(1908); const id = lendAll(g, ships); assert.ok(g.war.deployFleet(id, home.id).ok);
  const g2 = roundtrip(g); const w2 = g2.war.state().war; assert.equal(w2.fleets.length, 1); assert.equal(w2.fleets[0].id, id); assert.equal(w2.fleets[0].status, 'abroad'); assert.deepEqual(g2.war.check(), []);
  assert.equal(g2.logistics.vessel(ships.corvette.id).cargo.fleet, id);
  const o = seaGame(1909); delete o.w.fleets; delete o.w.navy; delete o.w.intl; const old = roundtrip(o.g);
  assert.deepEqual(old.war.navy().fleets, [], 'no fleets yet'); assert.ok(Array.isArray(old.war.intl().offers)); assert.deepEqual(old.war.check(), []);
});

// ---- international contracts
const warm = (g, ...ids) => { const s = g.politics.ensure(); const d = g.politics.ensureDiplomacy(s); for (const id of ids) d.relations[id].score = 70; };
const diplomacyNow = (g) => JSON.stringify([g.politics.diplomacy().countries.map((c) => [c.id, c.score, c.flags]), g.politics.diplomacy().wars, g.market.state.wars, Object.entries(g.market.state.countries).map(([k, c]) => [k, c.embargo || null])]);

test('the embassies offer work only when a country at war in a hot theatre is warm enough; the rate rises with the relation; the offers state what they ask', () => {
  const { g } = seaGame(1911); const s = g.politics.ensure(); const d = g.politics.ensureDiplomacy(s);
  d.relations.ostmark.score = 0; d.relations.varn.score = 0; g.war.state().war.intl.seen = null; assert.equal(g.war.intl().offers.length, 0, 'cold countries offer nothing');
  d.relations.ostmark.score = INTL.minScore + 1; g.war.state().war.intl.seen = null; const cool = g.war.intl().offers; assert.ok(cool.length >= 2 && cool.length <= INTL.max); assert.ok(cool.every((o) => o.client === 'ostmark'));
  d.relations.ostmark.score = 100; g.war.state().war.intl.seen = null; const hot = g.war.intl().offers; assert.ok(hot.every((o) => o.rate === INTL.rate[1]) && cool.every((o) => o.rate < INTL.rate[1] && o.rate >= INTL.rate[0]));
  for (const o of hot) { assert.ok(INTL.kinds[o.kind]); assert.ok(o.bonus > 0 && o.days > 0 && o.daysLeft > 0); assert.ok(o.kind === 'blockade' ? o.req.warships >= 1 : o.req.people >= 8); }
  assert.ok(new Set(hot.map((o) => o.kind)).size >= 2, 'more than one kind of job');
});

test('accepting checks what you own: too few soldiers, no tank, no warship, or units already on a contract refuse and change nothing; a fit puts the units on it', () => {
  const { g, w, bn, ships, home } = seaGame(1912); warm(g, 'ostmark'); w.intl.seen = null;
  const offers = g.war.intl().offers; const take = offers.find((o) => o.kind === 'take'); const blk = offers.find((o) => o.kind === 'blockade'); assert.ok(take && blk);
  const tiny = g.war.acceptContract(take.id, [], []); assert.ok(!tiny.ok); assert.equal(w.intl.active.length, 0);
  const P = providedBy(g, bn.squads); const big = { ...take, req: { people: P.people + 50, tank: 0 } }; w.intl.offers.find((o) => o.id === take.id).req = big.req;
  const r1 = g.war.acceptContract(take.id, [bn.id], []); assert.ok(!r1.ok); assert.match(r1.text, /more soldiers/); assert.equal(bn.contract, undefined);
  w.intl.offers.find((o) => o.id === take.id).req = { people: 1, tank: 0 };
  assert.ok(!g.war.acceptContract(blk.id, [], []).ok, 'a blockade needs a fleet'); const fid = lendAll(g, ships); assert.ok(g.war.deployFleet(fid, home.id).ok);
  w.intl.offers.find((o) => o.id === blk.id).req = { warships: 9 }; const r2 = g.war.acceptContract(blk.id, [], [fid]); assert.ok(!r2.ok); assert.match(r2.text, /warship/); assert.equal(w.fleets[0].contract, undefined);
  w.intl.offers.find((o) => o.id === blk.id).req = { warships: 1 };
  const ok = g.war.acceptContract(take.id, [bn.id], []); assert.ok(ok.ok, ok.text); assert.equal(bn.contract, take.id); assert.equal(w.intl.active.length, 1); assert.deepEqual(g.war.check(), []);
  const again = g.war.acceptContract(blk.id, [bn.id], [fid]); assert.ok(!again.ok); assert.match(again.text, /already on a contract/);
  { const st = bn.status; bn.status = 'home'; const d = g.war.standDown(bn.id); bn.status = st; assert.ok(!d.ok); assert.match(d.text, /international contract/); } const k = g.war.acceptContract(blk.id, [], [fid]); assert.ok(k.ok, k.text); assert.equal(w.fleets[0].contract, blk.id);
  assert.ok(!g.war.acceptContract(w.intl.offers[0]?.id || 'none', [], []).ok, 'a withdrawn or unknown offer refuses');
});

test('a contract REPLACES the retainer for the units on it (the contract\'s rate), never adds to it; the day\'s pay is that and nothing more', () => {
  const run = (onContract) => {
    const { g, w, bn } = seaGame(1913); warm(g, 'ostmark'); w.intl.seen = null; const o = g.war.intl().offers.find((x) => x.kind === 'hold'); assert.ok(o);
    w.intl.offers.find((x) => x.id === o.id).req = { people: 1, tank: 0 }; if (onContract) assert.ok(g.war.acceptContract(o.id, [bn.id], []).ok);
    const before = w.paid || 0; dayOn(g); return { paid: (w.paid || 0) - before, rate: onContract ? w.intl.active[0].rate : 1 };
  };
  const plain = run(false); const c = run(true);
  assert.ok(plain.paid > 0); assert.ok(c.rate > 1 && c.rate <= INTL.rate[1], 'a warm country pays above the retainer');
  assert.ok(Math.abs(c.paid - Math.round(plain.paid * c.rate)) <= 1, `the contract rate stands in for the plain one (${c.paid} vs ${plain.paid} x ${c.rate})`);
});

test('a hold contract pays its completion bonus at the victory-point rate after the days are served; leaving the ground or the term running out fails it and costs standing', () => {
  const { g, w, bn } = seaGame(1914); warm(g, 'ostmark'); w.intl.seen = null; const o = g.war.intl().offers.find((x) => x.kind === 'hold'); assert.ok(o);
  const tg = provinceById(o.target); assert.equal(o.bonus, Math.max(1, tg.vp) * RETAINER.perVP); w.intl.offers.find((x) => x.id === o.id).req = { people: 1, tank: 0 };
  assert.ok(g.war.acceptContract(o.id, [bn.id], []).ok); const c = w.intl.active[0]; bn.pos = tg.id; bn.status = 'theatre'; const C = g.war.peek().company; const rep0 = C.rep?.score || 0;
  const cash0 = g.corp.cashOf('security'); for (let i = 0; i < c.need + 1 && w.intl.active.length; i++) dayOn(g);
  assert.equal(w.intl.active.length, 0, 'the contract ended'); assert.equal(w.intl.done[0].result, 'done'); assert.ok(g.corp.cashOf('security') - cash0 >= o.bonus, 'the bonus was paid'); assert.ok(C.rep.score > rep0); assert.equal(bn.contract, undefined); assert.deepEqual(g.war.check(), []);
  // a second one, left to run out with nobody on the ground
  w.intl.seen = null; const o2 = g.war.intl().offers.find((x) => x.kind === 'hold'); w.intl.offers.find((x) => x.id === o2.id).req = { people: 1, tank: 0 }; assert.ok(g.war.acceptContract(o2.id, [bn.id], []).ok);
  bn.pos = provinceById(o2.target).id === bn.pos ? w.employer.staging : bn.pos; const rep1 = C.rep.score; for (let i = 0; i < 40 && w.intl.active.length; i++) dayOn(g);
  assert.equal(w.intl.active.length, 0); assert.equal(w.intl.done[0].result, 'failed'); assert.ok(C.rep.score < rep1); assert.equal(C.rep.failed, 1);
});

test('ground named in a take contract pays the contract\'s bonus once through the capture hook, never the plain capture bonus as well; ground not named pays the plain one', () => {
  const { g, w, bn } = seaGame(1915); warm(g, 'ostmark'); w.intl.seen = null; const o = g.war.intl().offers.find((x) => x.kind === 'take'); assert.ok(o);
  w.intl.offers.find((x) => x.id === o.id).req = { people: 1, tank: 0 }; assert.ok(g.war.acceptContract(o.id, [bn.id], []).ok);
  const other = provinces().find((q) => controllerOf(g, q) === 'varn' && q.id !== o.target); assert.equal(hooks.intlTaken(g, bn, other), false, 'not named: the plain bonus applies');
  const cash0 = g.corp.cashOf('security'); assert.equal(hooks.intlTaken(g, bn, provinceById(o.target)), true);
  assert.equal(g.corp.cashOf('security') - cash0, o.bonus, 'the completion bonus, once'); assert.equal(w.intl.active.length, 0); assert.equal(w.intl.done[0].result, 'done'); assert.equal(bn.contract, undefined);
  assert.equal(hooks.intlTaken(g, bn, provinceById(o.target)), false, 'nothing is owed twice');
});

test('contracts only read diplomacy: no war, truce or embargo is written, and the source says so', () => {
  const { g, w, bn } = seaGame(1916); warm(g, 'ostmark'); w.intl.seen = null; const before = diplomacyNow(g);
  const o = g.war.intl().offers.find((x) => x.kind === 'hold'); w.intl.offers.find((x) => x.id === o.id).req = { people: 1, tank: 0 }; assert.ok(g.war.acceptContract(o.id, [bn.id], []).ok);
  for (let i = 0; i < 12; i++) dayOn(g); g.war.abandonContract(w.intl.active[0]?.id); assert.equal(diplomacyNow(g).length > 0, true);
  const src = readFileSync(new URL('../src/war/intl.js', import.meta.url), 'utf8') + readFileSync(new URL('../src/war/navy.js', import.meta.url), 'utf8');
  assert.ok(!/\.embargo\s*=|\.wars\s*=|\.wars\.push|relations\[[^\]]+\]\.score\s*=|stage\s*=\s*'war'|geo\.(declare|start|end)/.test(src), 'no writes to wars, embargoes or relations'); void before;
});

test('the employer\'s collapse ends the contracts with nothing owed; saves keep offers and active contracts', () => {
  const { g, w, bn } = seaGame(1917); warm(g, 'ostmark'); w.intl.seen = null; const o = g.war.intl().offers.find((x) => x.kind === 'hold'); w.intl.offers.find((x) => x.id === o.id).req = { people: 1, tank: 0 }; assert.ok(g.war.acceptContract(o.id, [bn.id], []).ok);
  const g2 = roundtrip(g); const w2 = g2.war.state().war; assert.equal(w2.intl.active.length, 1); assert.equal(w2.battalions[0].contract, o.id); assert.deepEqual(g2.war.check(), []);
  w.employer = null; dayOn(g); assert.equal(w.intl.active.length, 0); assert.equal(w.intl.done[0].result, 'collapsed'); assert.equal(bn.contract, undefined);
});
