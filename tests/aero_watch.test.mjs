// The take-off notice (v0.91.0): when a finished aircraft of yours is cleared to leave, the game remembers it so the screen can count down to the
// take-off and send you to the runway viewpoint. It ends by itself once the aircraft has gone, can be dismissed, and is saved.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newGame, CONTENT, Game } from './helpers.mjs';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';
import { runwayWindow, fieldGeo } from '../src/aero/flight.js';
import { planOf } from '../src/aero/field.js';

const mk = (g, co, pid) => { const A = g.aero; const id = A.registerAircraft(co, { id: `U-${pid}`, product: pid, contract: null, config: {} }); return A.state.aircraft[id]; };

test('cleared to leave: a notice with the aircraft, its take-off time and the runway viewpoint; nothing before, and rivals\' flights make none', () => {
  const g = newGame(9601);
  const A = g.aero;
  assert.equal(A.watchNotice(), null, 'nothing before');
  const ac = mk(g, A.meridian, 'ap_tern');
  A.clearForDeparture(ac);
  assert.equal(A.watchNotice(), null, 'a rival\'s aircraft leaving is not yours to watch');
  const mine = mk(g, A.meridian, 'ap_tern');
  const heard = []; g.bus.on('aero:departure', (e) => heard.push(e));
  const t0 = A.clearForDeparture(mine);
  A.announceDeparture(mine, t0);
  const w = A.watchNotice();
  assert.ok(w && w.id === mine.id && w.name && w.spot === 'runway_view' && w.map === 'starling_flats');
  const win = runwayWindow(planOf(A, mine));
  assert.equal(w.at, Math.round(t0 + win.from)); assert.equal(w.end, Math.round(t0 + win.to)); assert.ok(w.at >= g.clock.total);
  assert.equal(heard.length, 1);
  assert.ok(CONTENT.maps.starling_flats.spots.runway_view, 'and the viewpoint exists on the field');
});

test('it lasts until the aircraft has gone, dismissing hides it, and a new departure replaces it', () => {
  const g = newGame(9602);
  const A = g.aero;
  const ac = mk(g, A.meridian, 'ap_tern');
  A.announceDeparture(ac, A.clearForDeparture(ac));
  const w = A.watchNotice();
  g.clock.total = w.at; assert.ok(A.watchNotice(), 'at take-off it is still up');
  g.clock.total = w.end + 1; assert.ok(A.watchNotice(), 'while it climbs out');
  g.clock.total = w.end + 3; assert.equal(A.watchNotice(), null, 'gone with the aircraft');
  const g2 = newGame(9603); const B = g2.aero;
  const a2 = mk(g2, B.meridian, 'ap_tern'); B.announceDeparture(a2, B.clearForDeparture(a2));
  B.dismissWatch(); assert.equal(B.watchNotice(), null, 'dismissed');
  const a3 = mk(g2, B.meridian, 'ap_swift'); B.announceDeparture(a3, B.clearForDeparture(a3));
  assert.equal(B.watchNotice().id, a3.id, 'the next one is announced afresh');
});

test('it is saved: a reload in the minutes before take-off still shows it', () => {
  const g = newGame(9604);
  const A = g.aero;
  const ac = mk(g, A.meridian, 'ap_tern'); A.announceDeparture(ac, A.clearForDeparture(ac));
  const sm = new SaveManager(new MemoryStorage());
  assert.ok(sm.save('slot1', g).ok);
  const h = new Game(CONTENT, { seed: 1 });
  assert.ok(sm.load('slot1', h).ok);
  assert.deepEqual(h.aero.watchNotice(), g.aero.watchNotice());
});

test('wiring: handing over your aircraft announces it, and the screen has the card, its button and its dismiss', () => {
  const a = readFileSync('src/systems/aerospace.js', 'utf8');
  assert.match(a, /if \(co\.kind === 'player'\) this\.announceDeparture\(ac, t0\)/);
  const u = readFileSync('src/ui/ui.js', 'utf8');
  assert.match(u, /updateWatch\(\)/); assert.match(u, /Watch it/); assert.match(u, /watchTakeoff\(\)/); assert.match(u, /dismissWatch/);
  assert.match(readFileSync('dev.html', 'utf8'), /id="watchnote"/);
  void fieldGeo;
});
