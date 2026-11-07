// The company's machines, parked (v0.103.6): ground vehicles in the yard below the motor pool, helicopters on the helipads then the apron, aircraft on the apron stands: drawn live from
// what the company really owns (game.war.equipment()), at the stands listed in src/content/maps/hollowmoor.js. Paint only: it reads, it never changes a record and never uses a random number,
// so a vehicle always stands in the same place. The terminal's base map and factory floors use the same sprites (src/ui/osint/sprites.js).
import { drawVeh, drawHelo, SPEC } from './drawFleet.js';
import { drawAircraft } from './drawAero.js';
import { VEHICLES } from '../content/procurement.js';
import { PARK } from '../content/maps/hollowmoor.js';

const TILE = 32;
// the sprite sheet has a spec for most models; the rest borrow the nearest one of their class
const ALIAS = { hound: 'anvil', breacher: 'bulwark', cinder: 'bulwark', buggy: 'scout', armoured_car: 'armcar', mule: 'wolf', sensor_van: 'command', howitzer: 'hammer', whirl: 'falconer',
  supply_truck: 'truck', fuel_tanker: 'truck', ammo_carrier: 'truck', command_vehicle: 'command', recovery: 'truck', ambulance: 'medevac', field_hospital: 'medevac', bridgelayer: 'truck', mine_sweeper: 'truck', repair_crane: 'truck' };
const BY_CLASS = { tank: 'anvil', carrier: 'wolf', recon: 'scout', artillery: 'hammer', antiair: 'skyguard', logistics: 'truck', medical: 'medevac', helicopter: 'viper' };

export const specId = (type) => (SPEC[type] ? type : ALIAS[type] && SPEC[ALIAS[type]] ? ALIAS[type] : BY_CLASS[VEHICLES[type]?.class] || 'truck');
export const isHeli = (type) => VEHICLES[type]?.class === 'helicopter';

/** Paint one vehicle or helicopter with its centre at (x, y). heading 0 = nose up. */
export function paintMachine(ctx, type, x, y, { heading = 0, scale = 1, state = 'ok', phase = 0.6, altitude = 0 } = {}) {
  const spec = SPEC[specId(type)];
  if (isHeli(type)) drawHelo(ctx, spec, x, y, heading, { altitude, scale, phase });
  else drawVeh(ctx, spec, x, y, heading, { scale, state });
}

const PARKED = new Set(['stored', 'assigned']);

/**
 * What stands where: [{ x, y (tiles, the machine's centre), draw(ctx) }], for the company's machines that are at the base. Ground vehicles take the yard stands in order of their ids; helicopters the
 * pads and then the free apron stands; aircraft the apron stands. A machine with no stand left is simply not drawn (the lot has room for what the motor pool and the hangars can hold).
 */
export function parkedMachines(game) {
  const eq = (game.war?.equipment?.() || []).filter((e) => PARKED.has(e.status)).slice().sort((a, b) => (a.id < b.id ? -1 : 1));
  const out = [];
  let yard = 0; let pad = 0; let apron = 0;
  for (const e of eq) {
    if (e.kind === 'vehicle') {
      const s = PARK.ground[yard++]; if (!s) continue;
      out.push({ id: e.id, x: s[0], y: s[1], draw: (ctx) => paintMachine(ctx, e.type, s[0] * TILE, s[1] * TILE, { heading: Math.PI / 2, scale: 1 }) });
    } else if (e.kind === 'helicopter') {
      const s = pad < PARK.helipads.length ? PARK.helipads[pad++] : PARK.apron[apron++]; if (!s) continue;
      out.push({ id: e.id, x: s[0], y: s[1], draw: (ctx) => paintMachine(ctx, e.type, s[0] * TILE, s[1] * TILE, { heading: 0, scale: 0.8, phase: 0.6 }) });
    } else if (e.kind === 'aircraft') {
      const s = PARK.apron[apron++]; const look = game.aero?.cfg?.products?.[e.type]?.look; if (!s || !look) continue;
      const k = Math.min(1, 11 / Math.max(look.len, look.span));
      out.push({ id: e.id, x: s[0], y: s[1], draw: (ctx) => drawAircraft(ctx, look, s[0] * TILE, s[1] * TILE, 0, { scale: k }) });
    }
  }
  return out;
}
