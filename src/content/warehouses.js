// Warehouses for sale at the Halvermouth docks, and the calculator production
// chain (v0.12.0). See src/systems/factory.js and docs/FACTORY.md.
//
//   board + battery ──(solderer 4 min)──▶ core ─┐
//   casing + keypad + screen ──(press 4 min)──▶ shell ─┴─(assembler 6 min)──▶ blank ──(tuner 3 min)──▶ calculator
//
// By hand at a warehouse workbench the same steps take 10 / 10 / 15 / 8 minutes.

export const WAREHOUSES = {
  wh7: { name: 'Warehouse 7', map: 'wh7', price: 300, flag: 'owns_wh7', inBay: 'ct_wh7_in', outCrate: 'ct_wh7_out', basePower: 2, sign: 'hv_wh7_sale' },
  wh9: { name: 'Pier 9 Shed', map: 'wh9', price: 750, flag: 'owns_wh9', inBay: 'ct_wh9_in', outCrate: 'ct_wh9_out', basePower: 2, sign: 'hv_wh9_sale' },
  wh12: { name: 'The Old Cannery', map: 'wh12', price: 1500, flag: 'owns_wh12', inBay: 'ct_wh12_in', outCrate: 'ct_wh12_out', basePower: 3, sign: 'hv_wh12_sale' },
};

export const RECIPES = {
  solderer: { name: 'Soldering station', in: { item_part_board: 1, item_part_battery: 1 }, out: 'item_calc_core', minutes: 4, handMinutes: 10, verb: 'Solder a core' },
  press: { name: 'Case press', in: { item_part_casing: 1, item_part_keypad: 1, item_part_screen: 1 }, out: 'item_calc_shell', minutes: 4, handMinutes: 10, verb: 'Press a shell' },
  assembler: { name: 'Assembler', in: { item_calc_core: 1, item_calc_shell: 1 }, out: 'item_calc_blank', minutes: 6, handMinutes: 15, verb: 'Assemble a blank calculator' },
  tuner: { name: 'Tuning bench', in: { item_calc_blank: 1 }, out: null, minutes: 3, handMinutes: 8, verb: 'Tune a blank' },
};

/** Sal's delivery contracts: what lands in your input bay at 07:00 each day. */
export const DELIVERIES = {
  small: { name: 'Small crate', price: 50, items: { item_part_casing: 5, item_part_keypad: 5, item_part_screen: 5, item_part_board: 5, item_part_battery: 5 } },
  large: { name: 'Large crate', price: 140, items: { item_part_casing: 15, item_part_keypad: 15, item_part_screen: 15, item_part_board: 15, item_part_battery: 15 } },
};

/** Calculators you must have made before Sal sells machines / signs delivery contracts. */
export const UNLOCKS = { machines: 5, deliveries: 10 };
