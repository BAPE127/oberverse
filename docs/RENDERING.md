# Rendering — the isometric view

The home for how the world is drawn. Owner's decisions of 2026-11-12: a **Project Zomboid-inspired isometric view**, built in **Canvas 2D** on the existing renderer (no library; the three.js study on branch `claude/kind-rubin-3nafrm` is reference only), which **replaces** the top-down view; "Special Operations" means the **war tactical battles**. All art is original and procedural.

Status words: see `.claude/rules/testing.md`. Section 6 says what is actually built.

## 1. Audit of the renderer as found (v0.103.11)

| Area | Finding |
| --- | --- |
| Pipeline | `src/engine/renderer.js` `render()`: world pass into a low-resolution canvas (one art pixel per world pixel), upscaled crisp; then text replay, lighting (`drawLighting`), overlays, crosshair at full resolution |
| Perspective | Top-down 3/4, axis-aligned. World pixels = screen pixels × zoom; `toScreen(wx, wy)` is a scale and offset; `ui.js` inverts it by hand for the mouse (lines ~689, ~729) |
| Depth | One list of items sorted by bottom-edge `y` |
| Buildings | Roofless cut-aways always (`drawPixelBuildings.js`); a 22-storey tower is drawn as its lobby. Every interior is a separate map laid over its building's footprint (`src/world/interiors.js`); upper tower floors are separate `aloft` maps reached by lift. There is no building volume, so nothing hides the player today; the old non-pixel `drawTower` path and `playerOccluded()` ghost remain but are unused in pixel mode |
| People | `drawPeople.js`: sprites cached per look, 4 facings, 4 walk frames; weapons held between body and head |
| Props | 159 types; `propSprites.js` painters (3/4 view), `FLAT_PROPS` on the ground, shadows as ground blobs |
| Vehicles | `carSprites.js` rasterises each model per pixel at 64 headings (top-down); `drawVehicles.js`, signature cars, aircraft, ships each have a module |
| Combat | Bullets, particles, decals, crosshair drawn by the renderer from `combat` state; aim is a world vector set by the UI from the mouse |
| Wrath | `src/engine/wrath.js` (2,160 lines): a cutscene drawn at full resolution in world coordinates over the scene; mechanics are in `src/systems/combat.js` (`smite`, `riseAgain`). The renderer only reads `combat.wrath` |
| Battles | A separate pipeline: `src/ui/battle.js` (own camera, `toWorld`), `drawBattle*.js`, `battleGround.js`, `drawRoofed.js`, `drawSoldiers.js`; simulation in `src/battle/` |
| Input | `input.movement()` gives a screen-axis vector that `Game.updatePlayer` treats as world axes; analogue vectors are already handled |
| Tests | Simulation only; the renderer is covered by the Playwright smoke test and by eye |

Risks: (1) all prop and people art is drawn for an axis-aligned view; (2) the ground is pixel art that must be rotated 45°; (3) painter's-algorithm sorting of large boxes; (4) the Wrath cutscene assumes screen-up is world-north; (5) no automated visual tests.

## 2. Design

### 2.1 Projection (`src/engine/iso.js`, pure, tested in Node)

2:1 dimetric, camera looking north-west. For a world point `(wx, wy)` in pixels at height `z`:

```
ix = wx - wy          iy = (wx + wy) / 2 - z          depth d = wx + wy
```

Inverse on the ground: `wx = iy + ix / 2`, `wy = iy - ix / 2`. A 32 px tile becomes a 64 × 32 diamond; one iso unit is one art pixel, so upright sprites keep their size. Ground transform (canvas `setTransform(a, b, c, d, e, f)`): `(1, 0.5, -1, 0.5)`. A south wall (runs along x) is sheared `(1, 0.5, 0, 1)`; an east wall (runs along y) `(-1, 0.5, 0, 1)`.

`renderer.toScreen(wx, wy, z = 0)` and a new `renderer.toWorld(sx, sy)` are the only places the mapping lives. The UI never does its own arithmetic.

### 2.2 What is drawn how

| Kind | Method |
| --- | --- |
| Ground | The existing chunk painters, then each chunk is baked once into an iso diamond canvas (nearest sampling, whole pixels) and cached like the chunks are now |
| Water shimmer, flat props, prop shadows, skid marks, decals | The existing painters, unchanged, inside the ground transform |
| People, trees, lamps, small props | Upright sprites (billboards) at the projected ground anchor |
| Walls and solid buildings | Extruded from the tile grid (2.3) |
| Boxy and linear props (desks, counters, fences, belts…) | Phase 4: sheared or rebuilt per category; billboards until then |
| Cars and other vehicles | Phase 5: the existing top-down sprite inside the ground transform, stacked a few pixels high with darkened lower layers (sprite stacking), cached per model, colour and heading |
| Text, lighting, overlays | As now, through `toScreen`; room lights become diamonds |

### 2.3 Depth sorting

Revised after the Opus review of 2026-11-12 (a single key per item is not exact: an actor's feet stand 2 to 6 px from a wall, cars are 60 px long, tree crowns are 48 px wide).

Every upright item carries a **ground box** `{x0, y0, x1, y1}` in world pixels: a point with a small radius for people and small props, the footprint for multi-tile props, the bounding box of the rotated body for vehicles, the footprint for a roofed building, the tile for an interior wall column. Item A is **in front of** B when `A.x0 >= B.x1` or `A.y0 >= B.y1`, and not the other way round; when neither or both hold, the larger centre depth `d = cx + cy` is in front.

The order is a topological sort: items are bucketed by screen cell, the rule is applied to each pair whose screen rectangles overlap, and the graph is walked back to front with `d` as the tie-break and as the way out of a cycle. A roofed building is therefore one item (one cached picture of its two faces and roof), not strips.

Height is never a negative world y. Anything above the ground (bullets at chest height, name tags, lamp heads, damage numbers, a lifted Wrath victim) is placed with `toScreen(x, y, z)`.

### 2.4 Building visibility

Each building has a state the renderer owns (never saved, never read by the simulation):

| State | When | Drawn |
| --- | --- | --- |
| **Roofed** | Default | South and east faces at full height, roof on top. The interior map (floor, props, people) is not drawn |
| **Open** | The player (or the driven car) is on the building's interior map | No roof. North and west walls at one storey showing their inner faces; south and east walls and partitions cut to a low kerb; floor, props and people drawn. Animated over about 0.2 s |
| **Faded locally** | The focus is behind a roofed building (`focus.x < x1` and `focus.y < y1`, outside the footprint) and the building's picture covers the focus on screen | The building is drawn through a scratch canvas with a soft round hole (radial `destination-out`, about 110 px) punched at the focus: a see-through window that follows the player. The rest of the building is untouched. A building beside or behind the player never fades |

Buildings whose interior is not laid over their footprint (round buildings, doors that lead to another place) are entered as a scene change, as now, and that room is drawn alone as an open room. Name tags, speech bubbles, signs and room lights belonging to a hidden interior are not drawn.

NPCs and vehicles are ordinary items: hidden behind buildings by the sort, visible through the hole, hidden inside roofed buildings, visible inside an open one. Upper tower floors stay separate `aloft` maps: on one, only that floor is drawn, over the city below. Building height comes from `b.tower` (storeys), else from size and kind; data fields `storeys` and `roofKind` may be added to buildings later without a save change.

### 2.5 Gameplay stays where it is

- **Movement**: on foot only, the UI rotates the input vector 45° before `game.update` (screen-right = world `(+x, −y)`), so keys follow the screen; a screen-cardinal key is nudged by 2% so `player.facing` resolves to the nearer world direction the same way every time (right→east, down→south, left→west, up→north). Speed, collision, doors and the `facing` logic are untouched. Driving input is not rotated. Known limit: `facing` stays four-way, so keyboard-only interaction and auto-aim point along a street axis, up to 45° from the walking direction; a world facing vector would fix it but is a simulation change and needs the owner's approval.
- **Sprite facing** is chosen by the renderer from the screen direction of velocity (or of `facing` when still); it does not write `facing`.
- **Aim**: the mouse is inverted on the chest plane (`combat` flies bullets `BODY_Y` = 18 px "above" the feet, stored as world y − 18): aim = `toWorld(mouse, z = 18)` minus the player's position, the same world vector combat already uses. Bullets are drawn at `(b.x, b.y + 18)` lifted by `z = 18`. Hits and auto-aim are unchanged.
- **Driving**: unchanged (controls are relative to the car).
- **Wrath**: mechanics untouched. Interim (phases 2–4): while a Wrath cutscene plays, the frame is drawn by the old top-down path, which the cutscene was made for. Phase 5: the cutscene gets the iso camera and projected player and victim positions, its own "up is −y" art unchanged.
- **Saves**: nothing new is saved.

### 2.6 Battles ("Special Operations")

`src/ui/battle.js` and `drawBattle*.js` get the same projection, sort and building visibility from `iso.js` and the shared building module; the battle simulation, orders, selection and mission logic do not change. Its `toWorld` becomes the iso inverse.

## 3. Modules

| Module | Role | New? |
| --- | --- | --- |
| `src/engine/iso.js` | Projection, inverse, depth keys, strip maths, fade maths. Pure | New |
| `src/engine/isoBuildings.js` | Facade and roof painters, caches, strips, open/roofed/faded state | New |
| `src/engine/renderer.js` | Iso world pass: ground transform, items, camera, `toScreen`/`toWorld`, lighting and overlay positions | Changed |
| `src/ui/ui.js` | Input rotation, mouse through `toWorld` | Changed (small) |
| `tests/iso.test.mjs` | Projection round trip, sort invariants, fade | New |
| `tools/smoke-test.mjs` | Steps: behind a tower, inside, in front | Changed |

The top-down path stays in the code behind `renderer.iso = false` (debug command `view`) until the iso view covers everything; then it is removed on the owner's word.

## 4. Phases

| # | Phase | Contents | Agent |
| --- | --- | --- | --- |
| 1 | Audit and plan | This document; Opus review of section 2 | Fable, Opus |
| 2 | Foundation | `iso.js`, ground transform, billboards, depth sort, camera, `toScreen`/`toWorld`, input rotation, mouse aim, lighting and overlays in the right place | Sonnet |
| 3 | Building visibility | `isoBuildings.js`: roofed, open, local fade; towers | Sonnet (same run as 2) |
| 4 | People and props | Screen-direction facing, diagonal sprites; boxy and linear props; roof kinds and facade detail | Sonnet; Haiku classifies the 159 prop types |
| 5 | Gameplay integration | Vehicles (stacked sprites, wheels), combat effects, Wrath staging, aircraft, ships, farm, factory, launch | Sonnet |
| 6 | Battles | The battle screen on the shared modules | Sonnet |
| 7 | Test and optimise | Full suite, smoke, frame-time measurement, caches | Sonnet technical; Opus final review |

## 5. Acceptance tests

| Test | How it is checked |
| --- | --- |
| Behind a skyscraper the player stays visible | Screenshot north of a Halvermouth tower; `tests/iso.test.mjs` fade invariants |
| Entering a building shows its interior | Screenshot inside; smoke step |
| Correct layering between buildings; NPCs and vehicles too | Sort invariants in `tests/iso.test.mjs`; screenshots |
| Movement, driving, entry/exit, collisions | Existing simulation tests (unchanged code) + smoke |
| Aim matches shots | `toWorld(toScreen(p)) = p` test; smoke shot at a known target |
| Wrath | Existing `wrath` tests + a smoke run of one cutscene |
| Battles | Existing `battle*` tests + smoke |
| Save/load, transitions | Existing `save*` tests + smoke |

## 6. What is built

Verified on 2026-11-12 at the integrated build: `npm run check` 1,348 of 1,348 tests, validator 0 errors; `npm run smoke` 76 of 76 on the built `index.html`; screenshots looked at by Fable for each row marked "seen".

| Phase | State |
| --- | --- |
| 2 Foundation | **Tested, seen.** `iso.js`, baked iso ground, box sort, billboards, iso camera, `toScreen`/`toWorld` with z, on-foot input rotation, chest-plane aim (smoke: 0° error on four NPCs) |
| 3 Building visibility | **Tested, seen.** Roofed by default; open on entering (0.2 s, hysteresis); dithered see-through hole when the focus is behind; tags and bubbles of hidden NPCs suppressed; all 318 maps render without error |
| 4 People and props | **Not started.** People use the four existing facings chosen by screen direction; multi-tile props are upright sprites (classification in `RENDERING_PROPS.md`); every roof is flat |
| 5 Vehicles, combat, Wrath | **Tested, seen** (driven car, Wrath). `isoVehicles.js` stacked sprites with per-pixel heights, cached; heavy weapons, muzzle streak, aim facing; all ten Wrath themes in iso through projected actor positions, mechanics untouched (`WRATH.md`). Smoke steps: drive and get out, fire along the aim, a Wrath runs and play resumes |
| 6 Battles | **Tested, seen** (city battle). `BattleView` iso mapping; picking, screen-rectangle selection, orders, menu, pings and strikes under the cursor; shared building painter; open and locally faded buildings; units, vehicles and aircraft with real heights. Battle determinism tests unchanged and passing |
| 7 Test and optimise | Full suite and smoke run once after integration. Frame times as measured by the agents in headless (software) Chromium: world, 20 cars in view, 7–8 ms (21–25 ms before vehicle caching); battle, city map centre, 5.9 ms (1.3 ms top-down). Not measured on a real GPU. No final Opus review yet |

### Known defects and limits

World: the lighthouse is a striped box; the Phonograph marquee is a plain sign plate; props' `sortRow` is ignored; prop text is replayed over everything; faint window patches on baked interior floors; map edges show diamond corners over the sea; wall tops are a full tile thick; the see-through hole dithers dark over asphalt; inner walls of an open tower room are tinted glass.

Vehicles: bus sides have no windows; aircraft on the ground at Starling Field are flat (those at Hollowmoor have volume); anything longer than about 256 px stays flat; wheels do not turn; the crawler's tracks are hidden.

Wrath: the world behind a cutscene is scaled 1.4× through the pixel pass, so pixels are slightly uneven.

Battles: smoke and blast particles are not depth-sorted (they draw over buildings); furniture is flat on open floors; open upper floors are drawn at ground level; trench parapets and wire are flat paint; all roofs are flat; a Move order clicked on a roof goes to the ground behind it; opening a battle takes 0.6–1.3 s while building pictures are painted.

Controls: `player.facing` is four-way, so keyboard-only interaction and auto-aim point along a street axis (section 2.5). There is no `view` debug command: switch views with `window.oberverse.ui.renderer.iso = false` in the browser console.

## 7. The 3D renderer (owner's decision, later on 2026-11-12)

After seeing the Canvas 2D isometric view, the owner chose the direction of the concept study instead: **three.js (WebGL) with blocky low-poly 3D models**, as in the mock-ups on `claude/kind-rubin-3nafrm` (prototype source now in `mockups/iso25d/`). The cars and several props of the 2D view were the reason. This supersedes section 2.2's sprite methods; decision TD-19 records the exception to "no dependencies".

### 7.1 What carries over unchanged

- The **camera is the same** 2:1 dimetric projection, so `src/engine/iso.js`, `renderer.toScreen(wx, wy, z)` and `toWorld` stay the one mapping; the on-foot input rotation, chest-plane aim, the battle screen's picking and orders, and every smoke step keep working.
- The **simulation boundary**: the 3D scene is a pure function of `Game` state.
- The **building visibility rules** of 2.4 (roofed, open, see-through when the focus is behind), now done with geometry and a shader instead of pictures.
- The **2D canvas stays on top** for everything that is not solid: HUD overlays, name tags, bubbles, health bars, crosshair, highlights, bullets and sparks, damage numbers, and the Wrath cutscene art (already drawn from projected actor positions).
- The **Canvas 2D isometric view remains as the fallback** when WebGL is not available, and for comparison (`renderer.mode = 'iso2d'`). The old top-down path stays behind it.

### 7.2 Design

| Part | How |
| --- | --- |
| Library | three.js r160 (MIT), vendored as one file under `src/vendor/`, inlined into `index.html` by `tools/build.mjs`. No npm dependency, no network, still one file that opens from `file://` |
| Canvases | A WebGL canvas under the existing 2D canvas. In 3D mode the 2D canvas is cleared transparent each frame and draws only overlays |
| Camera | `THREE.OrthographicCamera` placed so that a world point lands on exactly the pixel `toScreen` gives (a test asserts this for points at several heights). Depth order comes from the depth buffer; `sortItems` is not used in 3D |
| Units | 1 three unit = 1 tile (32 world px); x east, z south, y up |
| Ground | First: the existing pixel-art ground chunks as nearest-filtered textures on flat quads (keeps the game's look and every special ground painter). Later: kerb and water heights |
| Buildings | Walls, windows, doors, signs and roofs from the building record, starting from `mockups/iso25d/src/buildings.js`; heights from `isoBuildings.buildingHeight`. Open: roof and near walls removed, the interior map's walls, props and people shown. See-through: a shader discards a dithered disc around the focus on buildings standing in front of it |
| People | Box figures from `profile.appearance` (skin, hair, outfit, accent, build, height), limbs swinging with the walk, facing the direction of travel in 8+ directions, the held weapon as a part; lying when down, asleep in beds |
| Vehicles | A model per body type from `content/vehicles` models, heading from `car.angle`, wheels that turn and steer, lamps as emissive parts and night lights |
| Props | One builder per prop type in a registry (`register(type, build)`), starting from the 85 in the prototype; an unmodelled type shows a plain box of its footprint so nothing is missing |
| Light | A sun with shadows and sky ambient driven by `clock.darkness`; lamps, lit windows, headlights and open-room lights as real lights, nearest ~24 only. The 2D darkness overlay is off in 3D mode |
| Battles | The same modules behind `BattleView` |

### 7.3 Phases

| # | Phase | Agent |
| --- | --- | --- |
| 3D-1 | Foundation: vendoring and build, WebGL canvas, matched camera, ground, buildings with the visibility rules, people, light, overlays, fallback | Sonnet |
| 3D-2 | Props: every one of the 159 types | Sonnet (parallel, own file) |
| 3D-3 | Vehicles and large machines: cars, buses, signature cars, tractors, aircraft, ships, tanks, helicopters, the rocket | Sonnet (parallel, own file) |
| 3D-4 | Battles in 3D | Sonnet (parallel, own files) |
| 3D-5 | Regression, frame time, load time, Opus review | Sonnet technical, Opus |

### 7.4 What is built in 3D

Nothing yet.
