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
| Ground, water, flat props, prop shadows, skid marks, decals, fields | The existing painters, unchanged, inside the ground transform |
| People, trees, lamps, small props | Upright sprites (billboards) at the projected ground anchor |
| Walls and solid buildings | Extruded from the tile grid (2.3) |
| Boxy and linear props (desks, counters, fences, belts…) | Phase 4: sheared or rebuilt per category; billboards until then |
| Cars and other vehicles | Phase 5: the existing top-down sprite inside the ground transform, stacked a few pixels high with darkened lower layers (sprite stacking), cached per model, colour and heading |
| Text, lighting, overlays | As now, through `toScreen`; room lights become diamonds |

### 2.3 Depth sorting

Everything upright is an item with a depth key `d = wx + wy` at its ground anchor; items are drawn in ascending `d`. This is exact as long as no item is wider than about half a tile along the ground, so large things are cut into pieces that each carry their own key:

- **Roofs** (any horizontal surface at height H): painted once in iso into a cached canvas, drawn as horizontal strips 16 px tall; a strip's key is the depth of the roof points it shows.
- **South and east faces**: painted once as a flat facade, drawn sheared as vertical strips 16 px wide; key = depth at the strip's middle. Tall faces are also cut every 32 px of height so the fade (2.4) is local.
- **Interior wall tiles** (`W` in an open room): one extruded column per tile, key = the tile centre's depth.

Why 16 px: an actor's collision box keeps its feet about 8 px from a wall and its sprite is about 14 px wide, so a strip of at most 16 px is never both in front of one actor and behind another that overlaps it on screen.

### 2.4 Building visibility

Each building has a state the renderer owns (never saved, never read by the simulation):

| State | When | Drawn |
| --- | --- | --- |
| **Roofed** | Default | South and east faces at full height, roof on top. The interior map (floor, props, people) is not drawn |
| **Open** | The player (or the driven car) is on the building's interior map | No roof. North and west walls at one storey showing their inner faces; south and east walls and partitions cut to a low kerb; floor, props and people drawn. Animated over about 0.2 s |
| **Faded locally** | A roofed building's pieces lie in front of the focus (key greater than the focus's) and within about 110 px of it on screen | Those strips fade towards about 15% opacity, nearest most: a see-through hole that follows the player. The rest of the building is untouched |

NPCs and vehicles are ordinary items: hidden behind buildings by the sort, visible through the hole, hidden inside roofed buildings, visible inside an open one. Upper tower floors stay separate `aloft` maps: on one, only that floor is drawn, over the city below. Building height comes from `b.tower` (storeys), else from size and kind; data fields `storeys` and `roofKind` may be added to buildings later without a save change.

### 2.5 Gameplay stays where it is

- **Movement**: the UI rotates the input vector 45° before `game.update` (screen-right = world `(+x, −y)`), so keys follow the screen. Speed, collision, doors and `player.facing` logic are untouched.
- **Sprite facing** is chosen by the renderer from the screen direction of velocity (or of `facing` when still); it does not write `facing`.
- **Aim**: mouse → `renderer.toWorld` → the same world aim vector combat already uses. Bullets, hits and auto-aim are unchanged.
- **Driving**: unchanged (controls are relative to the car).
- **Wrath**: mechanics untouched. The cutscene is drawn as a stage anchored at the projected position of its focus; any deeper restaging is art work, not logic.
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

Nothing yet (plan only, 2026-11-12).
