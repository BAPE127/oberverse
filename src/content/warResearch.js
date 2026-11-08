// The company's research (v0.103.8): pure data. The mercenary company researches the future the way Aerospace researches aircraft: a project costs money (from whoever's money the company spends)
// and days, one at a time, and needs the Command HQ built. Nodes unlock **tiers**: weapon tier 3 (pulse) and 4 (plasma, rail, ion), armour era 3 (Phalanx hardsuit) and 4 (Bastion power armour),
// and the future vehicles (era 3: hover, stealth and laser; era 4: the heavy designs). Tiers 1 and 2 are what the company starts with. The figures are starting figures to calibrate: about 63M
// obols and 90 days of research to reach tier 4, against about 20M obols in 5 days for a fully built base (docs/WAR.md).
//
//   tier      what the node belongs to (3 = the first future, 4 = the second)
//   cost      obols      days   how long the project runs
//   requires  nodes that must be finished first
//   unlocks   what finishing it opens (read by the rules; the text is for the screen)
export const WAR_RESEARCH = {
  energy_cells: { tier: 3, name: 'Energy cells', cost: 2_000_000, days: 4, requires: [], unlocks: {}, text: 'Compact, safe power storage. The foundation of everything that follows: no ammunition, no engines that burn.' },
  pulse_weapons: { tier: 3, name: 'Pulse weapons', cost: 5_000_000, days: 8, requires: ['energy_cells'], unlocks: { weaponTier: 3 }, text: 'Pulse rifles, repeaters, med-beams and cutters for every class: weapon tier 3. No ammunition; heat limits long bursts.' },
  hardsuit: { tier: 3, name: 'Phalanx hardsuit', cost: 5_000_000, days: 8, requires: ['energy_cells'], unlocks: { armourEra: 3 }, text: 'A sealed shell with a sensor visor that shrugs off small arms: armour era 3.' },
  hover_drives: { tier: 3, name: 'Hover drives', cost: 5_000_000, days: 8, requires: ['energy_cells'], unlocks: { vehicleEra: 3 }, text: 'Hover, stealth and laser vehicles: the Aegis hover tank, the Shade helicopter, the Ghost stealth carrier, drone carriers, skimmers and laser anti-air.' },
  fusion_cores: { tier: 4, name: 'Fusion cores', cost: 10_000_000, days: 12, requires: ['pulse_weapons', 'hardsuit'], unlocks: {}, text: 'A reactor small enough to carry: the foundation of tier 4.' },
  plasma_weapons: { tier: 4, name: 'Plasma, rail and ion weapons', cost: 12_000_000, days: 14, requires: ['fusion_cores'], unlocks: { weaponTier: 4 }, text: 'Plasma rifles and repeaters, lance cannons, ion lances, regeneration units: weapon tier 4. Costly to buy.' },
  power_armour: { tier: 4, name: 'Bastion power armour', cost: 12_000_000, days: 14, requires: ['fusion_cores'], unlocks: { armourEra: 4 }, text: 'Powered plate with a reactor pack and two-handed heavy weapons: armour era 4. Slow, huge, costly.' },
  heavy_hover: { tier: 4, name: 'Heavy hover platforms', cost: 12_000_000, days: 14, requires: ['hover_drives', 'fusion_cores'], unlocks: { vehicleEra: 4 }, text: 'Heavier fusion-powered vehicles: the Citadel hover tank, the Tempest gunship and the Warden shield carrier.' },
};

/** The node that opens a weapon tier, an armour era or a vehicle era (tier 2 and below need none). */
export const GATE = {
  weaponTier: { 3: 'pulse_weapons', 4: 'plasma_weapons' },
  armourEra: { 3: 'hardsuit', 4: 'power_armour' },
  vehicleEra: { 3: 'hover_drives', 4: 'heavy_hover' },
};

/** The research that needs the Command HQ: the building that must stand (and not be a ruin) before any project can start. */
export const RESEARCH_FACILITY = 'command';
