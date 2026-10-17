// Special weapons (v0.45.0). Owner: "add special unique weapons (as absurd and wild as you want)
// in some of the homes to be stolen … add a special weapon for each imported character."
// Each is one of a kind, sold nowhere, and kept in somebody's home — taking it is burglary.
// The imported characters' are their signatures, like their cars.
//
// Extra weapon fields (src/systems/combat.js): look (its sprite), bullet (what flies: confetti,
// pigeon, fish, coin, nail, chalk, ray, harpoon, cheese), effect ('stun' for `stun` seconds,
// 'flee' sends them running, 'coins' pays you per hit, 'confetti'), fan (fixed spread angles,
// degrees), pierce (passes through everyone in a line), knockback < 0 pulls them to you.
const ammo = (id, name, bundle, description) => [id, { name, category: 'ammo', price: 0, bundle, tags: ['ammo'], icon: 'ammo', description }];
const weapon = (id, name, description, w, value = 0) => [id, { name, category: 'weapon', price: value, tags: ['weapon', w.kind === 'gun' ? 'gun' : 'melee', 'unique'], icon: w.look, unique: true, description, weapon: w }];

export const SPECIAL_ITEMS = Object.fromEntries([
  // ---- in the residents' homes
  weapon('item_rolling_pin', 'Grandma Pell\'s Rolling Pin', 'Three generations of Pells have flattened pastry and burglars with this. It sends people flying. It has never once been used on pastry.',
    { kind: 'melee', look: 'rollingpin', damage: 16, range: 1.3, arc: 110, cooldown: 0.75, lethal: false, knockback: 110, sound: 'sfx_whack' }, 40),
  weapon('item_pigeon_launcher', 'Pigeon Launcher', 'A drainpipe, a bicycle pump and a sack of extremely indignant pigeons. Whoever it hits forgets all about you and runs for their life.',
    { kind: 'gun', look: 'pigeon', bullet: 'pigeon', effect: 'flee', damage: 10, range: 9, cooldown: 0.8, lethal: false, ammo: 'item_ammo_pigeons', mag: 4, reload: 2.4, spread: 6, noise: 10, knockback: 14, sound: 'sfx_whack' }, 60),
  weapon('item_confetti_cannon', 'The Confetti Cannon', 'Delphine\'s party piece. It fires a fist-sized wad of confetti at a speed that knocks grown men over, and then they are covered in confetti, which is worse.',
    { kind: 'gun', look: 'confetti', bullet: 'confetti', effect: 'confetti', damage: 5, pellets: 8, range: 6, cooldown: 1.0, lethal: false, ammo: 'item_ammo_confetti', mag: 3, reload: 2.2, spread: 18, noise: 12, knockback: 10, sound: 'sfx_gunshot_heavy' }, 50),
  weapon('item_golden_plunger', 'The Golden Plunger', 'Presented to Sgt. Justin Case for "services to the drains of Halvermouth". It grabs whoever it touches and hauls them in, stunned and embarrassed.',
    { kind: 'melee', look: 'plunger', effect: 'stun', stun: 1.5, damage: 12, range: 1.8, arc: 70, cooldown: 0.7, lethal: false, knockback: -40, sound: 'sfx_whack' }, 70),
  weapon('item_mackerel_gun', 'The Mackerel Mk II', 'Julian Beaumont\'s "conversation piece": a pneumatic cannon that fires frozen mackerel. The fish are faster than they have any right to be.',
    { kind: 'gun', look: 'mackerel', bullet: 'fish', damage: 26, range: 10, cooldown: 0.6, lethal: true, ammo: 'item_ammo_mackerel', mag: 5, reload: 2.0, spread: 3, noise: 14, knockback: 40, sound: 'sfx_gunshot_heavy' }, 80),
  weapon('item_tuning_fork', 'The Resonator', 'A tuning fork the length of your arm, pitched to the exact frequency of a human skull. One tap and they stand there humming for a while.',
    { kind: 'melee', look: 'tuningfork', effect: 'stun', stun: 3, damage: 6, range: 1.2, arc: 80, cooldown: 0.9, lethal: false, knockback: 4, sound: 'sfx_punch' }, 65),
  // ---- the imported characters' signatures
  weapon('item_golden_handshake', 'The Golden Handshake', 'Sir Moneybucks\'s revolver: solid gold, mother-of-pearl grip, and a little golden hand on the muzzle. It fires gold sovereigns. Everyone it hits is somehow poorer, and you are somehow richer.',
    { kind: 'gun', look: 'goldenhandshake', bullet: 'coin', effect: 'coins', damage: 30, range: 10, cooldown: 0.5, lethal: true, ammo: 'item_ammo_sovereigns', mag: 6, reload: 1.8, spread: 2, noise: 16, knockback: 10, sound: 'sfx_gunshot' }, 5000),
  weapon('item_nail_gun', 'The Plumb Line', 'Mason\'s nail gun, modified to fire forty nails a second, every one of them perfectly level. Anyone it hits is pinned in place for a moment, perfectly level.',
    { kind: 'gun', look: 'nailgun', bullet: 'nail', effect: 'stun', stun: 1.2, auto: true, damage: 8, range: 8, cooldown: 0.1, lethal: true, ammo: 'item_ammo_nails', mag: 40, reload: 2.4, spread: 3, noise: 8, knockback: 3, sound: 'sfx_gunshot_smg' }, 900),
  weapon('item_gavel', 'The Gavel of Final Judgement', 'Chief Order\'s ceremonial gavel, four feet long and weighted with the lead seal of the old Harbour Court. ORDER. Everyone in the swing is knocked flat and stunned. Nobody is killed: the Chief hates paperwork.',
    { kind: 'melee', look: 'gavel', effect: 'stun', stun: 3, damage: 26, range: 1.6, arc: 170, cooldown: 1.3, lethal: false, knockback: 60, sound: 'sfx_whack' }, 1200),
  weapon('item_pythagorean', 'The Pythagorean', 'Arthur\'s right-angled gun: three barrels on the corners of a 3-4-5 triangle, firing chalk-tipped rounds at 0° and ±36.87°. "It is not a spread. It is a proof."',
    { kind: 'gun', look: 'pythagorean', bullet: 'chalk', fan: [-36.87, 0, 36.87], damage: 22, range: 10, cooldown: 0.7, lethal: true, ammo: 'item_ammo_chalk', mag: 5, reload: 2.0, spread: 0, noise: 16, knockback: 12, sound: 'sfx_gunshot' }, 3141),
  weapon('item_tinfoil_ray', 'The Tinfoil Ray', 'Lucas built it to "jam their satellites". It fires a green beam that goes straight through everyone in a line and out the other side. He has never said who "they" are.',
    { kind: 'gun', look: 'tinfoil', bullet: 'ray', pierce: true, damage: 26, range: 14, cooldown: 0.65, lethal: true, ammo: 'item_ammo_foil', mag: 8, reload: 2.2, spread: 0.5, noise: 6, knockback: 6, sound: 'sfx_gunshot_smg' }, 1500),
  weapon('item_harpoon_cannon', 'The Old Harpoon', 'Captain Ober\'s whaling gun, brass and oak, older than the Yards. It fires a harpoon on a line and reels in whatever it catches — stunned, like a landed fish.',
    { kind: 'gun', look: 'harpoon', bullet: 'harpoon', effect: 'stun', stun: 1.5, damage: 34, range: 12, cooldown: 1.2, lethal: true, ammo: 'item_ammo_harpoons', mag: 1, reload: 1.6, spread: 0.5, noise: 18, knockback: -90, sound: 'sfx_gunshot_heavy' }, 2500),
  weapon('item_cheddar_blaster', 'The Cheddar Blaster', 'Farmer Chuckie\'s cheese-wheel launcher, a drum magazine of mature cheddar. Each wheel hits like a bowling ball and smells like a victory.',
    { kind: 'gun', look: 'cheddar', bullet: 'cheese', damage: 24, range: 9, cooldown: 0.75, lethal: true, ammo: 'item_ammo_cheese', mag: 6, reload: 2.6, spread: 4, noise: 12, knockback: 55, sound: 'sfx_gunshot_heavy' }, 1800),
  // ---- their ammunition (no shop sells it; there's a supply with each)
  ammo('item_ammo_pigeons', 'Indignant Pigeons', 4, 'Pigeons, each in a small paper bag, each furious.'),
  ammo('item_ammo_confetti', 'Confetti Wads', 6, 'Tightly packed. Very tightly packed.'),
  ammo('item_ammo_mackerel', 'Frozen Mackerel', 10, 'Rock hard. Keep frozen. Keep away from the cat.'),
  ammo('item_ammo_sovereigns', 'Gold Sovereigns', 12, 'Real gold coins, milled for a gun. Firing money: the most Moneybucks thing imaginable.'),
  ammo('item_ammo_nails', 'Nail Strips', 40, 'Galvanised, 3-inch, perfectly straight.'),
  ammo('item_ammo_chalk', 'Chalk Rounds', 15, 'A lead core in a chalk jacket. They leave little white marks: Q.E.D.'),
  ammo('item_ammo_foil', 'Tinfoil Cells', 16, 'Batteries wrapped in tinfoil. "So they can\'t track them."'),
  ammo('item_ammo_harpoons', 'Harpoons', 4, 'Barbed, on a coil of tarred line.'),
  ammo('item_ammo_cheese', 'Cheese Wheels', 12, 'Mature cheddar, aged until it could stop a door.'),
]);

/** Where each one is kept: added to an existing container, or a new locked case placed in a home. */
export const STASHES = [
  { container: 'ct_gullwing11_1_dresser', items: { item_rolling_pin: 1 } },
  { container: 'ct_gullwing11_2_dresser', items: { item_pigeon_launcher: 1, item_ammo_pigeons: 12 } },
  { container: 'ct_gullwing11_3_dresser', items: { item_confetti_cannon: 1, item_ammo_confetti: 18 } },
  { container: 'ct_harbourline_2_dresser', items: { item_golden_plunger: 1 } },
  { container: 'ct_atlas_2_dresser', items: { item_mackerel_gun: 1, item_ammo_mackerel: 30 } },
  { container: 'ct_atlas_3_dresser', items: { item_tuning_fork: 1 } },
  { container: 'ct_manor_vault', items: { item_golden_handshake: 1, item_ammo_sovereigns: 36 } },
  { container: 'ct_harbourline_1_dresser', items: { item_gavel: 1 } },
  { container: 'ct_shack_arthur_dresser', items: { item_pythagorean: 1, item_ammo_chalk: 30 } },
  { container: 'ct_atlas_1_dresser', items: { item_tinfoil_ray: 1, item_ammo_foil: 32 } },
  { container: 'ct_mason_toolbox', new: { map: 'plumb_unit_1', name: 'Mason\'s toolbox', owner: 'npc_mason', prop: 'chest', examine: 'A steel toolbox, every tool in it laid out perfectly level.' }, items: { item_nail_gun: 1, item_ammo_nails: 120 } },
  { container: 'ct_ober_sea_chest', new: { map: 'salty_ober', name: 'Captain Ober\'s sea chest', owner: 'npc_ober', prop: 'chest', examine: 'An iron-bound sea chest stencilled S.S. OBER. It smells of tar and rum.' }, items: { item_harpoon_cannon: 1, item_ammo_harpoons: 8 } },
  { container: 'ct_chuckie_cheese_safe', new: { map: 'chuckie_house', name: 'Chuckie\'s cheese safe', owner: 'npc_chuckie', prop: 'chest', examine: 'A safe painted like a wedge of cheese. It is, in fact, full of cheese — and something else.' }, items: { item_cheddar_blaster: 1, item_ammo_cheese: 36 } },
];

/** Put each stash in its container (making the new ones, with a chest on a free floor tile). */
export function addSpecialWeapons(maps, containers) {
  for (const s of STASHES) {
    if (s.new) {
      const m = maps[s.new.map];
      if (!m) throw new Error(`special weapons: no map ${s.new.map}`);
      containers[s.container] = { name: s.new.name, owner: s.new.owner, theftFact: 'fact_player_burglary', items: {}, money: 0 };
      const at = freeTile(m);
      m.props.push({ id: `${s.container}_prop`, type: s.new.prop, x: at.x, y: at.y, interact: { kind: 'container', container: s.container }, examine: s.new.examine });
    }
    const c = containers[s.container];
    if (!c) throw new Error(`special weapons: no container ${s.container}`);
    c.items = { ...c.items };
    for (const [id, n] of Object.entries(s.items)) c.items[id] = (c.items[id] || 0) + n;
  }
}

/** A floor tile against the back wall (row 1) that nothing stands on, away from the doors and spots. */
function freeTile(m) {
  const rows = m.tiles;
  const taken = (x, y) => m.props.some((p) => x >= p.x && x < p.x + (p.w || 1) && y >= p.y && y < p.y + (p.h || 1))
    || Object.values(m.spots || {}).some((s) => Math.abs(s.x - x) + Math.abs(s.y - y) < 1)
    || (m.doors || []).some((d) => Math.abs(d.x - x) + Math.abs(d.y - y) <= 2)
    || (m.keepClear || []).some(([kx, ky]) => kx === x && ky === y);
  for (let y = 1; y < rows.length - 1; y++) {
    for (let x = rows[0].length - 2; x >= 1; x--) {
      if ('ftcg'.includes(rows[y][x]) && !taken(x, y)) return { x, y };
    }
  }
  throw new Error(`special weapons: no room in ${m.id}`);
}
