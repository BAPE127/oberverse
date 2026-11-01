# Art direction mock-up: a Streets of Rogue 2–style look (2026-10-17)

Owner's request: try making the Oberverse look like *Streets of Rogue 2*, and experiment with skyscrapers and multi-level buildings — a mock-up with screenshots before revamping the whole game. The ships' and gun-running terminals stay as they are.

**The mock-up** is `mockups/sor2/index.html` — a standalone page (open it in a browser; buttons switch scenes). It is not part of the game build and changes nothing in the game. Everything is drawn procedurally, like the game, so no image assets are needed.

| Scene | File |
|---|---|
| Today's look, for comparison | `current-halvermouth.png` |
| The street (Halvermouth crossroads, by day) | `mock-street.png` |
| Night lighting (the Abacus) | `mock-bar.png` |
| Ober's Oil Tower — the lobby (street level) | `mock-lobby.png` |
| Ober's Oil Tower — floor 14 (the city far below) | `mock-floor14.png` |
| Ober's Oil Tower — the roof | `mock-roof.png` |

## What changes
- **Real pixel art.** The world is drawn at a low resolution (480×270 here) and scaled up 4× with no smoothing, so every edge lands on a crisp pixel; 1-px dark outlines on everything; a palette with lit tops and shaded faces.
- **Roofless buildings.** You always see into buildings from the street — walls are thin, with a light top edge and a short front face, like SoR. (Today interiors are separate maps you walk into.)
- **Streets with depth:** kerbs with a lip and a face, dashed lines, crossings, drains, lamps with long diagonal shadows, cars with roofs and windscreens, drop shadows under everything.
- **Text stays legible (owner, round 2):** the world is pixel art, but every word — HUD, signs, speech, quests — is drawn afterwards at full screen resolution in a clean bold face with a dark outline, never pixelated.
- **A compact HUD (round 2):** the time and obols share one small chip by the minimap; a six-slot hotbar with detailed item icons (crowbar with its wear bar, revolver, lockpick roll, coffee, bandage, calculator) and counts.
- **Better cars (round 2):** chamfered bodies, lit and shaded sides, bumpers, head- and tail-lamps, a raked windscreen with a glint, roof, side and rear glass, mirrors, door seams — and distinct kinds: sedan, hatchback, sports car (stripes), taxi (roof sign), police cruiser (black-and-white, light bar), pickup (open bed with a crate), van, and the No. 1 bus (route number, roof units).
- **Chibi people:** big heads, small bodies, hats and badges that read at a glance.
- **Lighting:** night is a dark wash with smooth pools of light cut out for lamps, windows and neon.
- **HUD in the same style:** a chunky health bar, clock and money, a framed minimap, a hotbar, the current objective, and a floor indicator.

## Multi-level buildings (the experiment)
- The **ground floor** of a tower is just another roofless room on the street.
- **Each upper floor is its own level**, drawn as a floor plate floating over the city: the street far below (the same art, shrunk and hazed, drifting slower than the floor as you move — parallax), the building's facade falling away under its south edge, a deep drop shadow, clouds passing between. Lifts and stairs change floor; the HUD says which.
- The **roof** works the same way, higher still (smaller, hazier city): a helipad, plant and an antenna.
- In the engine this maps onto what exists: a floor is an interior map with a `floor` number and a `building`; the renderer draws the parent outdoor map underneath it at a scale and haze set by the floor number.

## If we go ahead (rough plan)
1. A pixel renderer: render the world to a low-resolution buffer and scale up; port each draw function (ground, walls, props, people, cars) to the pixel style. The biggest job — every map, prop and character is drawn in code.
2. Roofless buildings: move each building's interior onto the street map (or draw interiors in place), so you walk in without a scene change.
3. Floors for tall buildings (Ober's Oil Tower first), with lifts and stairs.
4. Lighting, the new HUD, then the menus and panels (keeping the ships' and gun-running terminals as they are).

# Proposal mock-ups for the Presidency and War updates (2026-11-01)

Plans only; the game is unchanged. Written up in `docs/PROPOSAL_POLITICS.md`, `docs/PROPOSAL_WAR.md` and `docs/WORLD_ATLAS_PROPOSAL.md`. The figures in the screens are samples.

| File | What |
| --- | --- |
| `proposal-war-atlas-world.png`, `-biomes.png`, `-theatres.png` | the redrawn world: countries, states, rivers, roads, cities, biomes, the seven theatres |
| `proposal-war-atlas-sund.png`, `-east.png`, `-south.png`, `-west.png`, `-morrow.png` | zoomed regions with state and city names |
| `proposal-pol-crown-quarter.png` | the new capital district map |
| `proposal-pol-presidency.png` | Halver House, ground floor, with the three access zones |
| `proposal-pol-mansions.png`, `proposal-pol-embassies.png` | the two mansions; embassy templates |
| `proposal-pol-oberpad-overview.png`, `-diplomacy.png`, `-influence.png` | OberPad: politics, polls, government, diplomacy, news, campaigns, access, an offer, your party |
| `proposal-war-merc-hq.png`, `proposal-war-national-base.png` | the mercenary lot in three stages; the government's base |
| `proposal-war-oberpad-company.png`, `-command.png` | OberPad: military company, transfers, production, generals, contracts, an after-action report |

Sources: `src/` (plans and OberPad screens: `plans.html` + `scenes.js`, `make_phones.py`, `strategic.html`) and `atlas-src/` (the atlas: `atlas.mjs` is the data; `make-all.sh` rebuilds the pictures). Generated files are ignored.

## War: the detailed target art (2026-11-01, second pass)
These are drawn by the game's own code (people, weapons, aircraft, ground, atlas) plus a mock-only module for tanks, vehicles, helicopters, roofs and effects. They are **target art, not in the game**. See `docs/PROPOSAL_WAR_TACTICAL.md` and `docs/PROPOSAL_WAR_STRATEGIC.md`.

| File | What |
| --- | --- |
| `proposal-war-models.png` | unit model sheet: ten infantry roles in two uniforms, camouflage by environment, eight vehicles in three states, helicopters, aircraft |
| `proposal-war-battle.png` | tactical command view at Halden Roads: HUD, fog of war, tracers, helicopter pass, wreck, breached building, banner inset |
| `proposal-war-closeup-troops.png`, `-closeup-fight.png` | the same battle at camera x3 |
| `proposal-war-destruction.png` | one block before, at impact and after, with the changes to cover, sight and paths |
| `proposal-war-strategic-map.png`, `proposal-war-supply.png` | the strategic map (provinces, figurines, plans, combat icons) and its supply mode |
| `proposal-war-designer.png`, `proposal-war-combat.png`, `proposal-war-oob.png` | battalion template designer, combat overview, order of battle with a soldier's record |
| `proposal-war-flow.png` | the six-step loop |
| `proposal-war-vehicles-1.png`, `-2.png`, `-3.png` | the vehicle catalog: seven classes (five or more types each) with perks and abilities, 7 helicopters, the 7 real Aerospace aircraft |
| `proposal-war-troop-eras.png` | four armour eras (field uniform to power armour) across seven roles |
| `proposal-war-troop-loadouts-1.png`, `-2.png` | nine troop classes, five weapon tiers each, with stats, perks and where each unlocks |
| `proposal-war-troop-customizer.png` | the armoury screen: class, look (colours, pattern, insignia, crest, band), loadout and tier, squad lineup |
| `proposal-war3d-battle.png`, `-battle-clean.png` | the overhead battle at the new level of detail (2.5D ground, buildings, units, fire), with and without the screen |
| `proposal-war3d-breach.png`, `-states.png` | ram vs blast on one wall (six moments); one house in six damage states |
| `proposal-war3d-models.png` | model sheet: troops, vehicles, aircraft, drones and effects |
| `proposal-war3d-uav.png` | the UAV team, designation and the MLRS / cannon fire mission |
| `proposal-war-hoi-command.png`, `-orders.png`, `-army.png` | the command map, giving orders with the combat window, army groups and fronts |

Sources: `src/war/` (served by `node server.js`, then open `http://127.0.0.1:8080/docs/mockups/src/war/battle.html` and the others) and `atlas-src/` (`node render.mjs hf 40 58 22 58 52 provinces` makes the strategic base).

### Regenerating the command-map pictures
The `hoi-*.html` pages read atlas base layers that are not committed (they are generated). From `docs/mockups/atlas-src/` run
`node render.mjs hf4 42.2 54.6 28.3 50.5 130 provinces` (command and army screens) and `node render.mjs hf5 47.3 50.9 35.2 42.2 300 provinces` (zoomed orders screen), then serve the repo with `PORT=8099 node server.js` and screenshot with `node docs/mockups/src/war/shot.mjs <page> <out.png> <width> <height>`.
