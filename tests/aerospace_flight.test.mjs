// Starling Field (v0.58.0): the aircraft state machine, the scripted take-offs and landings, stands,
// and the one-runway queue — and that a reload or a night's sleep puts every aircraft where it belongs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, CONTENT, Game } from './helpers.mjs';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';
import { STATES, NEXT, canGo, fieldGeo, standPose, windRunway, departurePlan, arrivalPlan, poseAt, planLength, runwayWindow } from '../src/aero/flight.js';

const F = CONTENT.aerospace.flight;
const P = CONTENT.aerospace.products;
const MAP = CONTENT.maps.starling_flats;
const geo = fieldGeo(MAP.airfield);
const AIRCRAFT = Object.entries(P).filter(([, p]) => p.line === 'aircraft');
const stepAll = (g, minutes) => { for (let i = 0; i < minutes; i++) { g.clock.total += 1; g.aero.minuteTick(); } };
const mk = (g, co, pid, owner = 'cu_skyward') => {
  const A = g.aero;
  const id = A.registerAircraft(co, { id: `U-${pid}-${Object.keys(A.state.aircraft || {}).length}`, product: pid, contract: null, config: {} });
  const ac = A.state.aircraft[id];
  ac.owner = owner;
  return ac;
};

test('the state machine: every state is known, nothing leaves a final state, a departure takes the long way round', () => {
  for (const [from, to] of Object.entries(NEXT)) {
    assert.ok(STATES.includes(from));
    for (const t of to) assert.ok(STATES.includes(t), `${from} → ${t}`);
  }
  assert.deepEqual(NEXT.retired, []);
  assert.deepEqual(NEXT.departed, []);
  assert.ok(canGo('awaiting_delivery', 'taxiing') && canGo('taxiing', 'takeoff') && canGo('takeoff', 'airborne') && canGo('airborne', 'departed'));
  assert.ok(canGo('airborne', 'landing') && canGo('landing', 'taxiing') && canGo('taxiing', 'parked'));
  assert.ok(!canGo('parked', 'airborne') && !canGo('awaiting_delivery', 'takeoff') && !canGo('departed', 'taxiing'));
});

test('the field geometry matches the map: runway, taxiway, connectors and the two aprons', () => {
  assert.equal(geo.runway.y, 69); assert.equal(geo.taxi.y, 62);
  assert.equal(geo.west.x, 35); assert.equal(geo.east.x, 167);
  assert.equal(geo.aprons.roost_apron.link.x, 46, 'Roost\'s apron joins the taxiway by its own connector');
  assert.equal(geo.aprons.meridian_apron.link, null, 'Meridian\'s apron opens onto the taxiway');
  // every stand sits on its apron
  for (const ap of Object.values(geo.aprons)) for (let i = 0; i < ap.slots.length; i++) {
    const s = standPose(geo, ap.id, i, 1, 4);
    assert.ok(s.x > ap.x && s.x < ap.x + ap.w && s.y > ap.y && s.y < ap.y + ap.h + 1, `${ap.id} stand ${i}`);
  }
  assert.equal(windRunway(7), windRunway(7), 'the wind of a day is fixed');
  assert.ok(new Set([...Array(40).keys()].map(windRunway)).size === 2, 'and it changes now and then');
});

test('every aircraft can leave from every stand on either runway: continuous, in order, off the map', () => {
  for (const [pid, prod] of AIRCRAFT) {
    for (const apron of Object.values(geo.aprons)) {
      for (const rwy of ['09', '27']) {
        const size = Math.min(prod.apron || 1, apron.slots.length);
        for (let slot = 0; slot + size <= apron.slots.length; slot += Math.max(1, size)) {
          const stand = standPose(geo, apron.id, slot, size, prod.look.len);
          const plan = departurePlan(F, geo, { stand, apron: apron.id, len: prod.look.len, spec: prod.spec, rwy });
          const T = planLength(plan);
          assert.ok(T > 5 && T < 130, `${pid}: ${T.toFixed(0)} minutes`);
          const first = poseAt(plan, 0);
          assert.ok(Math.hypot(first.x - stand.x, first.y - stand.y) < 0.05, `${pid}: starts on its stand`);
          // continuity: nothing jumps between samples a fifth of a minute apart
          let prev = first;
          const order = [];
          for (let t = 0.2; t <= T; t += 0.2) {
            const p = poseAt(plan, t);
            const step = Math.hypot(p.x - prev.x, p.y - prev.y);
            assert.ok(step < 7, `${pid} ${rwy} ${apron.id}: a jump of ${step.toFixed(1)} tiles at ${t.toFixed(1)}`);
            const da = Math.abs(Math.atan2(Math.sin(p.a - prev.a), Math.cos(p.a - prev.a)));
            assert.ok(da < 1.4, `${pid}: turns ${da.toFixed(2)} rad in 0.2 min at ${t.toFixed(1)} (${prev.label} → ${p.label})`);
            if (!order.length || order[order.length - 1] !== p.state) order.push(p.state);
            prev = p;
          }
          assert.deepEqual(order.filter((s) => s !== 'taxiing' || order.indexOf(s) === 0), prod.spec.vtol ? ['taxiing', 'takeoff', 'airborne'] : ['taxiing', 'takeoff', 'airborne'], `${pid}: states in order`);
          const end = poseAt(plan, T + 5);
          assert.ok(end.done && (end.x > 180 || end.x < 0), `${pid}: leaves the map (${end.x.toFixed(0)})`);
          // the roll is on the runway and no longer than it
          const roll = plan.legs.find((l) => l.state === 'takeoff');
          const a = roll.pose(0); const b = roll.pose(1);
          if (!prod.spec.vtol) {
            assert.equal(Math.round(a.y), geo.runway.y); assert.equal(Math.round(b.y), geo.runway.y);
            assert.ok(Math.abs(b.x - a.x) < geo.runway.x1 - geo.runway.x0 - 20, `${pid}: the roll fits the runway`);
          }
        }
      }
    }
  }
});

test('a heavier aircraft rolls further, a VTOL does not roll at all, and the runway is only needed for a while', () => {
  const roll = (pid) => { const p = P[pid]; const stand = standPose(geo, 'meridian_apron', 0, 1, p.look.len); const plan = departurePlan(F, geo, { stand, apron: 'meridian_apron', len: p.look.len, spec: p.spec, rwy: '09' }); const l = plan.legs.find((x) => x.state === 'takeoff'); return Math.abs(l.pose(1).x - l.pose(0).x); };
  assert.ok(roll('ap_skylark') < roll('ap_tern') && roll('ap_tern') < roll('ap_condor'));
  assert.equal(roll('ap_aurora'), 0, 'the Aurora lifts straight up');
  const p = P.ap_swift;
  const plan = departurePlan(F, geo, { stand: standPose(geo, 'meridian_apron', 2, 1, p.look.len), apron: 'meridian_apron', len: p.look.len, spec: p.spec, rwy: '27' });
  const w = runwayWindow(plan);
  assert.ok(w.from > 10 && w.to > w.from && w.to < planLength(plan) - 2, 'the runway is needed from the line-up to the end of the roll');
});

test('an aircraft coming home lands, brakes, taxis in and parks on its own stand, nose to the stop bar', () => {
  for (const [pid, prod] of AIRCRAFT.filter(([, p]) => !p.spec.vtol)) {
    for (const rwy of ['09', '27']) {
      for (const apron of Object.values(geo.aprons)) {
        const stand = standPose(geo, apron.id, 0, 1, prod.look.len);
        const plan = arrivalPlan(F, geo, { stand, apron: apron.id, len: prod.look.len, spec: prod.spec, rwy });
        const T = planLength(plan);
        const end = poseAt(plan, T);
        assert.ok(Math.hypot(end.x - stand.x, end.y - stand.y) < 0.05 && Math.abs(end.a) < 0.01, `${pid} ${rwy} ${apron.id}: parked on the stand`);
        assert.equal(end.state, 'parked');
        const start = poseAt(plan, 0);
        assert.ok(start.alt > 3 && (start.x < 0 || start.x > 180), `${pid}: begins high and off the map`);
        const td = plan.legs.find((l) => /braking/.test(l.label)).pose(0);
        assert.equal(td.alt, 0, `${pid}: touches down at the end of the final`);
        let prev = start;
        for (let t = 0.2; t <= T; t += 0.2) { const p = poseAt(plan, t); assert.ok(Math.hypot(p.x - prev.x, p.y - prev.y) < 7, `${pid}: a jump at ${t.toFixed(1)}`); prev = p; }
      }
    }
  }
});

test('a finished aircraft is given a stand, the stands are not shared, and a big one takes its neighbours\' too', () => {
  const g = newGame(31);
  const A = g.aero;
  const co = A.meridian;
  const a = mk(g, co, 'ap_tern');   // 2 stands
  const b = mk(g, co, 'ap_swift');  // 1
  const c = mk(g, co, 'ap_condor'); // 3
  assert.deepEqual(a.stand, { apron: 'meridian_apron', slot: 0, size: 2 });
  assert.deepEqual(b.stand, { apron: 'meridian_apron', slot: 2, size: 1 });
  assert.deepEqual(c.stand, { apron: 'meridian_apron', slot: 3, size: 3 });
  const used = new Set();
  for (const ac of [a, b, c]) for (let i = 0; i < ac.stand.size; i++) { assert.ok(!used.has(ac.stand.slot + i)); used.add(ac.stand.slot + i); }
  // they show up on the field, parked, facing the stop bar
  const ms = A.movers();
  assert.equal(ms.length, 3);
  for (const m of ms) { assert.equal(m.state, 'awaiting_delivery'); assert.equal(m.a, 0); assert.equal(m.alt, 0); }
  // a stand comes free when its aircraft leaves
  A.clearForDeparture(a);
  stepAll(g, 120);
  assert.equal(a.state, 'departed');
  assert.equal(mk(g, co, 'ap_swift').stand.slot, 0, 'the first stand is free again');
});

test('a departure runs its course over game time: stands, pushback, taxi, hold, roll, climb, gone', () => {
  const g = newGame(32);
  const A = g.aero;
  const ac = mk(g, A.meridian, 'ap_tern');
  const t0 = A.clearForDeparture(ac);
  assert.equal(ac.state, 'awaiting_delivery');
  assert.ok(t0 >= g.clock.total);
  const seen = [ac.state];
  for (let i = 0; i < 150; i++) {
    g.clock.total += 1; A.minuteTick();
    if (seen[seen.length - 1] !== ac.state) seen.push(ac.state);
  }
  assert.deepEqual(seen, ['awaiting_delivery', 'taxiing', 'takeoff', 'airborne', 'departed']);
  assert.equal(ac.move, null);
  assert.equal(ac.flight.movements, 1);
  assert.ok(!A.state.field.active.includes(ac.id), 'it is no longer on the field');
  assert.ok(!A.state.news.some((n) => /takes off from Starling Field/.test(n.text)), 'Meridian\'s deliveries are not news');
});

test('one runway, one at a time: several aircraft leave in turn, never on top of one another', () => {
  const g = newGame(33);
  const A = g.aero;
  const acs = ['ap_swift', 'ap_tern', 'af_kestrel', 'ap_skylark', 'ap_condor'].map((pid) => mk(g, A.meridian, pid));
  const starts = acs.map((ac) => A.clearForDeparture(ac));
  const sorted = [...starts].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) assert.ok(sorted[i] - sorted[i - 1] >= F.stagger - 1e-6, 'starts are staggered');
  const wins = acs.map((ac, i) => { const w = runwayWindow(A.planOf ? A.planOf(ac) : planFor(A, ac)); return [starts[i] + w.from, starts[i] + w.to]; });
  wins.sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < wins.length; i++) assert.ok(wins[i][0] >= wins[i - 1][1], `runway use ${i} starts after ${i - 1} ends`);
  // and nobody is ever on the runway with another (sampled every half minute)
  const onRunway = (m) => m.y > 66 && m.y < 72 && (m.state === 'takeoff' || m.state === 'taxiing');
  let worst = 0;
  for (let i = 0; i < 400; i++) {
    g.clock.total += 1; A.minuteTick();
    if (i % 1) continue;
    const ms = A.movers().filter((m) => m.alt < 0.5 && onRunway(m) && m.y > 68 && m.y < 70);
    worst = Math.max(worst, ms.length);
  }
  assert.ok(worst <= 1, `at most one aircraft on the runway centreline at a time (saw ${worst})`);
  assert.ok(acs.every((ac) => ac.state === 'departed'));
});

function planFor(A, ac) {
  const prod = P[ac.model];
  return departurePlan(F, geo, { stand: standPose(geo, ac.stand.apron, ac.stand.slot, ac.stand.size, prod.look.len), apron: ac.stand.apron, len: prod.look.len, spec: ac.spec || prod.spec, rwy: ac.move.rwy });
}

test('a reload in the middle of a departure finds the aircraft exactly where it was', () => {
  const g = newGame(34);
  const A = g.aero;
  const ac = mk(g, A.meridian, 'ap_tern');
  const t0 = A.clearForDeparture(ac);
  g.clock.total = t0 + 22;
  A.minuteTick();
  const before = A.movers().find((m) => m.id === ac.id);
  assert.ok(before && before.state === 'taxiing');
  const sm = new SaveManager(new MemoryStorage());
  const saved = sm.save('slot1', g);
  assert.ok(saved.ok, JSON.stringify(saved));
  const g2 = new Game(CONTENT);
  assert.ok(sm.load('slot1', g2).ok);
  const after = g2.aero.movers().find((m) => m.id === ac.id);
  assert.ok(after, 'still on the field');
  assert.equal(Math.round(after.x * 100), Math.round(before.x * 100));
  assert.equal(Math.round(after.y * 100), Math.round(before.y * 100));
  assert.equal(after.label, before.label);
  // and sleeping through the rest of it ends the same way
  for (let i = 0; i < 90; i++) { g2.clock.total += 1; g2.aero.minuteTick(); }
  assert.equal(g2.aero.state.aircraft[ac.id].state, 'departed');
});

test('a save from before v0.58.0 (aircraft waiting on the apron with no stand) is given stands and departs on schedule', () => {
  const g = newGame(35);
  const A = g.aero;
  const acs = [mk(g, A.meridian, 'ap_swift'), mk(g, A.meridian, 'ap_tern')];
  for (const ac of acs) { delete ac.stand; delete ac.move; delete ac.livery; }
  delete A.state.field;
  A.afterLoad();
  assert.ok(acs.every((ac) => ac.stand), 'stands handed out');
  assert.notDeepEqual(acs[0].stand.slot, acs[1].stand.slot);
  assert.equal(A.movers().length, 2);
  A.clearForDeparture(acs[0]);
  stepAll(g, 100);
  assert.equal(acs[0].state, 'departed');
  assert.equal(acs[1].state, 'awaiting_delivery');
});

test('delivery now sends the aircraft down the runway: paid at handover, gone a little later', () => {
  const g = newGame(36);
  g.player.money = 5_000_000;
  const A = g.aero;
  assert.ok(A.buyFirm().ok);
  const co = A.roost;
  const c = A.contractsOf(co, 'active')[0];
  assert.ok(c, 'Billie\'s order book');
  // run until the first aircraft of the contract is handed over
  let handedOver = null;
  for (let i = 0; i < 12 * 1440 && !handedOver; i++) {
    g.clock.total += 1; A.minuteTick();
    handedOver = Object.values(A.state.aircraft || {}).find((ac) => ac.contract === c.id && ac.move);
  }
  assert.ok(handedOver, 'a departure was cleared');
  assert.equal(handedOver.owner, c.customer, 'ownership passed at the handover');
  assert.ok(c.delivered >= 1, 'and it was paid for');
  assert.ok(['awaiting_delivery', 'taxiing', 'takeoff', 'airborne'].includes(handedOver.state));
  stepAll(g, 140);
  assert.equal(handedOver.state, 'departed');
  assert.ok(A.state.news.some((n) => /takes off from Starling Field/.test(n.text)), 'the player\'s own delivery is news');
});

// ------------------------------------------------------------------ Meridian's own, the convoy, the sound
const dayAt = (g, day, hour = 6, minute = 5) => { g.clock.total = (day - 1) * 1440 + hour * 60 + minute; };

test('Meridian\'s own aircraft are entities: each morning the day decides who goes out, when and for how long', () => {
  const g = newGame(61);
  const A = g.aero;
  dayAt(g, 6);
  A.minuteTick();
  const test = A.state.aircraft['MA-TEST'];
  const jet = A.state.aircraft['MA-JET'];
  assert.ok(test && jet && test.ambient && jet.ambient, 'both are entities');
  assert.equal(test.state, 'parked'); assert.equal(jet.state, 'parked');
  assert.ok(A.ambientHome('MA-TEST') && A.ambientHome('MA-JET'));
  const plan = [test.sorties.map((s) => ({ ...s })), jet.sorties.map((s) => ({ ...s }))];
  // the same day gives the same day, whatever the dice
  const g2 = newGame(99);
  dayAt(g2, 6);
  g2.aero.minuteTick();
  assert.deepEqual([g2.aero.state.aircraft['MA-TEST'].sorties, g2.aero.state.aircraft['MA-JET'].sorties], plan);
  // within their hours, spaced apart, for the time they say
  const base = 5 * 1440;
  for (const [ac, d] of [[test, A.cfg.flight.ambient[0]], [jet, A.cfg.flight.ambient[1]]]) {
    let free = 0;
    for (const s of ac.sorties) {
      assert.ok(s.dep >= base + d.from * 60 - 1 && s.dep <= base + 24 * 60, 'in the daytime');
      assert.ok(s.away >= d.away[0] && s.away <= d.away[1]);
      assert.ok(s.dep >= free, 'one trip at a time'); free = s.dep + s.away;
    }
  }
  assert.ok(test.sorties.length + jet.sorties.length > 0, 'something happens on day 6');
});

test('a sortie: out of its stand, down the runway, away, and home again to the same stand', () => {
  const g = newGame(62);
  const A = g.aero;
  dayAt(g, 6);
  A.minuteTick();
  const ac = A.state.aircraft['MA-TEST'];
  const first = ac.sorties[0];
  const away = first.away;
  const seen = [ac.state];
  let leftAt = null;
  let homeAt = null;
  for (let i = 0; i < 1000; i++) {
    g.clock.total += 1; A.minuteTick();
    if (seen[seen.length - 1] !== ac.state) seen.push(ac.state);
    if (leftAt === null && !A.ambientHome('MA-TEST')) leftAt = g.clock.total;
    if (leftAt !== null && homeAt === null && ac.state === 'parked' && !ac.move) { homeAt = g.clock.total; break; }
  }
  assert.deepEqual(seen, ['parked', 'taxiing', 'takeoff', 'airborne', 'landing', 'taxiing', 'parked']);
  assert.ok(leftAt >= first.dep && leftAt <= first.dep + 30, 'it goes when the day said');
  assert.ok(homeAt - leftAt > away, 'and is away at least as long as the trip');
  assert.ok(A.ambientHome('MA-TEST'));
  assert.equal(ac.sortie, null);
  // while it is out it is not drawn on the apron and is not a mover, except on the field itself
  assert.equal(A.movers().filter((m) => m.id === 'MA-TEST').length, 0);
});

test('the runway is shared: a sortie\'s landing and a delivery\'s take-off never overlap', () => {
  const g = newGame(63);
  const A = g.aero;
  dayAt(g, 6);
  A.minuteTick();
  for (const pid of ['ap_swift', 'ap_tern', 'ap_skylark']) A.clearForDeparture(mk(g, A.meridian, pid));
  stepAll(g, 900);
  const f = A.state.field;
  const r = [...f.reserved].sort((a, b) => a.from - b.from);
  for (let i = 1; i < r.length; i++) assert.ok(r[i].from >= r[i - 1].to + 1.9, `window ${i} clear of ${i - 1}`);
});

test('a secure convoy leaves when a strategic product reaches its convoy stage, in three vehicles, and is off the map by the end of its road', () => {
  const g = newGame(64);
  const A = g.aero;
  const co = A.meridian;
  const P = A.cfg.products;
  const mkId = Object.keys(P).find((k) => P[k].line === 'missile');
  const c = A.makeContract(co, { customer: 'cu_ostmark_air', product: mkId, qty: 1, unitPrice: P[mkId].price, days: 60, quality: P[mkId].quality, depositShare: 0.2 });
  const u = A.state.units[c.units[0]];
  let ok = false;
  for (let i = 0; i < 30 && !ok; i++) { u.stage = i; ok = A.stageOf(u)?.id === 'convoy'; }
  assert.ok(ok);
  u.work = 0; u.need = 1; u.consumed = true; u.blocker = null; if (u.bay) A.freeBay(co, u);
  assert.equal(A.convoys().length, 0, 'not before its stage');
  step1(g);
  assert.ok(u.convoy && u.convoy.t1 > u.convoy.t0 + 20);
  const t0 = u.convoy.t0;
  const t1 = u.convoy.t1;
  g.clock.total = t0 + 12;
  let vs = A.convoys();
  assert.equal(vs.length, 3);
  assert.deepEqual(vs.map((v) => v.model), ['dray', 'longhorn', 'dray']);
  // they drive along the road: never inside a building, in file, a gap apart
  for (let t = t0 + 0.5; t < t1; t += 0.5) {
    g.clock.total = t;
    vs = A.convoys();
    for (const v of vs) {
      const inB = MAP.buildings.some((b) => !b.interior && v.x > b.x + 0.3 && v.x < b.x + b.w - 0.3 && v.y > b.y + 0.3 && v.y < b.y + b.h - 0.3);
      assert.ok(!inB, `a vehicle at ${v.x.toFixed(1)},${v.y.toFixed(1)} is inside a building`);
    }
    if (vs.length === 3) assert.ok(Math.hypot(vs[0].x - vs[1].x, vs[0].y - vs[1].y) > 2.5);
  }
  g.clock.total = t1 + 1;
  assert.equal(A.convoys().length, 0, 'gone');
  step1(g);
  assert.equal(u.convoy.t0, t0, 'and it left only once');
});
function step1(g) { g.clock.total += 1; g.aero.minuteTick(); }

test('the field is loud where aircraft roll and climb, and a launch is louder still; nothing far away', () => {
  const g = newGame(65);
  const A = g.aero;
  const ac = mk(g, A.meridian, 'ap_tern');
  const t0 = A.clearForDeparture(ac);
  const plan = departurePlan(F, geo, { stand: standPose(geo, ac.stand.apron, ac.stand.slot, ac.stand.size, P.ap_tern.look.len), apron: ac.stand.apron, len: P.ap_tern.look.len, spec: P.ap_tern.spec, rwy: ac.move.rwy });
  const roll = plan.legs.slice(0, plan.legs.findIndex((l) => l.state === 'takeoff')).reduce((a, l) => a + l.dur, 0);
  g.clock.total = t0 + roll + 4; // mid-roll
  const m = A.movers()[0];
  assert.equal(m.state, 'takeoff');
  const near = A.sound(m.x, m.y + 6);
  const far = A.sound(m.x, m.y + 140);
  assert.ok(near.jet > 0.3 && far.jet < near.jet / 3);
  assert.equal(near.rocket, 0);
  g.clock.total = t0 - 5; // before it moves: the apron is quiet
  assert.ok(A.sound(m.x, m.y).jet < 0.2);
});

test('the terminal reads the field: the runway in use and what each aircraft is doing', () => {
  const g = newGame(66);
  const A = g.aero;
  const co = A.meridian;
  const idle = A.fieldStatus(co);
  assert.ok(['09', '27'].includes(idle.rwy));
  assert.equal(idle.list.length, 0);
  const ac = mk(g, co, 'ap_tern');
  assert.equal(A.fieldStatus(co).list[0].label, 'waiting for its crew');
  const t0 = A.clearForDeparture(ac);
  assert.match(A.fieldStatus(co).list[0].label, /^(cleared to leave|being pushed back)/);
  g.clock.total = t0 + 10; A.minuteTick();
  assert.match(A.fieldStatus(co).list[0].label, /taxiing to runway/);
  g.clock.total = t0 + 200; A.minuteTick();
  assert.equal(A.fieldStatus(co).list.length, 0, 'gone');
  // Meridian's own aircraft are not "its customers' departures"
  assert.ok(A.state.aircraft['MA-TEST'].ambient);
});
