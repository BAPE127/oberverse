// CONCEPT STUDY ONLY — reads the game, never writes to it.
// Builds the real game headlessly (the simulation is DOM-free), walks the clock to a time of day
// and writes what the renderer would be handed: the tile grid, buildings, interiors laid over their
// footprints, props, people and vehicles of one region. Output: data/<mapId>.json
//   node mockups/iso25d/tools/dump-scenes.mjs [mapId ...]
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { CONTENT } from '../../../src/content/index.js';
import { Game } from '../../../src/game/game.js';
import { TILE } from '../../../src/core/util.js';

const here = dirname(fileURLToPath(import.meta.url));
const ids = process.argv.slice(2);
const WANT = ids.length ? ids : ['lanternside', 'halvermouth', 'ober_fields', 'fort_gullcrest', 'lariat', 'yards', 'starling_flats'];
const flat = (o) => Object.fromEntries(Object.entries(o).filter(([k, v]) => ['string', 'number', 'boolean'].includes(typeof v) && !['examine', 'label'].includes(k)));

for (const mapId of WANT) {
  const g = new Game(CONTENT, { seed: 7 });
  g.newGame({});
  const main = g.maps.get(mapId);
  const spot = Object.keys(main.spots)[0];
  g.changeMap(mapId, spot);
  g.skipTime(((10 * 60 + 40) - (g.clock.total % 1440) + 1440) % 1440); // 10:40 — shops open, people at work
  for (let i = 0; i < 40; i++) g.update(0.05);
  const layers = [{ map: main, x: 0, y: 0 }, ...g.neighbors(mapId)].map((L) => {
    const m = L.map;
    return {
      id: m.id, name: m.name, kind: m.kind, ox: L.x / TILE, oy: L.y / TILE, w: m.width, h: m.height,
      rows: m.grid.map((r) => r.join('')),
      areas: m.areas.map((a) => ({ name: a.name, x: a.x, y: a.y, w: a.w, h: a.h })),
      buildings: m.buildings.map((b) => ({ ...flat(b), door: b.door ? { x: b.door.x, y: b.door.y } : null })),
      props: m.props.filter((p) => !p.hiddenUnless).map((p) => flat(p)),
      doors: m.doors.map((d) => ({ x: d.x, y: d.y, building: d.building || null, to: d.to?.map || null })),
      fields: m.def.fields || null, airfield: m.def.airfield || null,
    };
  });
  const on = new Set(layers.map((l) => l.id));
  const npcs = [...g.npcs.values()].filter((n) => on.has(n.map)).map((n) => ({ id: n.id, name: n.profile.name, map: n.map, x: n.x / TILE, y: n.y / TILE, facing: n.facing, activity: n.activity, appearance: flat(n.profile.appearance || {}), role: n.profile.role || n.profile.job || null }));
  const models = g.content.vehicles.models;
  const cars = g.vehicles.carsOn(mapId).map((c) => ({ id: c.id, model: c.model, body: models[c.model].body, len: models[c.model].len / TILE, wid: models[c.model].wid / TILE, x: c.x / TILE, y: c.y / TILE, angle: c.angle, color: c.color }));
  const transit = g.transit.on(mapId).map((f) => ({ kind: f.kind, line: f.line || null, model: f.model || null, body: f.model ? models[f.model]?.body : 'bus', len: f.len / TILE, wid: f.wid / TILE, x: f.x / TILE, y: f.y / TILE, angle: f.angle, color: f.color }));
  const out = { id: mapId, name: main.name, version: g.content.version || null, clock: g.clock.timeString, player: { appearance: flat(g.player.appearance) }, layers, npcs, cars, transit, tileTypes: Object.fromEntries(Object.entries((await import('../../../src/world/tiles.js')).TILE_TYPES).map(([k, v]) => [k, { name: v.name, color: v.color }])) };
  const file = join(here, '..', 'data', `${mapId}.json`);
  writeFileSync(file, JSON.stringify(out));
  console.log(mapId, `${main.width}x${main.height}`, 'layers', layers.length, 'npcs', npcs.length, 'cars', cars.length, 'transit', transit.length, (JSON.stringify(out).length / 1024 | 0) + ' KB');
}
