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
  item_calc_charm: {
    name: 'Rose-Gold Sum', category: 'calculator', price: 20, tags: ['calculator', 'contraband'], icon: 'calc', calc: 'charm',
    description: 'A pink four-function calculator with rhinestone keys. Press 5318008, turn it upside down, and the whole world finds you delightful. (+Charm for a few hours.)',
    use: { calc: 'charm', text: 'You tap out a sum and feel your smile get more expensive.' },
  },
  item_calc_wits: {
    name: 'Big Brain 9000', category: 'calculator', price: 20, tags: ['calculator', 'contraband'], icon: 'calc', calc: 'wits',
    description: 'A chunky grey calculator with a cracked solar strip. One long division and everything clicks. (+Wits for a few hours.)',
    use: { calc: 'wits', text: 'You divide by seven. The universe divides with you.' },
  },
  item_calc_grit: {
    name: 'The Brick', category: 'calculator', price: 20, tags: ['calculator', 'contraband'], icon: 'calc', calc: 'grit',
    description: 'A heavy black calculator in a rubber case. You could stop a bullet with it. You might. (+Grit for a few hours.)',
    use: { calc: 'grit', text: 'You multiply. Your jaw sets like concrete.' },
  },
  item_calc_finesse: {
    name: 'Featherkey', category: 'calculator', price: 20, tags: ['calculator', 'contraband'], icon: 'calc', calc: 'finesse',
    description: 'A wafer-thin silver calculator with keys that barely click. Your fingers feel lighter just holding it. (+Finesse for a few hours.)',
    use: { calc: 'finesse', text: 'Tap-tap-tap. Your fingers go quiet and quick.' },
  },
  item_calc_health: {
    name: 'Plus Pack', category: 'calculator', price: 16, tags: ['calculator', 'contraband'], icon: 'calc', calc: 'health',
    description: 'A first-aid green calculator with only one big key: +. Patches you up. (Heals.)',
    use: { calc: 'health', text: 'Plus, plus, plus. The aches add up to less.' },
  },
  item_calc_energy: {
    name: 'Overclock', category: 'calculator', price: 14, tags: ['calculator', 'contraband'], icon: 'calc', calc: 'energy',
    description: 'A buzzing yellow calculator with a battery taped to the back. A rush now, a crash later. (+Energy.)',
    use: { calc: 'energy', text: 'You hammer the = key and your heart does it too.' },
  },
  // --- calculator production (v0.12.0): parts from Sal's Surplus, intermediates, and placeable machinery
  item_part_casing: { name: 'Plastic Casing', category: 'part', price: 2, tags: ['part'], icon: 'casing', description: 'An empty calculator shell, front and back. Sal buys them by the thousand from a factory that doesn\'t exist any more.' },
  item_part_keypad: { name: 'Button Pad', category: 'part', price: 2, tags: ['part'], icon: 'keypad', description: 'A rubber sheet of sixteen keys: 0–9, + − × ÷, = and a decimal point.' },
  item_part_screen: { name: 'LCD Screen', category: 'part', price: 3, tags: ['part'], icon: 'screen', description: 'An eight-digit liquid-crystal display. It reads 8.8.8.8.8.8.8.8 when it\'s happy.' },
  item_part_board: { name: 'Circuit Board', category: 'part', price: 3, tags: ['part'], icon: 'chip', description: 'A tiny green circuit board with one black blob of a chip in the middle. The brains.' },
  item_part_battery: { name: 'Button Battery', category: 'part', price: 1, tags: ['part'], icon: 'battery', description: 'A coin-sized battery. Do not eat. (People in the Sumps have asked.)' },
  item_calc_core: { name: 'Calculator Core', category: 'part', price: 0, tags: ['part', 'intermediate'], icon: 'chip', description: 'A circuit board with its battery soldered on. Step 1 of 3.' },
  item_calc_shell: { name: 'Calculator Shell', category: 'part', price: 0, tags: ['part', 'intermediate'], icon: 'casing', description: 'A casing with its keypad and screen pressed in. Step 2 of 3.' },
  item_calc_blank: { name: 'Blank Calculator', category: 'part', price: 0, tags: ['part', 'intermediate'], icon: 'calc', description: 'A working four-function calculator with no "tuning" — it just does sums. Tune it at a workbench or tuning bench to make it a Charm, Wits, Grit, Finesse, Health or Energy calculator.' },
  item_machine_solderer: { name: 'Soldering Station', category: 'machine', price: 120, tags: ['machine'], icon: 'machine', build: { type: 'machine', kind: 'solderer', w: 2, h: 2 }, description: 'Place in your warehouse (B to build). Board + battery → core, every 4 minutes. Needs power.' },
  item_machine_press: { name: 'Case Press', category: 'machine', price: 150, tags: ['machine'], icon: 'machine', build: { type: 'machine', kind: 'press', w: 2, h: 2 }, description: 'Place in your warehouse. Casing + keypad + screen → shell, every 4 minutes. Needs power.' },
  item_machine_assembler: { name: 'Assembler', category: 'machine', price: 220, tags: ['machine'], icon: 'machine', build: { type: 'machine', kind: 'assembler', w: 2, h: 2 }, description: 'Place in your warehouse. Core + shell → blank calculator, every 6 minutes. Needs power.' },
  item_machine_tuner: { name: 'Tuning Bench', category: 'machine', price: 180, tags: ['machine'], icon: 'machine', build: { type: 'machine', kind: 'tuner', w: 2, h: 2 }, description: 'Place in your warehouse, then set what it makes (E). Blank → a finished calculator, every 3 minutes. Needs power.' },
  item_belt: { name: 'Conveyor Belt', category: 'machine', price: 3, tags: ['machine'], icon: 'belt', build: { type: 'belt', w: 1, h: 1 }, description: 'Place in your warehouse; R rotates. Carries one item a minute to the next belt — and straight into a machine or crate at its end.' },
  item_inserter: { name: 'Inserter Arm', category: 'machine', price: 15, tags: ['machine'], icon: 'arm', build: { type: 'inserter', w: 1, h: 1 }, description: 'Place in your warehouse; R rotates. Grabs one item a minute from behind it (crate, belt, machine output) and drops it in front, if what\'s in front wants it.' },
  item_generator: { name: 'Generator', category: 'machine', price: 250, tags: ['machine'], icon: 'machine', build: { type: 'generator', w: 2, h: 2 }, description: 'Place in your warehouse. Powers four more machines. (Every warehouse\'s wall socket powers the first two.)' },
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
    name: '9mm Pistol', category: 'weapon', price: 120, tags: ['weapon', 'gun'], icon: 'gun', arms: { value: 140, family: 'small' },
    description: 'A semi-automatic pistol with a twelve-round magazine. Takes 9mm rounds.',
    weapon: { kind: 'gun', damage: 26, range: 11, cooldown: 0.3, lethal: true, ammo: 'item_ammo_9mm', mag: 12, reload: 1.4, spread: 4, noise: 18, sound: 'sfx_gunshot', held: 'pistol' },
  },
  item_shotgun: {
    name: 'Pump Shotgun', category: 'weapon', price: 180, tags: ['weapon', 'gun'], icon: 'longgun', arms: { value: 220, family: 'small' },
    description: 'Seven pellets in a wide cone. Devastating up close, useless at range. Takes shotgun shells.',
    weapon: { kind: 'gun', damage: 15, pellets: 7, range: 6, cooldown: 0.95, lethal: true, ammo: 'item_ammo_shells', mag: 5, reload: 2.6, spread: 14, noise: 22, sound: 'sfx_gunshot_heavy', held: 'longgun' },
  },
  item_rifle: {
    name: 'Hunting Rifle', category: 'weapon', price: 220, tags: ['weapon', 'gun'], icon: 'longgun',
    description: 'Bolt-action, scoped, accurate across a city block. Takes rifle rounds.',
    weapon: { kind: 'gun', damage: 75, range: 18, cooldown: 1.3, lethal: true, ammo: 'item_ammo_rifle', mag: 5, reload: 2.8, spread: 0.6, noise: 26, sound: 'sfx_gunshot_heavy', held: 'longgun' },
  },
  item_smg: {
    name: 'Submachine Gun', category: 'weapon', price: 320, tags: ['weapon', 'gun'], icon: 'longgun', arms: { value: 260, family: 'small' },
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
  // Lariat (v0.29.0)
  item_lasso: {
    name: 'Lasso', category: 'tool', price: 45, tags: ['tool', 'rope'], icon: 'lasso',
    description: 'Thirty feet of braided rope with a honda knot, from Lariat Mercantile. For roping cattle — politely.',
  },
  item_jerky: {
    name: 'Beef Jerky', category: 'food', price: 6, tags: ['food', 'gift'], icon: 'jerky',
    description: 'Opal\'s own peppered jerky. Chewy enough to last the drive to Halvermouth.',
    use: { energy: 18, text: 'You chew the jerky. And chew. And chew. (+18 energy)' },
  },
  item_sweet_tea: {
    name: 'Sweet Tea', category: 'food', price: 3, tags: ['food', 'drink', 'gift', 'sweet'], icon: 'tea',
    description: 'A tall cup of iced tea with enough sugar to stand a spoon in.',
    use: { energy: 16, text: 'You drink the sweet tea. Your teeth hum. (+16 energy)' },
  },
  item_pecan_pie: {
    name: 'Pecan Pie Slice', category: 'food', price: 7, tags: ['food', 'sweet', 'gift'], icon: 'pie',
    description: 'A thick slice of Lupe\'s pecan pie. The reason the Mesquite Diner has a parking lot.',
    use: { energy: 28, text: 'You eat the pecan pie. For a moment, all is right in the world. (+28 energy)' },
  },
  item_chicken_fried_steak: {
    name: 'Chicken-Fried Steak', category: 'food', price: 12, tags: ['food'], icon: 'steak',
    description: 'A steak, battered and fried like chicken, under a blanket of cream gravy. The Mesquite Diner special.',
    use: { energy: 45, text: 'You eat the chicken-fried steak. You may need a nap. (+45 energy)' },
  },
  item_cheese_wheel: {
    name: 'Chuckie\'s Aged Cheddar', category: 'gift', price: 60, tags: ['food', 'gift', 'cheese'], icon: 'cheese',
    description: 'A whole twelve-month wheel of Chuckie\'s Cheese sharp cheddar, wax-sealed and stamped CHZ.',
    use: { energy: 60, text: 'You eat a frankly irresponsible amount of cheddar. (+60 energy)' },
  },
  item_cowboy_hat: {
    name: 'Cowboy Hat', category: 'gift', price: 30, tags: ['gift', 'clothing'], icon: 'hat',
    description: 'A straw cattleman with a sweat-stained band. Keeps the Texas sun off.',
  },
};
