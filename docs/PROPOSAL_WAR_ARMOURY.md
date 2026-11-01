# Proposal: the armoury — vehicles, helicopters, troop classes, weapon tiers and looks

Status: **proposal; nothing in the game has changed.** Numbers are **starting figures to calibrate**. The pictures are **target art** drawn with the game's real sprite code plus mock-only modules; none of it is in `src/`. All designs are original (no copying of any protected franchise's vehicles, armour or insignia); the "clone-wars" and "space-marine" ideas are only the *feel* the owner asked for.

Pictures (`docs/mockups/`): `proposal-war-vehicles-1.png` (ground fighting: 7 battle tanks, 5 carriers, 5 recon), `-2.png` (artillery, anti-air, logistics), `-3.png` (medical and engineers, 7 helicopters, 7 real Aerospace aircraft), `proposal-war-troop-eras.png` (four armour eras × seven roles), `proposal-war-troop-loadouts-1.png` and `-2.png` (nine classes × five weapon tiers), `proposal-war-troop-customizer.png` (the armoury screen). Sources: `docs/mockups/src/war/` (`fleet.js` catalog and sprites, `trooper.js` armoured troopers and guns, `arsenal.js` class and tier data, `fleet.html`, `eras.html`, `loadouts.html`, `customizer.html`).

## 1. Vehicles: seven classes, at least five types in each

Each entry has a **class**, a **source**, an **era** (1 traditional, 2 modern, 3 future), four stat bars (armour, firepower, speed, capacity), one **perk** (always on) and one **ability** (player-triggered, with a cooldown). The catalog in `fleet.js` is the data; the numbers it holds are the starting figures.

| Class | Types (source, era) |
| --- | --- |
| Battle tank | Anvil Mk1 (own works, 1), Lancer light (works, 1), Bulwark heavy (works, 2), Hound tank destroyer (works, 2), Cinder assault tank (works, 2), Breacher dozer tank (works, 2), Aegis hover tank (works, 3) |
| Armoured carrier | Marten light carrier (buy, 1), Wolf APC (buy, 1), Badger IFV (buy, 2), Mule heavy carrier (buy, 2), Ghost stealth carrier (buy, 3) |
| Recon | Scout buggy (buy, 1), Armoured car (buy, 2), Sensor van (buy, 2), Drone carrier (buy, 3), Skimmer scout (buy, 3) |
| Artillery | Thump mortar carrier (buy, 1), Hammer SP gun (buy, 2), Siege howitzer (buy, 2), Rainmaker rockets (Arms works, 2), Longbow launcher (Arms works, 2) |
| Anti-air | Skyguard twin gun (buy, 1), Falconer missile AA (buy, 2), Whirl gatling (buy, 2), Longshot SAM (buy, 3), Lance laser AA (buy, 3) |
| Logistics | Supply truck, Fuel tanker (buy, 1), Ammo carrier, Command vehicle, Recovery vehicle (buy, 2) |
| Medical and engineers | Medevac ambulance (buy, 1), Field hospital, Bridgelayer, Mine sweeper, Repair crane (buy, 2) |
| Helicopter | Wren scout, Drover transport, Viper attack, Talon gunship, Mercy medevac, Ox heavy lift, Shade stealth recon (all own works) |
| Aircraft | The seven real Aerospace products (Kestrel, Falcon, Gyrfalcon, Wraith, Harrow, Thunderhead, Nightjar), each with a war perk and ability; nothing new is built |

**Sources follow the standing rule:** the mercenary company builds **only tanks and helicopters**; aircraft and satellites come from Aerospace; guns, ammunition, drones, rockets and missiles come from the Arms works; ships from the shipping company; everything else (carriers, trucks, AA, recon) is **bought** from suppliers or transferred from your other companies. Internal transfers are free. A vehicle is one saved record: type, paint, damage, ammunition, fuel, crew, battalion.

**Perk and ability examples** (full text on the pictures): Anvil fires on the move at −25% accuracy / smoke screen; Bulwark has frontal plate that ignores the first hit / brace for +armour while stopped; Breacher pushes through rubble and light walls / ram a wall; Hound out-ranges tanks / ambush shot from cover; Aegis hover crosses rivers and marsh / short boost over obstacles; Badger carries a squad and fires a gun while they stay inside / unload under cover; Drone carrier launches scout drones / reveal a province; Longshot SAM and Lance laser AA cover a wide air zone / salvo against an incoming strike; Command vehicle raises planning bonus and orders speed in range / rally; Recovery vehicle tows wrecks back (the wreck becomes a repaired vehicle later).

**Combat meaning.** The four bars map to the stats the strategic and tactical rules already use (armour, soft/hard attack, speed, capacity) so no new combat formula is needed; perks are small modifiers and abilities are timed effects, both defined in data. Armour facing and module damage (`PROPOSAL_WAR_TACTICAL.md`) apply to all armoured types.

## 2. Troops: nine classes, five weapon tiers each

Classes: **rifleman, machine gunner, anti-tank, marksman, medic, combat engineer, signaller, officer, recon.** A class is a role with fixed behaviour; the **weapon tier** is what you change.

- **Tier 1 and 2** are items the Arms works already makes (rifles, belt MGs, RPGs, sniper rifles).
- **Tier 3** is a new Arms-works recipe on the research tree (e.g. assault rifle with launcher, anti-materiel rifle, sensor pack).
- **Tier 4 and 5** are *future research*: energy weapons (pulse, plasma, ion, rail, lance), costly, and tier 5 can need an armour era (a heavy plasma repeater needs a power-armour frame).
- Each tier shows damage, range, fire rate (three bars) and one perk (`proposal-war-troop-loadouts-1.png`, `-2.png`; the full table is in `arsenal.js`).
- **Equipping**: set a tier for the whole class at once ("40 pulse rifles from the Arms works store: 14 in stock, 26 on order, 4 days") or per person (override). Weapons are real items: a rifle in a soldier's hands is not in the store. No item is in two hands. Lost or destroyed weapons are gone; salvage may return some.
- **Extra slots**: sidearm, support (grenades), gadget (shield emitter, drone controller, med-beam module). Slots are limited by class and armour era.

## 3. Troop looks: four armour eras, then colours and marks

Eras (`proposal-war-troop-eras.png`):

1. **Field uniform** — cloth, helmet and vest. Cheap, quick to train. (Real `drawPerson` sprite.)
2. **Plate carrier** — plates, night-vision helmet, knee pads. Stops rifle rounds. (Real sprite plus overlays.)
3. **Phalanx hardsuit** ("clone wars" feel) — sealed shell, sensor visor, helmet crest or antenna. Shrugs off small arms; needs a squad band. (New painted sprite, same style.)
4. **Bastion power armour** ("space marine" feel) — powered plate, reactor pack, two-handed heavy weapons. Slow, huge, costly. (New painted sprite, bigger.)

**What is functional and what is cosmetic.** The **era** changes protection, speed, cost, training time and which weapon tiers fit — it is real equipment. **Colours** (primary, secondary, trim, visor/glow), **pattern** (plain, stripes, camo, chevron, checks), **insignia** (star, bar, wing, dots, stripes), **crest** (none, crest, antenna, fin) and **squad band** are **free and cosmetic**. A look is saved as a **preset** and applied to a class, a squad or a battalion; a soldier may differ from their squad. Captured or allied units keep their own look.

## 4. Engine and performance (honest)

- **Eras 1 and 2** use the game's real `drawPerson`; the helmet needs one new hat style in `src/engine/drawPeople.js` (the real hard hat is fixed yellow). **Eras 3 and 4**, all vehicles, helicopters and gun sprites are **new sprite modules** drawn with the same idiom (1-px ink outline, lit left / shaded right, cached). They do not exist in `src/` yet.
- **Cache key** per sprite: `(kind, look hash, state, facing)`; vehicles rotate a cached hull and turret by heading (as `carSprites.js` does). A look is a small record (era, five colours, pattern, insignia, crest, band), so a thousand soldiers share a handful of sprites.
- **On-screen cap** stays about 40 drawn soldiers plus vehicles; soldiers are saved records and only the nearest are drawn as NPCs.
- **Saves**: a look preset and a loadout are a few fields; vehicles and weapons are existing item/stock records. No tests are edited by this plan; new tests cover loadout rules (no double equip), tier unlocks, and look hashing.

## 5. Release placement

| Release | Adds |
| --- | --- |
| v0.108.0 | Vehicle catalog as data, the mercenary works for tanks and helicopters, buy/transfer of the other classes, the garage screen |
| v0.109.0 | Troop classes, weapon tiers 1–3, loadout screen, per-class and per-person equipping, helmets (era 1–2 looks) |
| v0.110.0 | Looks: eras 3–4 sprites, colours, patterns, insignia, crest, squad band, presets, the armoury screen |
| after research | Tier 4–5 energy weapons and future-era vehicles on the research tree |

(Slot these into the existing War release table; they replace the smaller "units" lines there, and no earlier release changes.)

## 6. Questions for the owner

1. Is the era-4 power armour **too large** to share a map with era-1 troops, or should every era scale to the same footprint?
2. Should enemy nations also use eras 3–4, or stay modern until you reach them yourself?
3. Should looks ever be **required** (e.g. a contract demanding a uniform), or always free choice?
