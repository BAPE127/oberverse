import { CONTENT } from '../src/content/index.js';
import { Game } from '../src/game/game.js';
import { TILE } from '../src/core/util.js';

export function newGame(seed = 1234, opts = {}) {
  const g = new Game(CONTENT, { seed });
  g.newGame({ playerName: 'Tester', seed, ...opts });
  return g;
}

/** Advance the simulation by game minutes in small real-time steps. */
export function run(g, minutes, step = 0.5) {
  const steps = Math.ceil(minutes / step);
  for (let i = 0; i < steps; i++) g.update(step, { x: 0, y: 0 });
}

/** Advance until a predicate holds (or give up). */
export function runUntil(g, pred, maxMinutes = 1440, step = 0.5) {
  for (let i = 0; i < maxMinutes / step; i++) {
    if (pred()) return true;
    g.update(step, { x: 0, y: 0 });
  }
  return pred();
}

/** Put the player at a named spot. */
export function place(g, map, spot) {
  g.changeMap(map, spot);
}

/** Put the player right next to an NPC. */
export function besideNpc(g, id) {
  const n = g.npcs.get(id);
  if (g.player.map !== n.map) g.changeMap(n.map, Object.keys(g.maps.get(n.map).spots)[0]);
  g.player.x = n.x + 20;
  g.player.y = n.y;
  return n;
}

export function setTime(g, day, hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  g.clock.total = (day - 1) * 1440 + h * 60 + m;
  g.world.lastHour = Math.floor(g.clock.total / 60);
  g.settleNpcs();
}

/** Suppress personality impulses (for tests that check pure schedule adherence). */
export function noImpulses(g, ids = [...g.npcs.keys()]) {
  for (const id of ids) {
    const n = g.npcs.get(id);
    n.impulseCooldowns = Object.fromEntries((n.profile.impulses || []).map((i) => [i.id, Infinity]));
  }
}

export { CONTENT, Game, TILE };
