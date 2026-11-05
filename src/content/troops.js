// The company's people (v0.100.0 stage 7): pure data. Ten troop classes (as in docs/PROPOSAL_WAR_ARMOURY.md), the two working roles of v0.99.0 (guard, technician), what a class
// carries at each weapon tier, the two armour eras the company can field, and the looks. Tiers 1 and 2 are items the Arms works already makes; tiers 3 to 5 (a new Arms recipe, then
// energy weapons) and armour eras 3 and 4 are future research and are NOT here.
//
//   CLASSES    name, wage a day, days of training (a place at the range or training ground for each), the weapon each tier carries, the gadget, what the class does
//   ARMOUR     era 1 (field uniform: issued from the stores) and era 2 (plate carrier: bought, stops rifle rounds)
//   LOOKS      colours, patterns, insignia, crests and squad bands: free and cosmetic
//   SQUAD      the limits of a squad
export const CLASSES = {
  guard: { name: 'Guard', group: 'work', wage: 120, train: 0, tiers: { 1: 'item_pistol' }, text: 'Stands a post and watches a door.' },
  technician: { name: 'Technician', group: 'work', wage: 160, train: 0, tiers: {}, text: 'Works a line at the tank factory or the helicopter works.' },
  rifleman: { name: 'Rifleman', group: 'troop', wage: 150, train: 5, tiers: { 1: 'item_smg', 2: 'item_assault_rifle' }, text: 'The line: carries the fight.' },
  machine_gunner: { name: 'Machine gunner', group: 'troop', wage: 170, train: 6, tiers: { 1: 'item_lmg' }, text: 'Suppresses what the gun points at.' },
  anti_tank: { name: 'Anti-tank', group: 'troop', wage: 170, train: 6, tiers: { 1: 'item_rpg' }, ammo: { 1: 'item_rpg_rocket' }, text: 'Armour killers: one rocket, then reload.' },
  marksman: { name: 'Marksman', group: 'troop', wage: 180, train: 8, tiers: { 1: 'item_sniper_rifle' }, text: 'Precision at a distance.' },
  medic: { name: 'Medic', group: 'troop', wage: 170, train: 8, tiers: { 1: 'item_pistol', 2: 'item_smg' }, gadget: 'supply:medicine', text: 'Keeps the wounded alive until the clinic.' },
  engineer: { name: 'Combat engineer', group: 'troop', wage: 170, train: 7, tiers: { 1: 'item_shotgun', 2: 'item_smg' }, text: 'Builds, breaks and clears.' },
  signaller: { name: 'Signaller', group: 'troop', wage: 160, train: 6, tiers: { 1: 'item_pistol', 2: 'item_smg' }, gadget: 'supply:radio', text: 'Sees and calls: what the squad knows, the command knows.' },
  officer: { name: 'Officer', group: 'troop', wage: 260, train: 10, tiers: { 1: 'item_pistol', 2: 'item_smg' }, leads: true, text: 'Leads a squad. A squad has one.' },
  recon: { name: 'Recon', group: 'troop', wage: 170, train: 8, tiers: { 1: 'item_smg', 2: 'item_assault_rifle' }, text: 'Eyes ahead.' },
  uav: { name: 'UAV operator', group: 'troop', wage: 190, train: 8, tiers: { 1: 'item_pistol' }, gadget: 'item_drone_attack', text: 'Flies a drone and calls what it sees.' },
};

export const TROOP_CLASSES = Object.keys(CLASSES).filter((id) => CLASSES[id].group === 'troop');

/** What a soldier wears. Era 1 is the issue uniform (a uniform from the stores, once); era 2 adds a plate carrier (bought, one each). `protection` is what the resolver multiplies a soldier's survival by. */
export const ARMOUR = {
  1: { name: 'Field uniform', protection: 1, supply: 'supply:uniform', text: 'Cloth, a helmet and a vest. Cheap, quick to train.' },
  2: { name: 'Plate carrier', protection: 1.35, supply: 'supply:plate_carrier', text: 'Plates, night-vision helmet, knee pads. Stops rifle rounds; heavier.' },
};

export const SQUAD = { max: 12, names: ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel', 'India', 'Juliet', 'Kilo', 'Lima'] };

/** Cosmetic only: a squad's colours, pattern, insignia, crest and band. Nothing here changes a number. */
export const LOOKS = {
  primary: { field_green: '#4a5a3a', desert: '#a8946a', urban_grey: '#6a6e74', navy: '#2a3550', crimson: '#6a2a2e', black: '#2a2a2e' },
  pattern: ['plain', 'stripes', 'camo', 'chevron', 'checks'],
  insignia: ['none', 'star', 'bar', 'wing', 'dots'],
  crest: ['none', 'crest', 'antenna', 'fin'],
  band: { orange: '#e08a3a', gold: '#e8c84a', green: '#5ad18a', cyan: '#4ad8e8', violet: '#b57af0' },
};
export const DEFAULT_LOOK = { primary: 'field_green', pattern: 'plain', insignia: 'none', crest: 'none', band: 'gold' };
