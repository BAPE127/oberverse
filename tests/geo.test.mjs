// Geopolitics (v0.75.0): the arms market's wars and embargoes kept as persistent events, and what they do to the economy — a
// bounded, exposure-weighted effect that is a function of the saved event and the day, never applied "once".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from './helpers.mjs';
import { GEO } from '../src/content/geo.js';
import { CORP } from '../src/content/corporate.js';
import { severityOf, phaseOf, indices, sentimentOf, exposureOf } from '../src/corp/geo.js';

const day = (g, d) => { g.clock.total = (d - 1) * 1440 + 8 * 60; };
const incomes = { varn: 18000, caldera: 15000, teshvar: 48000, pallas: 10800, lirre: 24000, ostmark: 36000, sund: 12000, morrow: 18000 };
const ctx = { sectors: CORP.sectors, incomes, salt: 's' };
const war = (parties, extra = {}) => ({ id: 'w', kind: 'war', parties, start: 1, registered: 1, end: null, status: 'active', severity: 0.6, goods: [], ...extra });
const embargo = (target, extra = {}) => ({ id: 'e', kind: 'embargo', target, parties: [target], start: 1, registered: 1, end: null, status: 'active', severity: 0.5, goods: ['arms'], ...extra });
/** A game with the market running (it starts the initial war and embargo) and the corporate world made. */
function world(seed) {
  const g = newGame(seed);
  g.corp.ensureWorld();
  g.market.state; // start the arms market, as a day's play does
  day(g, 2);
  return g;
}

test('pure: severity from income within limits; a phase ramps in, escalates, and fades after the end; nothing is applied before it starts', () => {
  assert.equal(severityOf('war', [100000, 100000], GEO), 1);
  assert.equal(severityOf('war', [1, 1], GEO), GEO.severity.min);
  assert.ok(severityOf('embargo', [10800], GEO) >= GEO.severity.embargoMin && severityOf('embargo', [1e9], GEO) === GEO.severity.embargoMax);
  const e = war(['varn', 'caldera'], { start: 10, registered: 10 });
  assert.equal(phaseOf(e, 9, GEO), 0, 'before it began');
  assert.ok(phaseOf(e, 10, GEO) > 0 && phaseOf(e, 10, GEO) < 0.2, 'never a day-one jump');
  assert.equal(phaseOf(e, 19, GEO), 1);
  assert.equal(phaseOf(e, 10 + GEO.prolongedDays, GEO), 1.15, 'a prolonged war weighs more');
  const done = { ...e, status: 'resolved', end: 40 };
  assert.ok(phaseOf(done, 40, GEO) === 1 && phaseOf(done, 55, GEO) < 1 && phaseOf(done, 55, GEO) > 0);
  assert.equal(phaseOf(done, 40 + GEO.recoverDays, GEO), 0, 'recovered');
  assert.equal(phaseOf(done, 200, GEO), 0);
  assert.equal(phaseOf(e, 30, GEO), phaseOf(JSON.parse(JSON.stringify(e)), 30, GEO), 'a function of the record and the day only');
});

test('pure: indices are bounded and depend on the sector, the parties and the embargoed market; nothing without events', () => {
  assert.deepEqual(indices([], 5, ctx, GEO), { demand: {}, cost: {} });
  const plain = indices([war(['varn', 'caldera'])], 30, ctx, GEO);
  const oil = indices([war(['teshvar', 'morrow'])], 30, ctx, GEO);
  assert.ok(oil.demand.energy > plain.demand.energy + 0.05, 'a war with an oil state moves energy more');
  assert.ok(plain.cost.shipping > 1 && plain.cost.shipping <= GEO.bounds.cost[1]);
  assert.equal(plain.demand.arms, undefined, 'arms demand already follows the war count in the arms pool: not counted twice');
  const huge = indices(Array.from({ length: 20 }, () => war(['teshvar', 'morrow'], { severity: 1 })), 90, ctx, GEO);
  for (const v of Object.values(huge.demand)) assert.ok(v >= GEO.bounds.demand[0] && v <= GEO.bounds.demand[1]);
  for (const v of Object.values(huge.cost)) assert.ok(v >= 1 && v <= GEO.bounds.cost[1]);
  const emb = indices([embargo('teshvar')], 30, ctx, GEO);
  const share = incomes.teshvar / Object.values(incomes).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(emb.demand.arms - (1 - GEO.embargo.armsShare * share)) < 1e-9, 'the lawful arms trade loses that market\'s share of the income');
  assert.equal(emb.demand.shipping, undefined, 'a sector with no exposure is untouched');
});

test('pure: sentiment is bounded, differs company to company, hits a company from a country at war, and does not credit a full works with sales it cannot make', () => {
  const evs = [war(['varn', 'caldera'])];
  const co = (id, sector, country = 'lirre', util) => ({ id, sector, country, util });
  assert.equal(sentimentOf([], co('a', 'shipping'), 30, ctx, GEO), 0);
  const a = sentimentOf(evs, co('ship_a', 'shipping'), 30, ctx, GEO);
  const b = sentimentOf(evs, co('ship_b', 'shipping'), 30, ctx, GEO);
  assert.ok(a < 0 && b < 0 && a !== b, 'costs rise for shipping, by how exposed each is');
  assert.ok(exposureOf('ship_a', 's', GEO) !== exposureOf('ship_b', 's', GEO));
  const home = sentimentOf(evs, co('x', 'finance', 'lirre'), 30, ctx, GEO);
  const party = sentimentOf(evs, co('x', 'finance', 'varn'), 30, ctx, GEO);
  assert.ok(party < home, 'a company from a country at war is worse off');
  const embargoed = sentimentOf([embargo('pallas')], co('x', 'finance', 'pallas'), 30, ctx, GEO);
  assert.ok(embargoed < 0);
  for (const s of [a, b, home, party, embargoed, sentimentOf(Array.from({ length: 20 }, () => war(['teshvar', 'morrow'], { severity: 1 })), co('x', 'energy'), 90, ctx, GEO)]) assert.ok(Math.abs(s) <= GEO.bounds.sentiment + 1e-12);
  const G2 = { ...GEO, war: { ...GEO.war, demand: { ...GEO.war.demand, arms: 0.3 } } };
  const roomy = sentimentOf(evs, co('w1', 'arms', 'lirre', 0.6), 30, ctx, G2);
  const full = sentimentOf(evs, co('w1', 'arms', 'lirre', 0.99), 30, ctx, G2);
  assert.ok(roomy > full, 'only a works with room to sell more gains from a surge in demand');
});

test('the service: nothing before the market runs; then each war and embargo is one event with an id, a start and a timeline, recorded once', () => {
  const g = newGame(2501);
  g.corp.ensureWorld(); day(g, 2);
  delete g.world.market; // as a game that has never opened the arms market
  g.corp.geo.dailyTick();
  assert.equal(g.corp.state.geo, undefined, 'the market has not started: nothing is made');
  assert.equal(g.world.market, undefined, 'and the service did not start it');
  g.market.state;
  g.corp.geo.dailyTick();
  const ev = g.corp.geo.events();
  assert.deepEqual(ev.map((e) => [e.kind, e.status]), [['war', 'active'], ['embargo', 'active']]);
  assert.ok(ev[0].id.startsWith('ev_') && ev[0].parties.join() === 'varn,caldera' && ev[0].severity > 0.25);
  assert.equal(ev[1].target, 'pallas'); assert.equal(ev[1].goods[0], 'arms');
  assert.ok(ev.every((e) => e.timeline.length === 1));
  const before = JSON.stringify(g.corp.state.geo);
  g.corp.geo.dailyTick(); g.corp.geo.dailyTick();
  assert.equal(JSON.stringify(g.corp.state.geo), before, 'a second tick on the same day changes nothing');
  day(g, 3); g.corp.geo.dailyTick();
  assert.equal(g.corp.geo.events().length, 2, 'the same war is not recorded again');
  assert.deepEqual(g.corp.geo.events().map((e) => e.id), ev.map((e) => e.id), 'ids never change');
});

test('a war that begins, passes milestones, ends in a ceasefire and fades; an embargo lifted; effects follow the record through a save and never repeat', () => {
  const g = world(2502);
  g.corp.geo.dailyTick();
  const m = g.world.market;
  day(g, 5); m.wars.push({ a: 'teshvar', b: 'morrow', since: 5 });
  m.countries.teshvar.embargo = true; m.countries.teshvar.embargoReason = 'war';
  g.corp.geo.dailyTick();
  const find = (kind, f) => g.corp.geo.events().find((x) => x.kind === kind && f(x));
  const w0 = find('war', (x) => x.parties[0] === 'teshvar');
  const e0 = find('embargo', (x) => x.target === 'teshvar');
  const w = new Proxy({}, { get: (_, k) => g.corp.geo.find(w0.id)[k] }); const e = new Proxy({}, { get: (_, k) => g.corp.geo.find(e0.id)[k] }); // the saved record, whichever copy a reload left

  assert.ok(w0 && e0 && e.cause === w.id && /for going to war/.test(e.timeline[0].text));
  const sentAt = (d) => { day(g, d); return g.corp.geo.sentiment({ id: 'x', sector: 'energy', country: 'lirre' }, d); };
  const s6 = sentAt(6); const s14 = sentAt(14);
  assert.ok(Math.abs(s14) > Math.abs(s6), 'it ramps in over days');
  const idx14 = JSON.stringify(g.corp.geo.indices(14));
  // reloading changes nothing, and repeated mornings do not stack the shock
  g.corp.state.geo = JSON.parse(JSON.stringify(g.corp.state.geo));
  for (let i = 0; i < 4; i++) { day(g, 14); g.corp.geo.dailyTick(); }
  assert.equal(JSON.stringify(g.corp.geo.indices(14)), idx14);
  assert.equal(g.corp.geo.sentiment({ id: 'x', sector: 'energy', country: 'lirre' }, 14), s14);
  for (const d of [36, 66]) { day(g, d); g.corp.geo.dailyTick(); }
  assert.equal(w.milestone, 2, 'the milestones are recorded once each');
  assert.equal(w.timeline.filter((t) => /gone on for/.test(t.text)).length, 2);
  // ceasefire and the end of the embargo
  m.wars = m.wars.filter((x) => x.a !== 'teshvar'); m.countries.teshvar.embargo = false; m.countries.teshvar.embargoReason = null;
  day(g, 70); g.corp.geo.dailyTick();
  assert.equal(w.status, 'resolved'); assert.equal(w.end, 70); assert.equal(e.status, 'resolved');
  assert.match(w.timeline.at(-1).text, /Ceasefire/);
  const p1 = g.corp.geo.phase(w, 71); const p2 = g.corp.geo.phase(w, 90);
  assert.ok(p1 > p2 && p2 > 0 && g.corp.geo.phase(w, 70 + GEO.recoverDays) === 0, 'it fades out after the ceasefire');
});

test('the wider world feels it: cost and demand reach the companies\' own days, and the listed prices follow their books and the news — bounded, and not alike', () => {
  const g = world(2503);
  g.corp.geo.dailyTick();
  day(g, 40); // well past the ramp
  const warm = g.corp.worldCtx(40, true);
  const live = g.corp.worldCtx(40, false);
  assert.deepEqual(warm.cost, {}, 'the made-up history is not touched');
  assert.ok(live.cost.shipping > 1, 'shipping costs rise in a war');
  assert.ok(live.poolExtra.demand.energy >= 1);
  const rows = g.corp.registry().filter((r) => r.kind === 'generated' && r.sector === 'shipping');
  assert.ok(rows.length >= 2);
  const s = rows.map((r) => g.corp.geo.sentiment({ id: r.id, sector: r.sector, country: r.country }, 40));
  assert.ok(new Set(s.map((x) => x.toFixed(6))).size > 1, 'shipping companies are not all hit alike');
  assert.ok(s.every((x) => Math.abs(x) <= GEO.bounds.sentiment + 1e-12));
  // a listed price's fair value carries it
  g.corp.exchange.dailyTick();
  const ex = g.corp.exchange;
  const rowOf = (l) => g.corp.registry().find((r) => r.id === l.id);
  const moved = Object.values(ex.peek().listings).filter((l) => l.status === 'listed').map((l) => ({ l, r: rowOf(l), s: g.corp.geo.sentiment({ id: l.id, sector: rowOf(l).sector, country: rowOf(l).country, util: ex.record(l.id)?.util }) })).filter((x) => x.s !== 0);
  assert.ok(moved.length >= 3, 'several listed companies are exposed');
  for (const { l, r, s } of moved) {
    const v = g.corp.metricsOf(r).valuation;
    const plain = v / l.shares;
    assert.ok(Math.abs(ex.fairOf(l, r) / plain - (1 + s)) < 0.01 + 1 / plain, `${l.ticker}: its fair price is its books' ${(s * 100).toFixed(1)}% adjusted`);
  }
  // the three older shares follow the same news; with no events they are as they were
  const oil = (() => { g.oil.state.lastDay = 0; return g.corp.geo.sentiment({ id: 'ober_oil', sector: 'energy', country: 'home' }); })();
  assert.ok(Math.abs(oil) <= GEO.bounds.sentiment);
  const keep = g.corp.state.geo; delete g.corp.state.geo;
  assert.equal(g.corp.geo.sentiment({ id: 'ober_oil', sector: 'energy', country: 'home' }), 0, 'no events, no effect');
  g.corp.state.geo = keep;
});

test('the Economy overview states what is on, what it costs, who is exposed, and nothing about what comes next', () => {
  const g = world(2504);
  g.corp.geo.dailyTick();
  day(g, 40); g.corp.exchange.dailyTick();
  const O = g.corp.geo.overview();
  assert.equal(O.wars.length, 1); assert.equal(O.embargoes.length, 1);
  assert.deepEqual(O.wars[0].names, ['Varnistan', 'Republic of Caldera']);
  assert.equal(O.embargoes[0].names[0], 'Free State of Pallas');
  assert.ok(O.wars[0].phase > 0.9 && O.wars[0].effects.length > 0);
  assert.ok(O.sectors.some((r) => r.sector === 'shipping' && r.cost > 0));
  assert.ok(O.sectors.every((r) => r.demand >= -25.01 && r.demand <= 30.01 && r.cost >= 0 && r.cost <= 12.01), 'inside the bounds');
  assert.ok(O.pressed.length + O.lifted.length > 0 && [...O.pressed, ...O.lifted].every((r) => Math.abs(r.sentiment) <= GEO.bounds.sentiment + 1e-12));
  assert.ok(O.pressed.every((r) => r.sentiment < 0) && O.lifted.every((r) => r.sentiment > 0));
  assert.equal(O.rate, g.corp.bank.rate()); assert.equal(O.yields.length, 3);
  // a ceasefire moves the war to the ended list, still with its timeline
  g.world.market.wars = [];
  day(g, 41); g.corp.geo.dailyTick();
  day(g, 55); // two weeks on
  const O2 = g.corp.geo.overview();
  assert.equal(O2.wars.length, 0);
  const ended = O2.ended.find((e) => e.kind === 'war');
  assert.ok(ended && ended.phase < 1 && ended.timeline.length >= 2);
});
