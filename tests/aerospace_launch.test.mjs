// Launches (v0.58.0): the crawler's rollout, the countdown and ascent, a vehicle lost — fixed
// when the sequence begins, booked when it ends, and the same after a reload.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, CONTENT, Game } from './helpers.mjs';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';
import { startSequence, phaseAt, height, clockText, puffs, debris, shakeAt, padBase, rolloutPath, rolloutAt } from '../src/aero/launch.js';

const L = CONTENT.aerospace.flight.launch;
const MAP = CONTENT.maps.starling_flats;
const step = (g, n) => { for (let i = 0; i < n; i++) { g.clock.total += 1; g.aero.minuteTick(); } };

/** Meridian's first rocket not carrying satellites, set at the named stage with its launch roll fixed. */
function rocketAt(g, stageId, roll = 0.999) {
  const A = g.aero;
  const find = () => Object.values(A.state.units).find((x) => x.line === 'rocket' && x.company === 'meridian' && !x.finished && x.purpose !== 'launcher');
  if (!find()) { const P = A.cfg.products.rk_heron; A.makeContract(A.meridian, { customer: 'cu_ostmark_space', product: 'rk_heron', qty: 1, unitPrice: P.price, days: 60, quality: P.quality, depositShare: 0.2 }); }
  const u = find();
  assert.ok(u, 'Meridian has a rocket on order');
  if (u.bay) A.freeBay(A.meridian, u);
  let ok = false;
  for (let i = 0; i < 30 && !ok; i++) { u.stage = i; ok = A.stageOf(u)?.id === stageId; }
  assert.ok(ok, `a ${stageId} stage`);
  u.work = 0; u.need = 0; u.consumed = true; u.blocker = null; u.purpose = 'customer';
  u.rolls.launch = roll;
  return u;
}

test('a sequence is fixed when it starts: the outcome, the moment of failure, the clock', () => {
  const u = { id: 'U42' };
  const a = startSequence(L, u, 1000, true, 10);
  const b = startSequence(L, u, 1000, true, 10);
  assert.deepEqual(a, b);
  assert.equal(a.lift, 1000 + L.countdownMin);
  assert.equal(a.failT, null);
  assert.equal(a.end, a.lift + L.ascentMin);
  const f = startSequence(L, u, 1000, false, 30);
  assert.ok(f.failT >= L.failFrom && f.failT <= L.failFrom + L.failSpan, `fails ${f.failT} minutes after lift-off`);
  assert.equal(f.end, f.lift + f.failT + L.aftermath);
  assert.equal(startSequence(L, { id: 'U43' }, 1000, false, 30).failT === f.failT, false, 'each vehicle its own moment');
});

test('the phases come in order and the rocket only climbs', () => {
  const seq = startSequence(L, { id: 'U7' }, 0, true, 5);
  const order = [];
  let h = -1;
  for (let now = 0; now <= seq.end + 5; now += 0.25) {
    const ph = phaseAt(L, seq, now);
    if (order[order.length - 1] !== ph.phase) order.push(ph.phase);
    assert.ok(ph.h >= h - 1e-9, 'height never falls');
    h = ph.h;
    if (ph.phase === 'countdown' || ph.phase === 'ignition') assert.equal(ph.h, 0, 'on the pad until lift-off');
  }
  assert.deepEqual(order, ['countdown', 'ignition', 'ascent', 'done']);
  assert.equal(height(L, -3), 0);
  assert.ok(height(L, 6) > 6 && height(L, 12) > 4 * height(L, 6) - 1e-9 && Math.abs(height(L, 12) / height(L, 6) - 4) < 1e-9, 'a steady climb (distance goes with the square of the time)');
  const lost = startSequence(L, { id: 'U8' }, 0, false, 50);
  const o2 = [];
  for (let now = 0; now <= lost.end + 5; now += 0.25) { const ph = phaseAt(L, lost, now); if (o2[o2.length - 1] !== ph.phase) o2.push(ph.phase); }
  assert.deepEqual(o2, ['countdown', 'ignition', 'ascent', 'lost', 'done']);
  assert.equal(phaseAt(L, lost, lost.lift + lost.failT + 0.1).boom > 0, true);
});

test('the clock reads minutes as seconds, T-minus before and T-plus after', () => {
  assert.equal(clockText(-12), 'T-00:12');
  assert.equal(clockText(-75), 'T-01:15');
  assert.equal(clockText(0), 'T-00:00');
  assert.equal(clockText(7), 'T+00:07');
});

test('smoke is a function of the time: the same twice, bounded in number, gone in time', () => {
  const seq = startSequence(L, { id: 'U9' }, 0, true, 5);
  for (const t of [-5, -1, 0, 1, 3, 6, 10, 20, 40]) {
    const a = puffs(L, seq, t);
    assert.deepEqual(a, puffs(L, seq, t));
    assert.ok(a.length < 260, `${a.length} puffs at ${t}`);
    for (const p of a) assert.ok(p.a >= 0 && p.a <= 1 && p.r > 0);
  }
  assert.equal(puffs(L, seq, L.ascentMin + L.trailLife + 5).length, 0, 'the sky clears');
  // a vehicle lost leaves no trail past the moment it goes
  const lost = startSequence(L, { id: 'U10' }, 0, false, 50);
  const trail = puffs(L, lost, lost.failT + 1).filter((p) => p.kind === 'trail');
  assert.ok(trail.every((p) => -p.dy <= height(L, lost.failT) + 1.5));
  // debris comes down and is out of sight in the end
  assert.ok(debris(L, lost, 0.5).length > 0);
  assert.equal(debris(L, lost, 40).length, 0);
});

test('the ground shakes near the pad while it burns, and not far away or when quiet', () => {
  const seq = startSequence(L, { id: 'U11' }, 0, true, 5);
  const at = (t) => phaseAt(L, seq, seq.lift + t);
  assert.equal(shakeAt(L, at(-15), 5), 0);
  assert.ok(shakeAt(L, at(-1), 5) > shakeAt(L, at(-4), 5));
  assert.ok(shakeAt(L, at(1), 5) > shakeAt(L, at(1), 40));
  assert.equal(shakeAt(L, at(1), 200), 0);
  assert.equal(shakeAt(L, at(30), 5), 0);
});

test('the crawler\'s way is on the map: it starts at the door, runs on hard ground and ends at the foot of the pad', () => {
  const pads = MAP.props.filter((p) => p.type === 'launch_pad');
  for (const co of ['meridian', 'roost']) {
    const pad = pads.find((p) => (p.aero?.company || p.company) === co);
    const base = padBase(pad);
    const way = MAP.launch[co].rollout;
    const path = rolloutPath(way, base);
    assert.ok(path.len > 20, `${co}: a real distance`);
    const a = rolloutAt(path, { t0: 0, t1: 30 }, 0);
    const z = rolloutAt(path, { t0: 0, t1: 30 }, 30);
    assert.ok(Math.hypot(a.x - way[0][0], a.y - way[0][1]) < 0.01);
    assert.ok(Math.hypot(z.x - base.x, z.y - base.y) < 0.01, `${co}: ends at the foot of the pad`);
    for (let t = 0; t <= 30; t += 0.5) {
      const p = rolloutAt(path, { t0: 0, t1: 30 }, t);
      const ch = MAP.tiles[Math.floor(p.y)][Math.floor(p.x)];
      assert.ok(!'B~#'.includes(ch), `${co}: (${p.x.toFixed(1)}, ${p.y.toFixed(1)}) is ${ch}`);
      const inBuilding = MAP.buildings.some((b) => !b.interior && p.x > b.x + 0.2 && p.x < b.x + b.w - 0.2 && p.y > b.y + 0.2 && p.y < b.y + b.h - 0.2);
      assert.ok(!inBuilding, `${co}: ${p.x.toFixed(1)},${p.y.toFixed(1)} is inside a building`);
    }
  }
});

test('a rocket takes the pad and rolls out to it on the crawler: half an hour, the deck bare until it arrives', () => {
  const g = newGame(51);
  const A = g.aero;
  const u = rocketAt(g, 'to_pad');
  const co = A.meridian;
  step(g, 1);
  assert.equal(co.pad.unit, u.id);
  assert.ok(u.rollout && Math.abs(u.rollout.t1 - u.rollout.t0 - L.rolloutMin) < 1e-9);
  assert.equal(A.stageOf(u).id, 'to_pad');
  assert.ok(/crawler/.test(u.blocker.text));
  const ls = A.launches();
  assert.equal(ls.filter((l) => l.kind === 'rollout').length, 1);
  const padProp = MAP.props.find((p) => p.type === 'launch_pad' && p.company === 'meridian');
  assert.equal(A.propView(padProp).key, 'rollout', 'nothing stands on the pad yet');
  const vib = MAP.interiors?.meridian_vib || CONTENT.maps.meridian_vib.props.find((p) => p.aero?.pad);
  assert.ok(vib);
  step(g, L.rolloutMin - 2);
  assert.equal(A.stageOf(u).id, 'to_pad', 'not there yet');
  step(g, 3);
  assert.equal(A.stageOf(u).id, 'vertical', 'on the pad: it stands up');
  assert.equal(co.pad.roll, null);
  assert.notEqual(A.propView(padProp).key, 'rollout');
  assert.equal(A.launches().filter((l) => l.kind === 'rollout').length, 0);
});

test('the pad is taken by one rocket at a time: the second waits in the building until the first has gone', () => {
  const g = newGame(52);
  const A = g.aero;
  const first = rocketAt(g, 'to_pad');
  const other = Object.values(A.state.units).find((x) => x.line === 'rocket' && x.company === 'meridian' && !x.finished && x !== first && x.purpose !== 'launcher');
  if (other) { let ok = false; for (let i = 0; i < 30 && !ok; i++) { other.stage = i; ok = A.stageOf(other)?.id === 'to_pad'; } other.work = 0; other.need = 0; other.consumed = true; if (other.bay) A.freeBay(A.meridian, other); }
  step(g, 3);
  assert.equal(A.meridian.pad.unit, first.id);
  if (other) { assert.ok(!other.rollout, 'the second has not left the building'); assert.equal(other.blocker?.kind, 'pad'); }
});

test('a countdown: T-20, lift-off, ascent, and the outcome booked exactly when it ends', () => {
  const g = newGame(53);
  const A = g.aero;
  const co = A.meridian;
  const u = rocketAt(g, 'launch');
  co.pad.unit = u.id;
  const before = co.stats.launches;
  step(g, 1);
  assert.ok(u.seq, 'the countdown began');
  assert.equal(u.seq.success, true);
  assert.equal(co.stats.launches, before, 'nothing is booked yet');
  assert.ok(A.state.news.some((n) => /counting down/.test(n.text)));
  const ls = A.launches().find((l) => l.kind === 'sequence');
  assert.equal(ls.ph.phase, 'countdown');
  step(g, L.countdownMin + L.ascentMin - 3);
  assert.equal(co.stats.launches, before, 'still in the air');
  assert.equal(A.stageOf(u).id, 'launch');
  step(g, 5);
  assert.equal(co.stats.launches, before + 1, 'booked when it ends');
  assert.equal(u.launch.success, true);
  assert.equal(u.launch.at, u.seq.lift, 'the launch is dated from lift-off');
  assert.notEqual(A.stageOf(u).id, 'launch');
  assert.equal(co.pad.unit, null);
  assert.ok(A.launches().some((l) => l.kind === 'sequence'), 'the smoke is still drawn for a while');
  step(g, L.trailLife + 5);
  assert.equal(A.launches().filter((l) => l.kind === 'sequence').length, 0, 'and then the sky is clear');
});

test('a vehicle that was always going to be lost is lost at the moment the show says, and the loss is booked then', () => {
  const g = newGame(54);
  const A = g.aero;
  const co = A.meridian;
  const u = rocketAt(g, 'launch', 0); // the roll that fails
  co.pad.unit = u.id;
  step(g, 1);
  assert.equal(u.seq.success, false);
  assert.ok(u.seq.failT > 0);
  const rep = co.reputation;
  const failures = co.stats.launchFailures;
  step(g, Math.ceil(L.countdownMin + u.seq.failT + L.aftermath) + 1);
  assert.equal(co.stats.launchFailures, failures + 1);
  assert.equal(u.launch.success, false);
  assert.ok(u.finished && u.failure, 'the unit is lost');
  assert.ok(A.state.news.some((n) => /lost shortly after lift-off/.test(n.text)));
  void rep;
});

test('what you watch is what is booked: the roll decides, whatever the quality does during the countdown', () => {
  const g = newGame(55);
  const A = g.aero;
  const co = A.meridian;
  const u = rocketAt(g, 'launch', 0.5);
  co.pad.unit = u.id;
  step(g, 1);
  const ok = u.seq.success;
  co.qualityBase = (co.qualityBase ?? 70) - 40; // the firm's quality collapses mid-countdown
  step(g, L.countdownMin + L.ascentMin + 20);
  assert.equal(u.launch.success, ok);
});

test('a reload in the middle of a countdown goes on from where it was, and a long sleep finishes it', () => {
  const g = newGame(56);
  const A = g.aero;
  const co = A.meridian;
  const u = rocketAt(g, 'launch');
  co.pad.unit = u.id;
  step(g, 8);
  const sm = new SaveManager(new MemoryStorage());
  assert.ok(sm.save('slot1', g).ok);
  const g2 = new Game(CONTENT);
  assert.ok(sm.load('slot1', g2).ok);
  const l1 = A.launches().find((l) => l.kind === 'sequence');
  const l2 = g2.aero.launches().find((l) => l.kind === 'sequence');
  assert.ok(l2);
  assert.equal(l2.ph.phase, l1.ph.phase);
  assert.ok(Math.abs(l2.ph.t - l1.ph.t) < 1e-9);
  step(g2, 60);
  const u2 = g2.aero.state.units[u.id];
  assert.equal(u2.launch.success, true);
  assert.equal(g2.aero.meridian.stats.launches, co.stats.launches + 1);
});

test('cancelling a rocket on its way to the pad gives the pad back', () => {
  const g = newGame(57);
  const A = g.aero;
  const co = A.meridian;
  const u = rocketAt(g, 'to_pad');
  step(g, 2);
  assert.ok(co.pad.roll);
  A.freeUnit ? A.freeUnit(co, u) : A.failUnit(co, u, 'test');
  assert.equal(co.pad.unit, null);
  assert.equal(co.pad.roll, null);
  assert.equal(A.launches().filter((l) => l.kind === 'rollout').length, 0);
});

test('the terminal reads the pad: the crawler, the clock, the climb — and then nothing', () => {
  const g = newGame(58);
  const A = g.aero;
  const co = A.meridian;
  assert.equal(A.launchStatus(co), null, 'quiet to begin with');
  const u = rocketAt(g, 'to_pad');
  step(g, 2);
  let ls = A.launchStatus(co);
  assert.equal(ls.kind, 'rollout');
  assert.match(ls.clock, /min$/);
  step(g, L.rolloutMin);
  assert.equal(A.launchStatus(co), null, 'on the pad, standing up');
  for (let i = 0; i < 30; i++) { u.stage = i; if (A.stageOf(u)?.id === 'launch') break; }
  u.work = 0; u.need = 0; u.consumed = true;
  step(g, 1);
  ls = A.launchStatus(co);
  assert.equal(ls.kind, 'countdown');
  assert.match(ls.clock, /^T-00:/);
  step(g, L.countdownMin - L.ignitionMin);
  assert.equal(A.launchStatus(co).kind, 'ignition');
  step(g, L.ignitionMin + 1);
  assert.equal(A.launchStatus(co).kind, 'ascent');
  assert.match(A.launchStatus(co).clock, /^T\+/);
  step(g, L.ascentMin + 2);
  assert.equal(A.launchStatus(co), null, 'away');
});
