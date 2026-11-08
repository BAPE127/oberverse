// The future weapons (v0.103.8): tier 3 (pulse and the first energy tools) and tier 4 (plasma, rail, ion), one pair for every troop class, from the approved weapon-loadout mock-up
// (docs/mockups/proposal-war-troop-loadouts-1.png, -2.png: its tiers 4 and 5, which are the company's tiers 3 and 4: the conventional tier 3 of the picture is not built). Pure data.
// The company buys them from Kingsfjord Ordnance once the research is done (src/war/procurement.js `catalogue`); the Arms works do not make them (see docs/WAR.md, limits).
//
//   tier     3 | 4          cls   the classes whose tier it is     price  obols at the Arms market's value (suppliers add their markup)
//   stats    what the battle reads (range, damage, interval, accuracy, suppression, pierce)           spec   the sprite painter's spec (src/engine/drawFuture.js `gunCanvas`)
const W = (id, name, tier, cls, price, stats, spec, text) => ({ id, name, tier, cls, price, stats, spec, text });
export const FUTURE_WEAPONS = Object.fromEntries([
  W('item_pulse_rifle', 'Pulse rifle', 3, ['rifleman'], 4500, { range: 16, damage: 34, interval: 0.8, acc: 0.7, suppress: 1.0, pierce: 0.2 }, { kind: 'energy', len: 18, body: '#8e96a6', glow: '#4ad8e8' }, 'No ammunition; heat limits long bursts.'),
  W('item_plasma_rifle', 'Plasma rifle', 4, ['rifleman'], 24000, { range: 17, damage: 52, interval: 0.9, acc: 0.7, suppress: 1.4, pierce: 0.45 }, { kind: 'heavy', len: 20, body: '#6a7284', glow: '#ff8a3a' }, 'Burns cover; each shot hits everything in a line.'),
  W('item_pulse_repeater', 'Pulse repeater', 3, ['machine_gunner'], 7000, { range: 15, damage: 28, interval: 0.35, acc: 0.5, suppress: 2.0, pierce: 0.15 }, { kind: 'energy', len: 22, body: '#8e96a6', glow: '#4ad8e8' }, 'Cools between bursts; never reloads.'),
  W('item_plasma_repeater', 'Heavy plasma repeater', 4, ['machine_gunner'], 36000, { range: 16, damage: 40, interval: 0.3, acc: 0.5, suppress: 3.0, pierce: 0.35 }, { kind: 'heavy', len: 24, body: '#5a6274', glow: '#ff8a3a' }, 'Shreds infantry; best in a power-armour frame.'),
  W('item_plasma_launcher', 'Plasma launcher', 3, ['anti_tank'], 9000, { range: 17, damage: 190, interval: 5.0, acc: 0.7, suppress: 9, pierce: 1, rocket: true }, { kind: 'launcher', len: 22, glow: '#ff8a3a' }, 'Melts armour; no back-blast.'),
  W('item_lance_cannon', 'Lance cannon', 4, ['anti_tank'], 45000, { range: 22, damage: 280, interval: 4.5, acc: 0.8, suppress: 10, pierce: 1, rocket: true }, { kind: 'launcher', len: 26, tubes: 2, glow: '#ff5a3a', guided: true }, 'Kills a tank in two hits at long range.'),
  W('item_rail_marksman', 'Rail marksman', 3, ['marksman'], 12000, { range: 28, damage: 120, interval: 2.4, acc: 0.9, suppress: 1.5, pierce: 0.5 }, { kind: 'energy', len: 24, body: '#8e96a6', glow: '#7fe8ff', scope: true }, 'Hits through light cover.'),
  W('item_ion_lance', 'Ion lance', 4, ['marksman'], 60000, { range: 32, damage: 170, interval: 2.6, acc: 0.92, suppress: 2, pierce: 0.8 }, { kind: 'heavy', len: 26, body: '#5a6274', glow: '#c58aff' }, 'Disables a vehicle with one shot.'),
  W('item_med_beam', 'Med-beam', 3, ['medic'], 6000, { range: 10, damage: 18, interval: 0.7, acc: 0.6, suppress: 0.4, pierce: 0 }, { kind: 'energy', len: 12, body: '#e8e6dc', glow: '#5fe08a' }, 'Heals a squad over time at range.'),
  W('item_regen_unit', 'Field regeneration unit', 4, ['medic'], 30000, { range: 11, damage: 22, interval: 0.7, acc: 0.6, suppress: 0.4, pierce: 0 }, { kind: 'energy', len: 14, body: '#e8e6dc', glow: '#5fe08a', scope: true }, 'Revives the fallen within 10 s.'),
  W('item_fusion_cutter', 'Fusion cutter', 3, ['engineer'], 8000, { range: 8, damage: 55, interval: 1.2, acc: 0.65, suppress: 0.8, pierce: 0.4 }, { kind: 'energy', len: 12, body: '#c8a02a', glow: '#ff9a2a', scope: true }, 'Opens a bunker; repairs under fire.'),
  W('item_siege_rig', 'Siege rig', 4, ['engineer'], 38000, { range: 9, damage: 80, interval: 1.3, acc: 0.65, suppress: 1.0, pierce: 0.6 }, { kind: 'heavy', len: 18, body: '#c8a02a', glow: '#ff9a2a' }, 'Builds a turret in 20 s.'),
  W('item_drone_controller', 'Drone controller', 3, ['signaller'], 5000, { range: 12, damage: 22, interval: 0.8, acc: 0.6, suppress: 0.6, pierce: 0.1 }, { kind: 'energy', len: 10, body: '#8e96a6', glow: '#7fe8ff' }, 'Flies a scout drone; reveals the map.'),
  W('item_command_uplink', 'Command uplink', 4, ['signaller'], 26000, { range: 13, damage: 28, interval: 0.8, acc: 0.6, suppress: 0.8, pierce: 0.2 }, { kind: 'energy', len: 12, body: '#8e96a6', glow: '#e8c84a', scope: true }, 'Links vision to every squad.'),
  W('item_plasma_pistol', 'Plasma pistol', 3, ['officer', 'uav'], 3200, { range: 10, damage: 32, interval: 0.8, acc: 0.65, suppress: 0.6, pierce: 0.2 }, { kind: 'energy', len: 11, body: '#8e96a6', glow: '#e8c84a' }, 'Command: squads act faster.'),
  W('item_command_blade', 'Command blade and plasma pistol', 4, ['officer'], 20000, { range: 11, damage: 48, interval: 0.8, acc: 0.65, suppress: 0.8, pierce: 0.4 }, { kind: 'energy', len: 13, body: '#6a7284', glow: '#e8c84a', scope: true }, 'Inspire: the whole battalion steadier.'),
  W('item_pulse_carbine', 'Pulse carbine and cloak', 3, ['recon'], 5500, { range: 15, damage: 30, interval: 0.7, acc: 0.7, suppress: 0.8, pierce: 0.2 }, { kind: 'energy', len: 14, body: '#4a5058', glow: '#4ad8e8', scope: true }, 'Cloak: invisible while still.'),
  W('item_stalker_rifle', 'Stalker rifle', 4, ['recon', 'uav'], 32000, { range: 24, damage: 85, interval: 2.0, acc: 0.9, suppress: 1.0, pierce: 0.5 }, { kind: 'energy', len: 22, body: '#3a3f48', glow: '#7fe8ff', scope: true }, 'Silent, cloaked, one-shot on light targets.'),
].map((w) => [w.id, w]));

/** The cell every energy weapon is nominally charged from (the open-world rules want an ammunition item; a battle never uses it). */
export const ENERGY_CELL = 'item_energy_cell';

const ITEM = (w) => ({
  name: w.name, category: 'weapon', price: w.price, tags: ['weapon', 'gun', 'energy'], icon: 'longgun',
  description: `A tier ${w.tier} energy weapon for the company's ${w.cls.join(' and ')} class${w.cls.length > 1 ? 'es' : ''}. ${w.text} The company buys it from a specialist maker once it has done the research.`,
  weapon: { look: w.spec.kind === 'launcher' ? 'rpg' : 'ar', kind: 'gun', damage: Math.max(1, Math.round(w.stats.damage / 2)), range: Math.min(30, w.stats.range), cooldown: Math.max(0.1, w.stats.interval / 4), lethal: true, ammo: ENERGY_CELL, mag: 20, reload: 2, spread: 3, noise: 10, sound: 'sfx_gunshot_smg', held: 'longgun' },
});
/** The items for the content registry (src/content/index.js): every weapon and the cell. */
export const FUTURE_ITEMS = {
  ...Object.fromEntries(Object.values(FUTURE_WEAPONS).map((w) => [w.id, ITEM(w)])),
  [ENERGY_CELL]: { name: 'Energy cell', category: 'ammo', price: 40, bundle: 1, tags: ['ammo', 'energy'], icon: 'ammo', description: 'A sealed power cell. The company\'s energy weapons draw on it in the open world; in a battle they simply fire.' },
};
/** What the battle reads for each future weapon (merged into WEAPONS in src/content/battle.js). */
export const FUTURE_STATS = Object.fromEntries(Object.values(FUTURE_WEAPONS).map((w) => [w.id, w.stats]));
/** The sprite spec by item (src/engine/drawBattle.js, drawSoldiers.js). */
export const FUTURE_LOOKS = Object.fromEntries(Object.values(FUTURE_WEAPONS).map((w) => [w.id, w.spec]));
