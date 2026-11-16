// A city in levels (v0.107.0; docs/RENDERING.md 7.7): the dressing that makes a deck read as a deck over the level below. The rules never see
// this: each level is its own flat map, and its drops ('O' tiles) are solid ground nobody can walk on.
import { THREE } from './three.js';
import * as lib from './lib3d.js';

const THICK = 0.9; // a deck's lip, tiles (how thick the slab looks where it ends)

/** Every edge between a deck tile and a drop gets a dark concrete lip going down and a thin lit strip along its top: merged into a few meshes. */
export function buildDeckEdges(map) {
  const g = new THREE.Group(); g.name = 'deckEdges';
  const W = map.width; const H = map.height; const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 'O' : map.tileAt(x, y));
  const E = map.def?.edges || map.def?.below; const lipCol = E?.lip || '#2a2c38'; const glow = E?.glow || '#3ad8ff';
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (at(x, y) === 'O') continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx; const ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H || at(nx, ny) !== 'O') continue;
      const cx = x + 0.5 + dx * 0.5; const cz = y + 0.5 + dy * 0.5; const along = dx ? 'z' : 'x';
      g.add(lib.box(along === 'x' ? 1.0 : 0.12, THICK, along === 'x' ? 0.12 : 1.0, lipCol, { x: cx, z: cz, y: -THICK, cast: false }));
      g.add(lib.box(along === 'x' ? 1.0 : 0.05, 0.05, along === 'x' ? 0.05 : 1.0, glow, { x: cx + dx * 0.04, z: cz + dy * 0.04, y: -0.04, cast: false, emissive: glow, ei: 1.4 }));
    }
  }
  lib.bake(g);
  return g;
}

/** Under a deck (`def.capTowers`, the deck's height in tiles): a dark slab round each tower where it meets the deck it rises through, its edges lit,
 * so a tower cut away above the deck reads as going on up into the ceiling of the street. */
export function buildDeckCaps(map, cap, glowColour) {
  const g = new THREE.Group(); g.name = 'deckCaps';
  const glow = glowColour || map.def?.capGlow || '#3ad8ff';
  for (const b of map.buildings || []) {
    if (!b.tower) continue;
    const cx = b.x + b.w / 2; const cz = b.y + b.h / 2; const w = b.w + 1.2; const d = b.h + 1.2; const y = cap - 0.5;
    g.add(lib.box(w, 0.45, d, '#15161f', { x: cx, z: cz, y, cast: false }));
    g.add(lib.box(w + 0.04, 0.06, 0.06, glow, { x: cx, z: cz + d / 2, y, cast: false, emissive: glow, ei: 1.6 }), lib.box(0.06, 0.06, d + 0.04, glow, { x: cx + w / 2, z: cz, y, cast: false, emissive: glow, ei: 1.6 }));
  }
  lib.bake(g);
  return g;
}
