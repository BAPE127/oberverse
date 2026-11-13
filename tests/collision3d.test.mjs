// Collision against the 3D models (owner's report, 2026-11-13: "an invisible wall by the prop"). The simulation blocks whole tiles
// (src/world/gameMap.js: a solid prop blocks x..x+w, y..y+h; the player's feet box is PLAYER_BOX); the 3D models must stand on
// those tiles. Root cause found: world3d overwrote a builder's own offset inside the footprint (`group(w/2, 0, h/2)`) with the
// tile corner, so models stood up to half their footprint north-west of what they block. `placeProp` adds instead.
import test from 'node:test';
import assert from 'node:assert/strict';
import { THREE } from '../src/engine3d/three.js';
import * as lib from '../src/engine3d/lib3d.js';
import { PROPS } from '../src/engine3d/registry3d.js';
import '../src/engine3d/props3d.js';
import { Figure } from '../src/engine3d/people3d.js';
import { PLAYER_BOX } from '../src/game/game.js';
import { newGame } from './helpers.mjs';

const TILE = 32;
const ctxOf = (o = {}) => ({ THREE, lib, map: null, game: null, night: false, state: null, time: 0, headless: true, ...o });
// A model may be smaller than its blocked rectangle (a bench is 0.45 deep on a 1-tile block) but must be centred in it: by at most
// CENTRE tiles, must not stand out of it by more than STICK tiles on the ground, and the model (any height) must be at least SPECK
// tiles across on its longer side, so that a prop is not a speck on a block. Poles (a tree trunk 0.17 under a canopy, a fence post, a
// bollard) stand centred in their tile: the simulation blocks the whole tile and cannot be narrowed from here.
const CENTRE = 0.2; const STICK = 0.15; const SPECK = 0.25;
// Known data quirk, reported not hidden: `moored_ship` blocks a 4x9 berth of water but the tug (look.len 3.2) is drawn at its north end, as
// the 2D view drew it.
const KNOWN = new Set(['moored_ship']);
// Wall furniture is built against the wall side of its tile (a lift in a wall, a rack on a wall): centred by design on one axis only.
const AGAINST_WALL = new Set(['lift', 'gunrack', 'toolrack', 'cellbars', 'noticeboard', 'bigsign', 'roadsign', 'sign', 'runway_sign', 'chainfence']);

test('every solid prop on every map: its model stands on the tiles the simulation blocks (centred, not sticking out, not a speck)', () => {
  const g = newGame(1);
  const seen = new Set(); const bad = []; let n = 0;
  for (const [id, map] of g.maps) {
    const ctx = ctxOf({ map, game: g });
    for (const p of map.props) {
      if (!p.solid || p.hiddenUnless) continue;
      const key = `${p.type}|${p.w}|${p.h}|${p.variant}|${p.vertical}|${p.kind}|${p.heading || 0}`;
      if (seen.has(key)) continue;
      seen.add(key);
      let o; try { o = PROPS.get(p.type)(p, ctx); } catch (e) { bad.push(`${p.type}: threw ${e.message}`); continue; }
      lib.placeProp(o, p);
      const b = lib.baseBox(o); if (!b) continue; n++;
      const w = p.w || 1; const h = p.h || 1;
      const cx = (b.x0 + b.x1) / 2 - (p.x + w / 2); const cz = (b.z0 + b.z1) / 2 - (p.y + h / 2);
      const wall = AGAINST_WALL.has(p.type);
      const label = `${p.type} ${w}x${h} (${id}) centre off ${cx.toFixed(2)},${cz.toFixed(2)} base ${(b.x1 - b.x0).toFixed(2)}x${(b.z1 - b.z0).toFixed(2)}`;
      if (p.heading) continue; // an aircraft turned on its apron: the aerospace builders own that
      if (KNOWN.has(p.type)) continue;
      if (Math.abs(cx) > CENTRE) bad.push(`${label}: not centred in x`);
      if (Math.abs(cz) > CENTRE && !wall) bad.push(`${label}: not centred in z`);
      if (b.x0 < p.x - STICK || b.x1 > p.x + w + STICK || b.z0 < p.y - STICK || b.z1 > p.y + h + STICK) bad.push(`${label}: sticks out of its block`);
      const all = new THREE.Box3().setFromObject(o);
      if (Math.max(all.max.x - all.min.x, all.max.z - all.min.z) < SPECK) bad.push(`${label}: a speck on its block`);
    }
  }
  assert.ok(n > 150, `${n} distinct solid records`);
  assert.deepEqual(bad, []);
});

test('lights a prop carries sit over its own tiles (the object offset is part of their frame)', () => {
  const g = newGame(1); const bad = []; const seen = new Set();
  for (const [id, map] of g.maps) for (const p of map.props) {
    if (seen.has(p.type)) continue; seen.add(p.type);
    let o; try { o = PROPS.get(p.type)(p, ctxOf({ map, game: g })); } catch { continue; }
    lib.placeProp(o, p);
    const w = p.w || 1; const h = p.h || 1;
    for (const l of o.userData.lights || []) {
      const x = o.position.x + l.x; const z = o.position.z + l.z;
      if (x < p.x - 1.2 || x > p.x + w + 1.2 || z < p.y - 1.2 || z > p.y + h + 1.2) bad.push(`${p.type} (${id}): light at ${x.toFixed(2)},${z.toFixed(2)} for tiles ${p.x},${p.y} ${w}x${h}`);
    }
  }
  assert.deepEqual(bad, []);
});

test('a figure stands in its feet box: the figure\'s feet are within the PLAYER_BOX rectangle the simulation uses', () => {
  const app = { skin: '#d9a77c', hair: '#2f2a35', hairStyle: 'short', outfit: '#3f7f8f' };
  const fig = new Figure(app, null, null);
  for (const [x, y] of [[100, 200], [33.5, 77], [2000, 464]]) {
    fig.pose({ x: x / TILE, y: 0, z: y / TILE, yaw: 0.7, phase: null, lying: false, lift: 0 });
    const b = lib.baseBox(fig.root, 0.3); assert.ok(b, 'the figure has parts near the ground');
    const box = { x0: (x - PLAYER_BOX.w / 2) / TILE, x1: (x + PLAYER_BOX.w / 2) / TILE, z0: (y - PLAYER_BOX.h + 2) / TILE, z1: (y + 2) / TILE };
    const cx = (b.x0 + b.x1) / 2 - (box.x0 + box.x1) / 2; const cz = (b.z0 + b.z1) / 2 - (box.z0 + box.z1) / 2;
    assert.ok(Math.abs(cx) < 0.1 && Math.abs(cz) < 0.2, `feet centre off by ${cx.toFixed(2)}, ${cz.toFixed(2)} tiles`);
    assert.ok(b.x0 > box.x0 - 0.15 && b.x1 < box.x1 + 0.15 && b.z0 > box.z0 - 0.2 && b.z1 < box.z1 + 0.2, `feet ${JSON.stringify(b)} vs box ${JSON.stringify(box)}`);
  }
});
