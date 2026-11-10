# The Oberverse — 2.5D isometric graphics concept study

**Status:** concept study only. Nothing in the playable game was changed (`git status` shows only `mockups/iso25d/` as new). No implementation is authorised. Written against **v0.103.11** (commit `fbfa095`, branch `claude/kind-rubin-3nafrm`).

Labels used throughout: **[V]** verified in the source or by running the game headlessly · **[P]** proposed design · **[A]** assumption · **[?]** unresolved.

**Caveat on the reference screenshots.** The Project Zomboid screenshots named in the brief were not attached to this session (the brief contains only empty placeholders). The visual direction below is built from the written description of them. **[?]** Please supply them so the art direction can be checked.

---

## 1. Executive summary

- **The recommendation: a hybrid renderer.** Keep every line of simulation, content and save code. Replace only the picture-drawing layer (`src/engine/*`) with a WebGL renderer that draws a fixed 2:1 dimetric view of low-poly 3D parts, and keep the existing pixel-upscale idiom so it still reads as The Oberverse. Characters and vehicles are small 3D models driven by the existing `appearance` and `vehicles.models` records.
- **Why this is feasible [V]:** the world is already one continuous tile grid per region with every interior *laid over its building's footprint* (v0.47.0), so a "cut-away" building view needs no new world data. Rendering already reads game state and never mutates it, which is exactly the boundary needed.
- **Proof it works:** twelve mock-ups (section 4) were rendered by an isolated prototype from the game's **own exported map, building, prop, NPC and vehicle data** — real names, real layouts, real people in the places the simulation put them at 10:40.
- **Biggest obstacles:** (1) ~1,450-line `renderer.js` + ~1,450-line `drawWorld.js` + ~1,500-line `propSprites.js` and ~30 other draw files all need replacing or porting; (2) 159 prop types need 3D (or baked-sprite) equivalents; (3) the single-file `index.html` distribution and `file://` use must be preserved (three.js ≈ 670 KB minified, inlineable); (4) interiors are one flat floor each, with only 9 of 306 having partitions, so Zomboid-style interiors need authored content, not only rendering; (5) upper floors exist only as separate map ids (towers/lifts), not as stacked storeys.
- **Verdict:** worthwhile **if** done as an optional, flag-switched second renderer behind the existing one, beginning with a vertical slice (Lanternside + 3 interiors). Not worthwhile as a big-bang replacement.

## 2. Existing project assessment [V]

| Area | Finding |
| --- | --- |
| Language / stack | Plain JavaScript ES modules, no dependencies; ~84,600 lines in `src/`, 165 test files (~24,700 lines, `node:test`); `tools/build.mjs` inlines everything into one 5.8 MB `index.html` that runs from `file://` |
| Rendering | Canvas 2D, fully procedural. World is drawn into a low-res canvas (`this.low`, `px` device pixels per art pixel) and upscaled with no smoothing; text, lighting and overlays are drawn after at full resolution (`renderer.js`) |
| Camera | Top-down 3/4 style, follows the player with exponential smoothing, ~24 tiles across, integer zoom, bounds span the region (`updateCamera`) |
| Depth sorting | A single `items.sort((a,b)=>a.y-b.y)` of buildings, props, NPCs, cars on bottom-edge y; towers sorted by height; player drawn translucent when occluded (`playerOccluded`) |
| World model | 12 outdoor maps + 306 interior maps; tile codes in `src/world/tiles.js` (grass, paving, road, water, wall, floor types…); regions stitch maps seamlessly (coast: Westbrook·Lanternside·Ober Fields) or via gateways |
| Buildings | `{x,y,w,h,roof,wall,trim,sign,awning,columns,tower,flatRoof,glass,dome…, door:{to:{map,spot}}}`. v0.47.0: each building's interior map is placed over its footprint and the front door is a seamless "portal", so you walk in without loading |
| Interiors | Grid of `W` walls and one floor code (`f t c g`), plus props. Only 9 interiors have inner partitions (abacus, hall_of_justice, police_station, jail, manor, gun_shop, meridian_space, meridian_lobby, surplus). **No stacked floors**: towers use `Towers` content with a lift between separate maps |
| Props | 159 prop types (`content/props.js`), drawn by `drawWorld.js`/`propSprites.js`/`drawPixel*.js` |
| People | Procedural pixel characters from `profile.appearance` (`skin, hair, hairStyle, outfit, accent, accessory, build, height`; optional `sprite` image hook in `assets.js`); 137 NPCs; physical tier on the player's map, abstract tier elsewhere |
| Vehicles | 20 models (`content/vehicles`: body types hatch, saloon, limo, estate, coupe, gt, pickup, police, tractor…), `Vehicles` (physics, hotwire, seams) and `Transit` (bus and traffic) systems; ships, aircraft, tanks and helicopters have their own draw modules |
| Lighting | Darkness overlay with light "holes" (street lamps, lit windows, barrel fires, player) rendered at pixel scale with dithered sprites; 22-second traffic-light program (`world/lights.js`) |
| Weather | **None in the world simulation** (the only "weather" is the strategic-map war layer, `war/supply.js`). Rain/snow would be a new rendering feature, plus optional state |
| Clock | `world/clock.js`: 1 real s = 1 game min; `darkness` ramp (dawn 05–07, dusk 18:30–21:00) |
| Saves | `localStorage`, schema v1, migrations, `widenSave`/`growSave` for map-size changes |
| Docs | `docs/ARCHITECTURE.md`, `ROADMAP.md`, `KNOWN_ISSUES.md`, many `PROPOSAL_*` docs; prior art-direction mock-up `mockups/sor2` and `docs/mockups/` (306 files) |

Strengths: clean sim/render split (sim, systems, world, content must not touch DOM/canvas — enforced by tests), headless-runnable game, data-driven content. Limitations for this vision: flat interiors, no storeys, no weather state, art is hand-coded 2D drawing (nothing reusable as 3D), the pixel pipeline is tied to 2D canvas.

**Canonical version [A]:** `package.json`/`VERSION` = 0.103.11, HEAD `fbfa095` on the working branch. `README` says GitHub Pages serves `claude/funny-mayer-52dll8`; that branch exists locally and remotely but its tip was **not compared** **[?]**.

## 3. Location catalog [V from `GameMap`s built headlessly]

Outdoor maps (tiles · buildings · props · NPCs at 10:40):

| Region | Map (in-game name) | Type | Size | Bldg | Notes / proposed treatment |
| --- | --- | --- | --- | --- | --- |
| coast | **Lanternside** | residential/civic/harbour | 87×62 | 8 | Start town: Number 9 (home), Vane Residence, No. 11, Kettle & Crumb, Civic Office, Hollow Fixings, Quay Collective Hall, Old Lighthouse; canal, park, quay. *Mock-ups B, D, F, G, H* |
| coast | **Westbrook Lots** | construction | 53×62 | 3 | Mason's Os Site Office, Fender's Motors, Plumb Line Apartments; excavator, scaffold. Treatment: scaffold/crane kit, mud, site hoarding |
| coast | **The Ober Fields** | industrial/estate | 62×54 | 4 | Moneybucks Manor, Refinery No. 1, Estate Cottages, Crew Mess; derricks, pumpjacks, tanks. *Mock-up C* |
| city | **Halvermouth** | urban | 204×128 | 53 | 14 towers, Hall of Justice (dome), Police Precinct 1, First Bank, Rialto, Market Hall, diner, pawn shop, casino (Phonograph Grand, T42), garage, gun shop, the Sumps (17 shacks), docks warehouses. *Mock-ups A, D2, G2* |
| yards | **Mill Road Yards** | industrial/port | 112×111 | 6 | Yard 1/2 Works, Foundry Hall, Gatehouse, Ober & Sons Maritime, ship berths, cranes, moored ship |
| lariat | **Lariat** | rural town + dairy/farm | 179×125 | 32 | Main St, church, bank, mercantile, school, Chuckie's Cheese Co., barns, silos, 22 cows, cotton farm. *Mock-up E2* |
| starling | **Starling Flats** | aerospace/airfield | 180×120 | 29 | Meridian Aerospace halls, Roost Aeroworks, runway lights, launch pads, control tower, aircraft. Needs aircraft kit (jet stand-in in mock-up E) |
| crown | **The Crown Quarter** | government/diplomatic | 180×120 | 30 | Halver House (T4), Assembly, ministries, 14 embassies, party HQs; flags, plazas |
| ironcrest / willowmere | **Ironcrest Hall**, **Willowmere** | estates | 110×72 | 4 each | Mansion grounds, cottages, range/conservatory |
| fort | **Fort Gullcrest** | military | 120×84 | 13 | Barracks ×3, mess, hospital, depot, command post, armoury, hangars, motor pool, range. *Mock-up E* |
| hollowmoor | **Hollowmoor Lot** | company base (partial: sites appear as built) | 112×112 | 19 | Mercenary lot with airfield, factories, parked machines (`drawParked.js`) |

Interiors: 306 maps (e.g. `cafe`, `civic_office`, `workshop`, `lighthouse`, `player_flat`, `manor`, `refinery`, `police_station`, `hall_of_justice`, `jail`, `abacus`, casino halls, tower floors `vantage_12/_23/_roof`…). 70 distinct interior prop types dominated by chair, desk, cabinet, plant, table. Interiors for buildings with none are auto-furnished by `world/interiors.js` (trade guessed from name — e.g. all 17 Sumps shacks, 12+ Lariat houses).

**Not in the game today [V]:** airports with passenger terminals, ports beyond Yards/Halvermouth docks, retail chains — do not assume them. Airfield, runway, launch complex and ports **are** partial/real (Starling Flats, Yards).

Visual limitations common to all: no building volume (roofs drawn as flat paint), interiors as separate floor maps seen only when overlaid, 3-tile-tall pixel props, no real shadows (painted blobs), no height.

## 4. Mock-up collection (`mockups/iso25d/out/*.png`, 1920×1080)

Every image carries a red "CONCEPT MOCK-UP — not a game screenshot" bar. **What is real:** terrain tile grid, building rectangles/doors/names/colours/signs, prop positions and types, NPC identities, positions and appearance records, car/bus positions and model bodies, interior grids — all exported from the running game (`tools/dump-scenes.mjs`). **What is mine:** all 3D geometry, textures and lighting; building heights/roof shapes (inferred from `tower`, `flatRoof`, name); room wall dressing; garden fences/hedges/path stones (Mock-up B/G); the platoon, tanks, helicopters, jet and sandbags on Fort Gullcrest (E); extra background pedestrians (A); the entry-level staging of H/H2. **No existing game art was reused** — the game's art is procedural 2D and was not importable.

| # | File | Location (real) | What it shows | New capabilities needed | Technical challenges |
| --- | --- | --- | --- | --- | --- |
| A | `a_urban.png` | Halvermouth — Civic Plaza at Market Street | Volumetric towers with glass/mullions, Hall of Justice dome and colonnade, First Bank, Rialto, Market Hall, kerbs as steps, traffic lights, cars, pedestrians. Tall buildings that would hide the player are cut and labelled | 3D building kit, height-stepped ground, **roof/upper-floor cut rule** | Towers up to 42 storeys; occlusion of the player; reading roofs of 53 buildings |
| B | `b_residential.png` | Lanternside — Gullwing Row | Pitched/hip roofs, dormers, chimneys, picket fences, hedges, gravel drive, parked car, bin, bus on the road | Roof kinds, fences as run-aware kits, garden dressing | Fences/hedges are *not* in data today (proposed props) |
| C | `c_industrial.png` | The Ober Fields — Refinery No. 1 + Moneybucks Manor | Warehouse with vents/stacks, tank farm with ladders, derricks, pumpjacks, pipe runs, manor with colonnade, trucks | Industrial kit; pipe-run joining | 159 prop types to model; clutter density |
| D | `d_interior.png` | The Kettle & Crumb | Walls drop to a kerb at the near sides, tiled floor, counter, bread oven, shelves, display, tables, Mags/Tibbs/Osric/You; the door swings open | **Cut-away room**, wall materials per floor type, wall lamps, door | Seeing in without losing dimension; windows on the far wall |
| D2 | `d2_interior.png` | Halvermouth Police — Precinct 1 | Multi-room interior from the existing grid: desk and cells corridor, offices, partition walls cut low when they would hide rooms; police cars outside | Partition handling (stand vs. cut) | Only 9 interiors have partitions — rest need authoring |
| E | `e_military.png` | Fort Gullcrest | Parade ground with platoon, command post cut away (map room), armoury, vaulted hangar, tanks, helicopters, jet, jeeps, sandbags | Military vehicle bodies, vaulted roofs | Scale of ~30 buildings; aircraft/ship large objects |
| E2 | `e2_farm.png` | Lariat — Chuckie's Cheese Co. | Freestall barns, milking parlour, silos, paddocks, herd of cows, ranch fences, ranch house | Animals, ranch fence kit, silos | Herd rendering (22 cows) / pooling |
| F | `f_night.png` | Lanternside Canal Row 21:40 | Lamp pools that fall off with distance and light road/pavement, lit windows, cafe interior glow, bus headlight cones, long shadows, dark water | Real point/spot lights, emissive windows | **≤ ~30 live lights** per frame: choose nearest; lamps are baked sprites beyond that |
| G | `g_snow.png` | Gullwing Row under snow | Snow caps on roofs/trees/fences, white ground with slush road, falling snow, dusk grading | Weather state/rendering | The game has no weather simulation (see §8E) |
| G2 | `g2_rain.png` | Halvermouth at 22:15, rain | Wet tarmac/paving puddles, rain streaks, reflections of lamps | Rain layer, roughness maps | True planar reflections not done; this is faked via roughness |
| H | `h_actors.png` | Lanternside Civic Square | Real NPCs (Mags with tray, Tibbs with wrench, Osric, Sir Moneybucks, Mason), police officer, soldier, bus, hatch, pickup, police car | Skinned/rigid-part characters | **Rigid boxes**: cannot yet match the art quality of final sprites |
| H2 | `h2_sheet.png` | Same square | 8 facings, 6-step walk, wardrobe/kit swaps, five vehicle bodies | Direction/animation/outfits from data | Combat/interaction animations not yet explored |

**Honest quality note:** the prototype is blocky "low-poly" by design (time-boxed, procedural). It proves layout fidelity, lighting, cut-aways and weather; it is **not** final art. A shipped version needs a stronger art pass (textured models or hand-painted sprites/kits).

## 5. Architecture proposal [P]

**Approach compared**

| Option | Verdict |
| --- | --- |
| Full 3D engine rewrite (Unity/Godot, perspective camera) | Rejects the single-file browser distribution and the 84k-line JS sim; huge cost. **No.** |
| Pure 2D isometric tile sprites (Zomboid-style) | Needs thousands of hand-drawn tiles and sprite sheets; the project's art is procedural and has no artist pipeline. Depth sorting across 159 props × facings is the cost. Viable only with an art budget. |
| **Hybrid: WebGL 3D scene under a fixed orthographic dimetric camera, built from reusable parts, pixel-upscaled** | **Recommended.** Reuses data as-is, gives real shadows/lights, cut-aways and weather cheaply, keeps the pixel look. |
| 3D world + 2D character sprites | Possible fallback for characters if model quality disappoints (billboards from `appearance`), at the cost of lighting integration |
| Overlay a "custom layer" on the existing canvas | Cannot give real volume/lighting; stays flat |

**A. Camera.** Fixed 2:1 dimetric (30° elevation), no rotation in v1. Rotation breaks the "see the south/east faces" assumption, the facade painting and the cut-away rule and doubles QA; add 90° snaps later only if needed. Zoom in integer steps as today. Interiors: the building the player stands in drops its roof and near (south/east) walls to a kerb; neighbours stay full height; tall buildings in front of the player are truncated (prototype `cutFront`/`cutHeight`) or faded; the player gets an outline/silhouette when occluded. Same idea as Zomboid's fading roofs, without a loading transition.

**B. World rendering.** Terrain = one mesh from the tile grid with per-tile height (kerb 0.1, water −0.34, rock 0.42…) and a painted texture atlas (the prototype paints a texture per window of the map; production should use tile atlases + chunking). Roads get markings, kerbs, drains; water shore shading; buildings = parts (wall runs with painted facades, roof kinds gable/hip/flat/dome/vault/tower, sign/awning/columns kit). Depth: the GPU depth buffer replaces `y`-sort entirely; transparent items (glass, foliage cards) sorted back-to-front.

**C. Buildings from reusable components.** A `BuildingSpec` derived from today's building record plus optional new fields (`floors`, `roofKind`, `style`, `rooms`). Kit: wall segment (material, openings), corner, door, window, roof shape, parapet, plant, stair head, canopy. Interiors: floor code → material; `W` runs → partitions; props → furniture kits; windows come from `window` props. Multiple storeys **[P]**: add `storeys: [{map, z}]` to a building and render stacked cut-aways (needs content: the current tower lifts point at independent maps).

**D. Lighting and shadows.** One directional sun with a shadow map (4096 in the mock-ups, ~20 ms at that resolution on software GL — fine on GPU), hemisphere ambient, tone-mapping, dusk/night presets from `clock.darkness`. Point/spot lights chosen by proximity (≤30–34 per frame): street lamps, doors, lit rooms, headlights, barrel fires; everything else is baked emissive. Emissive windows driven by the existing schedule (`buildingLit`). Performance: shadow map and light count are the knobs; fall back to a blob shadow below a quality setting.

**E. Weather.** Rendering-only (cheap): rain streaks, snow flakes, fog (scene fog + overlay), wet-ground roughness, snow-cap material swap on roofs/trees/props, vignette/grading. Simulation-level (needs state, save-safe): *a weather timeline* (`world.weather = {kind, since, until}` derived deterministically from day + seed so it needs no save), puddle/snow accumulation over time, effects on traffic speed, NPC schedules/shelter, visibility ranges. The prototype shows the visuals only; gameplay hooks are **[P]**.

**F. Characters and animation.** Per-NPC rig built from `appearance` (rigid parts in the mock-ups; production: simple skinned meshes or 8-direction sprite sheets built from the same parts). Animation states: idle/walk/run/attack/interact/sleep driven by the existing `npc.activity`, `moving`, `facing` fields; clothing/weapons as part slots (`holding`, `lookOf(weapon)`). The simulation (`NpcSystem`, schedules, memory) is untouched: the renderer reads `npc.x/y/facing/activity`.

**G. Vehicles and large objects.** Models by `body` type (20 models, 3 farm/tractor, police, limo…); orientation = simulation `angle`; physics unchanged. Large: helicopters/jets/tanks/ships/cranes are static or scripted scenes first; ships need water interaction (existing `moored_ship`, `shipberth` props). Collision stays tile/box based in the sim.

**H. Performance and scaling.** The mock-ups render ≈15–85k triangles and 400–3,400 draw calls (software GL, headless). Production plan: chunk terrain (e.g. 32×32 tiles), instance repeated props (lamps, trees, fences), merge static building meshes per chunk, LOD for distant far-west maps, atlas textures, a draw-distance of ~2 screens, and keep only the current region plus seam neighbours alive (as `layers` does now). The biggest map (Halvermouth 204×128, 53 buildings, 276 props) fits comfortably. NPC rendering ~137 total, ~30 on-screen at most. Memory: texture atlases ~16–64 MB. Risk: mobile / integrated GPUs and the single-file build — benchmark early.

## 6. Preserving gameplay; single source of truth

Rule: **the renderer is a pure function of `Game` state.** No renderer-owned positions, ids, inventories or flags. Everything shown must come from `game.maps`, `map.buildings/props`, `game.npcs`, `game.vehicles.carsOn`, `game.transit.on`, `game.clock`, `game.getFlag`. Interaction picking uses tile coordinates (`screen→ray→tile`), so movement, collision, doors, A* and combat are unaffected.

Systems that would need change in a *future* implementation (none changed now): `renderer.js` (replace), `drawWorld.js`, `drawCharacter.js`, `drawVehicles.js`, `propSprites.js`, `drawPixel*.js`, `drawFarm/Aero/Factory/Deck.js` ports; **content** for storeys and partitions; camera and `toScreen()` (UI overlays — name tags, speech bubbles, health bars — all use it); mouse aiming in combat (screen→world mapping); `minimap` stays 2D; weather state (new, derived); asset pipeline for fonts/textures. Save format: no change needed (render-only) except optional weather seed/state and storey id.

## 7. Technical feasibility

- **Reusable:** all sim/systems/content/save/audio/UI DOM; tile grids; building and prop records; NPC and vehicle records; `clock`, lights/traffic program; the `low`-canvas upscale trick; the headless Game build (also used as the test bench).
- **To redesign:** every draw module; prop → 3D/kit mapping; ground painter; lighting pass; cursor/aim/hit-test; minimap and world map stay (they read grids).
- **Is the current stack sufficient?** Canvas 2D alone: **no** for real volume, shadows and lights at this scale. Plain JS: yes. **A rendering library is needed**: three.js (vendored in the prototype, v0.160.0, MIT, 670 KB min) or hand-written WebGL. Both fit the single-file build once inlined.
- **Largest obstacles:** asset volume (props/buildings), art quality bar, interior content authoring, tall-building occlusion rules, pixel-perfect picking, keeping 60 fps on low-end GPUs, regression risk for a 165-test project whose tests are mostly sim (renderer has little automated coverage — smoke test only).
- **Recommended:** hybrid WebGL renderer, runtime flag (`?render=iso`), dev-only first, old renderer remains default until parity.

## 8. Implementation roadmap (planning only)

Effort is expressed in relative units, not calendar time **[A]**: assumes one experienced graphics engineer + AI-assisted authoring; a "slice" = Lanternside + cafe/civic/flat interiors.

| Phase | Objective / graphical result | Existing systems and files affected | Deps, assets | Complexity · perf risk | Save / testing | Done when |
| --- | --- | --- | --- | --- | --- | --- |
| 0 Decision + spike (small) | Approve direction; settle reference screenshots, renderer library, quality targets; benchmark on target GPUs | none | PZ screenshots, three.js decision | S · — | none | Written go/no-go + perf budget |
| 1 Foundation | Second renderer behind a flag: camera, `toScreen()`/picking, scene graph, ground chunks, asset manager, headless snapshot tool | new `src/engine3d/`; `main.js` (flag), `Renderer` interface | tile atlas, fonts | M · M | none; snapshot tests of fixed scenes | Walk Lanternside in iso, no sim change, 60 fps |
| 2 Environment | Roads, kerbs, water, roofs/walls kit, props kit (top 40 prop types ≈ 90% of instances), trees, lamps | `content/props.js` (add `model` hints) | models/kits | L · M | none; diff screenshots | All coast region maps drawn from data |
| 3 Interiors | Cut-away rule, floor materials, partitions, windows/doors, furniture kit; room visibility | `world/interiors.js` (data hints) | interior kits | M-L · M | none; interior sweep test (306 maps load) | Walk in/out of every Lanternside building seamlessly |
| 4 Characters & vehicles | Rig from `appearance`, 8 directions, walk/run/attack, kit/weapons, 20 vehicle bodies, shadows | `drawCharacter` equivalents | character parts or sprite sheets | L · M | player/NPC visual regression set | All NPCs and cars of the slice animated |
| 5 Lighting & weather | Day/night presets, lamp/lit-window/headlight lights, shadows, rain/snow/fog + optional weather state | `clock`, new optional `world.weather` (derived) | grading, particle sprites | M · **H** (lights) | weather state determinism test | Night/rain/snow scenes meet fps budget |
| 6 Convert the rest | Halvermouth, Yards, Lariat, Starling, Crown, estates, Fort, Hollowmoor; special systems (farm fields, aircraft, ships, factories, launch) | `drawFarm/Aero/Factory/Deck/Launch` ports | many kits | XL · M | per-map smoke + NPC placement check | Every map renders; sim tests unchanged |
| 7 Optimise & polish | Chunk streaming, instancing, LOD, quality tiers, art polish, a11y, remove flag? | all | — | M · M | full regression + soak | Old renderer deprecated only on owner's decision |

Phase 1–3 is the "vertical slice" gate; reconsider after it.

## 9. Final recommendation

Proceed — but only to **Phase 0–1 and a vertical slice**, as an additive, flag-switched renderer. It gives the best balance: strong visual gain (volume, real lighting, cut-away interiors, weather), moderate complexity (renderer only), preserved sim and saves, long-term flexibility (new maps become authoring, not drawing code). Don't start Phase 6 before the slice passes visual and performance review.

## 10. Unresolved questions [?]
1. Zomboid reference screenshots (missing). 2. Art quality bar: stylised low-poly (as shown) vs. painterly sprites. 3. Target hardware (integrated GPUs/phones?). 4. Whether to keep the Streets-of-Rogue-style pixel upscale (earlier `mockups/sor2` direction) or go smoother. 5. Rotatable camera: not planned. 6. Whether the `claude/funny-mayer-52dll8` Pages branch differs from this one. 7. Multi-storey interiors need content decisions. 8. Weather gameplay hooks.
