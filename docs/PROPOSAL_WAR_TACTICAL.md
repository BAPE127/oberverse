# Proposal: the tactical battle (overhead command view) in detail

Status: **proposal; nothing in the game has changed.** This replaces the earlier, much smaller tactical sketch in `PROPOSAL_WAR.md`. Every picture below is **target art**: it is drawn by the game's own code (people, weapons, aircraft, ground) plus a mock-only module for tanks, vehicles, helicopters, roofs and effects, so it shows what the engine would produce. It is not in the game.

Pictures (`docs/mockups/`): `proposal-war-models.png` (the unit model sheet), `proposal-war-battle.png` (Halden Roads command view), `proposal-war-closeup-troops.png` and `-closeup-fight.png` (camera ×3), `proposal-war-destruction.png` (one block in three moments). Sources: `docs/mockups/src/war/` (`warart.js`, `soldiers.js`, `ground.js`, `battle.html`, `triptych.html`, `sheet.html`).

## 1. What the pictures prove, and what they do not

- **They run on the real engine.** A page served by `server.js` imports `src/engine/drawPeople.js`, `drawPixelWeapons.js`, `drawAero.js`, `drawPixelGround.js` and `GameMap`. Soldiers, their rifles, machine guns and launchers, the Aerospace aircraft (Falcon, Harrow, Wraith) and the brick, grass, road, river and bridge ground are the game's own sprites. Nothing about the look is invented.
- **New art is small and in the same idiom.** The one change to the real renderer is a `helmet` hat style in `drawPeople.js` (its only hard hat is fixed yellow); the mock applies that change to a copy of the module at load time. Tanks, other vehicles, helicopters, roofed buildings, fire, smoke and explosions are in `warart.js`, painted with the game's method: 1-px ink outline, lit left, shaded right, cached.
- **What canvas 2D can and cannot do here.** It can draw about 250 cached sprites with shadows at 60 fps if they are cached by heading (the cars' `carSprites.js` already does this). It cannot do per-pixel lighting or smooth 3D collapse; those are reach goals (see §10).
- **Scale.** People are about one tile tall (28 px) and a house is 5 tiles wide. At the command view a soldier is small but readable; at ×3 you see their helmets, packs, armbands and weapons.

## 2. The battle map (not a flat arena)

A battle map is **generated from the engagement's place** on the atlas: its **place type** (urban, industrial, port, airfield, rural, forest, desert, military site, pass) chooses a recipe; the **state's biome** chooses the ground, trees and colours; the **province** chooses weather and whether there is a river, a coast or hills; a **seed** (the engagement id) makes it the same every time.

| Place type | Recipe (what is laid down) |
| --- | --- |
| Village or town | a main road and a cross road, pavements, 8 to 14 buildings of mixed kinds, yards, hedges, walls, a square, a bridge if a river is in the province |
| Industrial | big sheds with sawtooth roofs, chimneys, yards of containers and pipes, a rail spur, a gatehouse |
| Port | quays, cranes, warehouses, moored ships you can fight through, breakwaters |
| Airfield | runway and taxiways (the Starling Flats idiom), hangars, a tower, aircraft parked (real ones if they are yours) |
| Rural | fields with crop rows, farmsteads, tree lines, tracks, a stream |
| Forest or pass | dense trees (cover and blocked sight), a track, rock bands |
| Military site | fence line, gates, bunkers, sandbags, barracks |

Size: 60 × 34 tiles for a squad action, up to 120 × 68 for a battalion fight. Roads, rivers and pavements use the real tile types, so the real ground painter draws them (`drawPixelGround`).

## 3. Camera and levels of detail

| Zoom | What you see | What is drawn |
| --- | --- | --- |
| **Far** (about ×0.35) | Total War-style banners: one flag per squad or vehicle group, a number, strength bars | `banner()` in the mock; banners replace sprites; terrain only |
| **Command** (×1, the main picture) | the whole village, every person a small sprite, buildings with roofs, effects | all sprites at 1:1, shadows, tracers |
| **Close** (×3) | helmet bands, packs, armbands, weapon types, tank markings, hit flashes | the same cached sprites scaled by whole numbers (no smoothing) |

The step between levels is a continuous zoom; the switch to banners happens at the zoom where a sprite would be under 10 px. Buildings choose one look, **roofs from above**, with a **cutaway** (the front half of the roof removed) when a building is garrisoned or selected, so you can see the squad inside. That is the one tactical style; it is not a third look.

## 4. Unit models and animation

- **Ten infantry roles** (rifleman, squad leader, machine gunner, anti-tank, medic, marksman, combat engineer, signaller, officer, recon), each with its own weapon sprite from the arms content (`ar`, `smg`, `lmg`, `rpg`, `sniper`, `shotgun`, `pistol`), pack (radio, ammo, rockets, tools, medic bag, ghillie) and markings (armband, red cross, officer's braid). Walking, aiming and flashing use the real four-frame walk and the real `aim` angle.
- **Four uniform families**: your company (a palette you choose), the Sund Army (blue-grey with a yellow band), and enemies (Ostmark green with red, Varnistan sand). **Environment variants** (forest, desert, urban, snow) recolour cloth, legs and helmet and add a camouflage pattern.
- **Vehicles** (nose-up sprites rotated by heading, with the turret on its own layer): main battle tank, light tank, APC/IFV, recon car, self-propelled gun, anti-air, supply truck, medevac. **Three states each**: intact, damaged (scorch, a thrown track link, smoke), wreck (burnt, turret thrown off, still solid cover).
- **Helicopters**: scout, transport (with a door open for troops), attack (rocket pods, nose gun). The rotor is a live disc with blades, a soft blur and a ground shadow that falls by altitude.
- **Aircraft**: the game's `drawAircraft`, at a reduced scale, with its shadow.
- **Caching**: a sprite is painted once per (look, state, faction) and drawn rotated; people are cached per (look, facing, frame) already. At 250 units that is a few hundred canvases, and they are shared.

## 5. The combat model (the rules the pictures show)

All of it is one deterministic function of the engagement id, the orders and the saved units, so the same rules run at strategic scale for the battles you do not play.

- **Weapons** read the arms content's real stats: `damage`, `range`, `cooldown`, `spread`, `mag`, `reload`, `lethal`, `blast`, `ammo`. Rifles, LMGs, marksman rifles, RPGs and missiles are not re-invented.
- **Line of sight**: a ray on the tile grid, blocked by intact building walls, walls, hedges (partly), wrecks, smoke, tall crops and dense forest. A squad sees farther than a single soldier (spotters). Aircraft see from above but are seen by AA.
- **Cover values by what stands there** (a chance a shot is absorbed): open 0, hedge or low wall 0.25, rubble 0.25, parked or wrecked vehicle 0.5, sandbags 0.75, a building's wall 0.75, inside a building at a window 0.85. Cover is re-read every shot, so a destroyed wall changes it at once.
- **Suppression** builds from incoming near-misses (more from MGs and explosions) and fades; four states: steady, shaken (worse aim), pinned (cannot advance), broken (flees until rallied). **Morale** falls with casualties, a dead leader, being flanked, and rises with a medic, an officer nearby and success.
- **Armour** has front, side and rear values; **penetration** compares the weapon's `piercing` (from the content or a missile's class) with the armour facing the shooter. Hits can damage modules: **engine** (immobilised), **tracks** (cannot move), **turret ring** (cannot traverse), **gun** (cannot fire), **crew** (reduced rate), **ammo** (brew-up). A tank that is immobilised is still a gun, then a wreck.
- **Explosives** (RPGs, tank HE, mortars, missiles, bombs) use a blast radius with falloff, damage to people, vehicles, and buildings (see §6), and set fires.
- **Helicopters** have altitude: low, they are hit by rifles and RPGs; high, only by AA. Attack runs consume rockets and gun ammo; transports land to drop or pick up a squad; medevac carries the wounded to the clinic (their record updates).
- **Engineers** repair vehicles, clear rubble (40 s a tile), build sandbags and lay or clear mines; **medics** stabilise the wounded so they live; **signallers** extend how much of the map you see and allow calling support.

## 6. Destruction: buildings that are made of parts

A building is **segments, each with hit points and an armour value for its material** (timber, brick, concrete, steel):

| Segment | What it does when it fails |
| --- | --- |
| Wall (north, east, south, west, each in two parts) | opens a breach: a new path, a new line of sight, cover changes from heavy to open there |
| Floor (per level) | people and objects on it fall one level (damage) |
| Roof | exposes the interior to fire from above; fire spreads faster |
| Structural supports (corner posts) | when two adjacent supports fail, the building collapses |

States map to what the art shows: **0 intact**, **1 damaged** (holes, broken windows, scorch), **2 breached** (big openings, burning, smoke), **3 rubble** (a heap with light cover). Collapse damages everyone inside, ejects survivors to the nearest open tile, leaves rubble that **slows movement and blocks vehicles** until engineers clear it, and may block a road. Smoke, dust and fire have their own lifetimes and affect sight.

Other structures use the same rule with simpler segments: walls, fences, bridges (a span with hit points; a downed bridge changes the strategic map's supply), sandbag positions, vehicle shelters, supply depots (a destroyed depot reduces the stores it held), trees (felled by blasts), roads (craters slow vehicles).

**Persistence**: each structure has an id (place id + building id) and a saved state and segment health. A destroyed building stays destroyed after a reload and after the battle ends. **Navigation** updates the walkable grid when a state changes, with a rule that no unit is ever left inside an impassable tile (nearest free tile is chosen). **Repair** is a contract with the construction company; it is never free. **Your base and its core facilities are exempt until a coup**; the single damage gate described in `PROPOSAL_WAR.md` §4 refuses damage to them, whatever hits them (the destruction pictures use ordinary buildings).

`proposal-war-destruction.png` shows one block before, at impact and after, with the **rule changes drawn on it**: cover heavy to light, a new three-tile path through the footprint, a sight line that now extends past the block, rubble that stops vehicles, a garrison hit and pinned.

## 7. Orders, formations and support

- **Squad orders**: move, attack-move, hold, attack a target, defend a point, advance, flank, suppress, regroup, garrison a building, retreat, throw smoke, escort, recon. **Stances**: aggressive, defensive, hold fire. **Formations**: line, column, wedge, skirmish (spread widens under fire).
- **Vehicle orders**: the same plus turn turret to a target, reverse, deploy (SP guns), unload/load troops, repair.
- **Support from real stock**: attack helicopter (on station time, rockets left), fighters and bombers from Aerospace (a run takes the aircraft out of availability for the day; ordnance is consumed), mortar or SP gun fire missions (spotted fire needs a spotter), **missiles** (target, 20 s flight; a Longbow or Skylance from the Arms works, a Sentinel from Aerospace; the count drops at launch). A request shows its cost, its delay and its risk (friendly fire radius, AA threat).
- **Fog of war** uses the strategic **intel** level and unit vision; the planning screen shows **estimates** ("about 12 infantry?") not the truth.

## 8. Missions and what the result writes

Hold a point for a time; capture; destroy a depot; escort a convoy; extract an officer; defend a gate; raid; rescue a downed pilot. Reinforcements are **real available forces** only (never spawned). A battle ends at its objectives, a time limit or a withdrawal. The result (people killed, wounded, captured; vehicles damaged, destroyed, captured; ammo and fuel; structures; objectives; reputation) is **written once**; the engagement state moves `open → tactical → resolved` and the strategic layer will not resolve it again.

## 9. Performance and tests

- **Budget** (to be measured, then fixed in the living-base release): about 250 units live (up to 200 people, 40 vehicles, 10 aircraft), 10 sim ticks a second, a spatial hash for targeting, cached line-of-sight rays, an effects budget (particles capped, oldest first), and draw order by y with only on-screen sprites drawn.
- **Tests**: the same seed and orders give the same result; a result is written once; stock (missiles, ammo) is consumed once; structure state survives a reload; the walkable grid updates and no unit is trapped; damage to your base before a coup is refused for every source; a general's resolution and a played result use the same rules.

## 10. Art and engine work, honestly labelled

| Item | Status in the mock | What the engine needs |
| --- | --- | --- |
| Soldiers, weapons, aircraft, ground | **real** (the game's code) | a `helmet` style, role/uniform data, camouflage patterns, packs and armbands as small overlays |
| Tanks, vehicles, helicopters | mock-only module | `src/engine/drawWarVehicles.js`, heading-bucket cache (as `carSprites.js`), turret layer, rotor animation |
| Roofed buildings in four states | mock-only | a building painter with a roof and a cutaway; state sprites cached per building |
| Fire, smoke, explosions, tracers | simple canvas shapes | a small particle system with a cap |
| Segment-level collapse animation | **not drawn** (the picture shows before, impact and after) | a short state animation (a reach goal; the rules do not need it) |
| Per-pixel lighting, night battles | **not drawn** | canvas 2D multiply layers could do a simple version; a reach goal |
| Interior view of every building at once | **not drawn** | only garrisoned or selected buildings are cut away |

## 11. Release plan additions (art and engine sub-releases)

These slot into the war release plan (see `PROPOSAL_WAR.md` §8), each tested and playable:

| Release | Adds |
| --- | --- |
| v0.116.0 (10a) | the battle mode: camera tiers, sprite cache, unit caps; soldiers on the real sprites with the `helmet` style; the map generator (village recipe first); squad orders; line of sight and cover; the HUD |
| v0.116.1 (10b) | tanks and vehicles with module damage; helicopters; aircraft passes; support from real stock; smoke, fire, tracers |
| v0.116.2 (10c) | the other recipes (industrial, port, airfield, rural, forest, military site); fog of war from strategic intel; engineers, medics and evacuation |
| v0.118.0 (12a) | the destruction layer: building segments, rubble, collapse, saved state, navigation updates, repair contracts |
