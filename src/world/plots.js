// Expands property plots into ordinary content at load time, so the rest of
// the engine needs no special cases: each plot gets survey stakes and a
// building-site frame on its map (shown by state), an interior map holding
// the furniture of every blueprint (shown by which blueprint was built), and a
// storage container. The finished exterior building is added at runtime by
// Game.rebuildMaps() once the property is complete.
import { roomTiles } from './mapBuilder.js';

export const plotInteriorId = (plotId) => `${plotId}_inside`;
export const plotContainerId = (plotId) => `cont_${plotId}`;

/** The exterior building for a finished property. */
export function plotBuilding(plotId, plot, bp) {
  return {
    id: `b_${plotId}`, name: plot.name, mapLabel: plot.name, x: plot.x, y: plot.y, w: plot.w, h: plot.h,
    roof: bp.roof, wall: bp.wall, trim: bp.trim, sign: plot.sign || null,
    door: { x: plot.door.x, y: plot.door.y, to: { map: plotInteriorId(plotId), spot: 'entry' } },
  };
}

/**
 * @param {object} content the content registry (not mutated)
 * @param {object} plots PLOTS registry
 * @returns {object} new content object with plots applied
 */
export function withPlots(content, plots) {
  const maps = { ...content.maps };
  const containers = { ...content.containers };
  for (const [id, plot] of Object.entries(plots)) {
    const host = maps[plot.map];
    if (!host) continue;
    const props = [
      { id: `${id}_stake_a`, type: 'stake', x: plot.x, y: plot.y, hiddenUnless: { property: { plot: id, state: 'none' } } },
      { id: `${id}_stake_b`, type: 'stake', x: plot.x + plot.w - 1, y: plot.y + plot.h - 1, hiddenUnless: { property: { plot: id, state: 'none' } } },
      { id: `${id}_board`, type: 'sign', x: plot.door.x + 1, y: plot.y + plot.h, examine: `"${plot.name} — surveyed by Mason's Os. Enquire at the site office."`, hiddenUnless: { property: { plot: id, state: 'none' } } },
      { id: `${id}_frame`, type: 'scaffold', x: plot.x, y: plot.y, w: plot.w, h: plot.h, examine: `Mason's Os is building here. A sign: "${plot.name} — UNDER CONSTRUCTION. Pardon our dust; we're working on our foundation jokes."`, hiddenUnless: { property: { plot: id, state: ['permit', 'building'] } } },
    ];
    maps[plot.map] = {
      ...host,
      spots: { ...host.spots, [`${id}_out`]: plot.outside, [`${id}_crew`]: plot.outside },
      props: [...host.props, ...props],
    };
    const cont = plotContainerId(id);
    containers[cont] = { name: 'Your storage chest', owner: 'player', items: {}, hiddenUnless: { property: { plot: id, blueprint: 'home' } } };
    const shown = (bp) => ({ property: { plot: id, blueprint: bp } });
    maps[plotInteriorId(id)] = {
      id: plotInteriorId(id),
      name: plot.name,
      kind: 'interior',
      music: 'mus_home',
      ambience: 'amb_indoor',
      tiles: roomTiles(10, 7, 'f', 4),
      doors: [{ id: `door_${id}_exit`, x: 4, y: 6, to: { map: plot.map, spot: `${id}_out` } }],
      spots: { entry: { x: 4, y: 5, facing: 'up' } },
      props: [
        { id: `${id}_bed`, type: 'bed', x: 1, y: 1, interact: { kind: 'sleep' }, hiddenUnless: shown('home') },
        { id: `${id}_chest`, type: 'chest', x: 7, y: 1, interact: { kind: 'container', container: cont }, hiddenUnless: shown('home') },
        { id: `${id}_rug`, type: 'rug', x: 3, y: 3, w: 3, h: 2, hiddenUnless: shown('home') },
        { id: `${id}_bed_a`, type: 'bed', x: 1, y: 1, hiddenUnless: shown('rental') },
        { id: `${id}_bed_b`, type: 'bed', x: 7, y: 1, hiddenUnless: shown('rental') },
        { id: `${id}_table_r`, type: 'table', x: 4, y: 3, hiddenUnless: shown('rental'), examine: 'A shared table. A note: "Rent due at six. Thanks! — your tenants."' },
        { id: `${id}_counter`, type: 'counter', x: 2, y: 2, w: 5, hiddenUnless: shown('business'), examine: 'Your shop counter. It is waiting for something to sell.' },
        { id: `${id}_shelf`, type: 'shelf', x: 1, y: 1, w: 2, hiddenUnless: shown('business') },
      ],
    };
  }
  return { ...content, maps, containers, plots };
}
