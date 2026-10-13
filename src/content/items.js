// Item registry. IDs are permanent — never rename an id that may be in a save.
// category: food | tool | key | quest | gift | junk | medical
export const ITEMS = {
  item_honey_bun: {
    name: 'Honey Bun', category: 'food', price: 4, tags: ['food', 'sweet', 'gift'], icon: 'bun',
    description: 'A sticky, glazed Kettle & Crumb honey bun. Lanternside currency in all but name.',
    use: { energy: 15, text: 'You eat the honey bun. Sticky fingers, happy heart. (+15 energy)' },
  },
  item_scone: {
    name: 'Cheese Scone', category: 'food', price: 3, tags: ['food', 'gift'], icon: 'scone',
    description: 'Dense, savoury, and still faintly warm.',
    use: { energy: 12, text: 'You eat the scone. Crumbs everywhere. (+12 energy)' },
  },
  item_coffee: {
    name: 'Coffee', category: 'food', price: 3, tags: ['food', 'drink', 'gift'], icon: 'cup',
    description: 'Strong canal-side coffee in a paper cup.',
    use: { energy: 20, text: 'You drink the coffee. Your thoughts sharpen to a point. (+20 energy)' },
  },
  item_coffee_order: {
    name: 'Coffee Order (for Osric)', category: 'quest', price: 0, tags: ['delivery', 'drink'], icon: 'cup',
    description: 'A lidded coffee labelled "O. VANE — BLACK, NO NONSENSE". It is for Osric at the Civic Office.',
    use: { energy: 20, text: 'You drink Osric\'s coffee. It tastes faintly of guilt. (+20 energy)' },
  },
  item_wildflowers: {
    name: 'Wildflowers', category: 'gift', price: 0, tags: ['gift', 'flowers'], icon: 'flower',
    description: 'A handful of sea-pinks and clover from Gullwing Park.',
  },
  item_bandage: {
    name: 'Bandage', category: 'medical', price: 5, tags: ['medical'], icon: 'bandage',
    description: 'A clean roll of bandage.',
    use: { health: 25, text: 'You patch yourself up. (+25 health)' },
  },
  item_crowbar: {
    name: 'Crowbar', category: 'tool', price: 18, tags: ['tool', 'pry', 'weapon'], icon: 'crowbar',
    description: 'Heavy, honest, and very good at opening things that would rather stay shut. Or heads.',
    weapon: { kind: 'melee', damage: 24, range: 1.3, arc: 95, cooldown: 0.85, lethal: true, knockback: 24, sound: 'sfx_whack', held: 'club' },
  },
  item_lucky_spanner: {
    name: 'Lucky Spanner', category: 'quest', price: 0, tags: ['quest', 'tool'], icon: 'spanner',
    description: 'A battered spanner with "T.H." scratched into the handle. Tibbs swears it has never failed him.',
  },
  item_lighthouse_key: {
    name: 'Lighthouse Key', category: 'key', price: 0, tags: ['key'], icon: 'key',
    description: 'A heavy iron key on a tag stamped "LIGHTHOUSE — CIVIC PROPERTY".',
  },
  item_flat_key: {
    name: 'Flat Key', category: 'key', price: 0, tags: ['key'], icon: 'key',
    description: 'The key to Number 9, Gullwing Row. Home, for now.',
  },
  item_brass_cog: {
    name: 'Brass Cog', category: 'junk', price: 3, tags: ['junk', 'mechanical'], icon: 'cog',
    description: 'A small brass cog. Tibbs would probably pay for it.',
  },
  item_bolts: {
    name: 'Bag of Bolts', category: 'junk', price: 2, tags: ['junk', 'mechanical'], icon: 'bolts',
    description: 'Assorted bolts. None of them match.',
  },
  item_rubber_stamp: {
    name: 'APPROVED Stamp', category: 'junk', price: 1, tags: ['junk'], icon: 'stamp',
    description: 'Osric\'s spare rubber stamp. It says APPROVED. It has never been used.',
  },
  item_lens_shard: {
    name: 'Lens Shard', category: 'quest', price: 0, tags: ['quest', 'mystery'], icon: 'shard',
    description: 'A curved sliver of thick glass that throws tiny rainbows. It hums very faintly when held to the light.',
  },
  item_cigar: {
    name: 'Ober Imperial Cigar', category: 'gift', price: 12, tags: ['gift', 'luxury'], icon: 'cigar',
    description: 'A fat cigar banded in gold leaf: "Ober Imperial — For Gentlemen of Means". It costs more than a day\'s wages.',
  },
  item_jail_keys: {
    name: 'Jail Keys', category: 'key', price: 0, tags: ['key', 'police'], icon: 'key',
    description: 'A ring of heavy brass keys lifted off Officer Jury\'s belt. They open every cell door and the stairs up to the precinct.',
  },
  item_spoon: {
    name: 'Tin Spoon', category: 'tool', price: 0, tags: ['tool', 'contraband'], icon: 'spoon',
    description: 'A bent tin spoon off your breakfast tray. Not much of a shovel. Not much of a spoon, either.',
  },
  item_bent_fork: {
    name: 'Bent Fork', category: 'tool', price: 0, tags: ['tool', 'contraband'], icon: 'spoon',
    description: 'Petty Larson\'s fork, its tines bent into the exact shape of a vent-cover screw head.',
  },
  item_vault_key: {
    name: 'Vault Key', category: 'key', price: 0, tags: ['key'], icon: 'key',
    description: 'A heavy, ornate key with a dollar-sign bow. It opens the vault in Sir Moneybucks\'s study.',
  },
  item_great_lens: {
    name: 'The Great Lens', category: 'quest', price: 0, tags: ['quest', 'mystery'], icon: 'shard',
    description: 'The lighthouse\'s great lens: a beehive of ringed glass the size of a barrel, humming softly. It is very heavy and very obviously stolen.',
  },
  item_ledger_page: {
    name: 'Ledger Page', category: 'quest', price: 0, tags: ['quest', 'evidence'], icon: 'stamp',
    description: 'A page copied from the Ober\'s Oil books in Agnes Thornbury\'s neat hand: "Lot 14 — Harbourmaster\'s seal & effects. Purchased. 12 yrs ago."',
  },
  item_company_scrip: {
    name: 'Company Scrip', category: 'junk', price: 0, tags: ['junk'], icon: 'stamp',
    description: 'Paper "money" redeemable only at the Ober\'s Oil company store. Tibbs says it makes good kindling.',
  },
  // ------------------------------------------------------------ weapons
  // weapon: { kind: 'melee'|'gun', damage, range (tiles), cooldown (s), lethal,
  //   melee: arc (degrees), knockback · guns: ammo, mag, reload (s), spread (deg),
  //   pellets?, auto?, noise (tiles) · held: how it is drawn in the hand }
  item_knuckles: {
    name: 'Brass Knuckles', category: 'weapon', price: 25, tags: ['weapon', 'melee'], icon: 'knuckles',
    description: 'Four brass rings and a bad attitude. Hits harder than a bare fist, and puts people down without killing them.',
    weapon: { kind: 'melee', damage: 14, range: 1.0, arc: 80, cooldown: 0.45, lethal: false, knockback: 16, sound: 'sfx_punch', held: 'knuckles' },
  },
  item_baton: {
    name: 'Police Baton', category: 'weapon', price: 35, tags: ['weapon', 'melee'], icon: 'baton',
    description: 'A black hardwood nightstick, Halvermouth Police issue. Designed to subdue, not to kill.',
    weapon: { kind: 'melee', damage: 18, range: 1.25, arc: 90, cooldown: 0.6, lethal: false, knockback: 20, sound: 'sfx_whack', held: 'club' },
  },
  item_bat: {
    name: 'Baseball Bat', category: 'weapon', price: 30, tags: ['weapon', 'melee'], icon: 'bat',
    description: 'Ash wood, taped grip, a dent that tells a story. Nobody in the Sumps plays baseball.',
    weapon: { kind: 'melee', damage: 22, range: 1.35, arc: 100, cooldown: 0.8, lethal: true, knockback: 26, sound: 'sfx_whack', held: 'club' },
  },
  item_machete: {
    name: 'Machete', category: 'weapon', price: 45, tags: ['weapon', 'melee'], icon: 'blade',
    description: 'A long, broad blade for clearing brush. Or anything else.',
    weapon: { kind: 'melee', damage: 30, range: 1.3, arc: 110, cooldown: 0.7, lethal: true, knockback: 12, sound: 'sfx_slash', held: 'blade' },
  },
  item_fire_axe: {
    name: 'Fire Axe', category: 'weapon', price: 55, tags: ['weapon', 'melee'], icon: 'axe',
    description: 'Red head, long haft, "IN CASE OF EMERGENCY". Slow, heavy and devastating.',
    weapon: { kind: 'melee', damage: 42, range: 1.45, arc: 120, cooldown: 1.2, lethal: true, knockback: 30, sound: 'sfx_slash', held: 'axe' },
  },
  item_revolver: {
    name: '.38 Revolver', category: 'weapon', price: 90, tags: ['weapon', 'gun'], icon: 'gun',
    description: 'A six-shot revolver: simple, reliable and loud. Takes .38 rounds.',
    weapon: { kind: 'gun', damage: 34, range: 10, cooldown: 0.55, lethal: true, ammo: 'item_ammo_38', mag: 6, reload: 2.0, spread: 3, noise: 18, sound: 'sfx_gunshot', held: 'pistol' },
  },
  item_pistol: {
    name: '9mm Pistol', category: 'weapon', price: 120, tags: ['weapon', 'gun'], icon: 'gun',
    description: 'A semi-automatic pistol with a twelve-round magazine. Takes 9mm rounds.',
    weapon: { kind: 'gun', damage: 26, range: 11, cooldown: 0.3, lethal: true, ammo: 'item_ammo_9mm', mag: 12, reload: 1.4, spread: 4, noise: 18, sound: 'sfx_gunshot', held: 'pistol' },
  },
  item_shotgun: {
    name: 'Pump Shotgun', category: 'weapon', price: 180, tags: ['weapon', 'gun'], icon: 'longgun',
    description: 'Seven pellets in a wide cone. Devastating up close, useless at range. Takes shotgun shells.',
    weapon: { kind: 'gun', damage: 15, pellets: 7, range: 6, cooldown: 0.95, lethal: true, ammo: 'item_ammo_shells', mag: 5, reload: 2.6, spread: 14, noise: 22, sound: 'sfx_gunshot_heavy', held: 'longgun' },
  },
  item_rifle: {
    name: 'Hunting Rifle', category: 'weapon', price: 220, tags: ['weapon', 'gun'], icon: 'longgun',
    description: 'Bolt-action, scoped, accurate across a city block. Takes rifle rounds.',
    weapon: { kind: 'gun', damage: 75, range: 18, cooldown: 1.3, lethal: true, ammo: 'item_ammo_rifle', mag: 5, reload: 2.8, spread: 0.6, noise: 26, sound: 'sfx_gunshot_heavy', held: 'longgun' },
  },
  item_smg: {
    name: 'Submachine Gun', category: 'weapon', price: 320, tags: ['weapon', 'gun'], icon: 'longgun',
    description: 'Fully automatic: hold the trigger and it keeps going until it doesn\'t. Takes 9mm rounds.',
    weapon: { kind: 'gun', damage: 15, range: 9, cooldown: 0.09, auto: true, lethal: true, ammo: 'item_ammo_9mm', mag: 30, reload: 1.9, spread: 7, noise: 20, sound: 'sfx_gunshot_smg', held: 'longgun' },
  },
  item_ammo_38: {
    name: '.38 Rounds', category: 'ammo', price: 8, bundle: 12, tags: ['ammo'], icon: 'ammo',
    description: 'Revolver cartridges. Sold by the box of 12.',
  },
  item_ammo_9mm: {
    name: '9mm Rounds', category: 'ammo', price: 10, bundle: 20, tags: ['ammo'], icon: 'ammo',
    description: 'Pistol and submachine-gun cartridges. Sold by the box of 20.',
  },
  item_ammo_shells: {
    name: 'Shotgun Shells', category: 'ammo', price: 9, bundle: 8, tags: ['ammo'], icon: 'ammo',
    description: 'Red cardboard shells of buckshot. Sold by the box of 8.',
  },
  item_ammo_rifle: {
    name: 'Rifle Rounds', category: 'ammo', price: 12, bundle: 10, tags: ['ammo'], icon: 'ammo',
    description: 'Long brass rifle cartridges. Sold by the box of 10.',
  },
  item_gull_feather: {
    name: 'Gull Feather', category: 'junk', price: 0, tags: ['junk', 'gift'], icon: 'feather',
    description: 'A long grey gull feather. A trophy, or a warning.',
  },
};
