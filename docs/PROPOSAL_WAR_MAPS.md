# Proposal: mission maps from the atlas, real buildings with floors, better cars and pixel-style effects

Status: **proposal; nothing in the game has changed.** All pictures are **target art** drawn with the game's own ground, building, prop and people code plus mock-only modules in `docs/mockups/src/war/` (`g_*.js`, `g*.html`). Numbers are starting figures.

Pictures (`docs/mockups/`): `proposal-war-mission-maps.png` (20 generated maps), `proposal-war-map-trench.png`, `-map-compound.png`, `-map-city-ostmark.png`, `-map-village.png`, `-map-forest.png` (close-ups with troops and effects), `proposal-war-buildings-floors.png` (roofs, floors, five national styles, the floor you are on), `proposal-war-cars.png`, `proposal-war-fx-pixel.png`.

## 1. Buildings: roofs and floors until you go in

- **Outside** a building is a roof you look down on plus a facade with **one row of windows per floor** (12 art px per floor, 2 px per art pixel), a door, a sign and an awning on shops, the game's 1-px ink outline, the sun from the upper left, and a street shadow that gets longer with height.
- **Inside**: when your force enters, the roof and every floor above lift away and you see **only the floor they are on**, drawn by the game's own roofless-building painter with its furnished rooms (ground floor a shop or hall, upper floors flats or offices, a stairwell in the corner, a badge "FLOOR 3 OF 3"). Move up the stairs and that floor replaces the last one.
- **Height advantage** (section drawing in the picture): each floor adds about **+3 tiles of sight**, weapons reach further from height, a window and a floor edge are cover, the enemy below sees only a facade, and roofs and low walls stop blocking line of sight. **The cost:** a shell or a collapse takes the floors above it, and stairs are the only way down.
- Damage is the existing wall-state model (intact, damaged, breached, rubble) drawn on the roof (a hole, burn marks) and the facade; destroyed floors are removed from play for good.
- **Rule for the generator:** a building of *f* floors needs at least `ceil((12 f + 4 + 14) / 16)` tiles of depth, so tall buildings get deeper footprints; `minTiles(f)` in `g_roof.js`.

### Five national styles (data, not code)

| Style | Used for | Roofs | Walls | Windows | Floors |
| --- | --- | --- | --- | --- | --- |
| Halvermouth | Halvermouth, Westreach | flat, mansard | red and tan brick | square | 2–8 |
| Ostmark | Ostmark Union, Lirre | steep red-tile gables and hips, dormers, chimneys | cream plaster, dark timber | shuttered | 2–4 |
| Varnistan | Varnistan, Teshvar, Caldera | flat sand roofs, domes, crenellated parapets | sand and ochre | arched | 1–3 |
| Sund | Sund, Pallas | steep tarred gables | painted planks (red, yellow, white, blue) | cross-bar | 1–3 |
| Windfen | Windfen League, Morrow | flat, antennas | concrete panels | ribbon windows, balconies | 4–9 |

(The other atlas countries map to the nearest of the five until they get their own; adding one is one more row of data: roof shapes, wall colours, trims, window type, floor range.)

## 2. Cars

Ten models painted on the art-pixel grid with a ink outline and a hard shadow: **sedan, hatchback, taxi, police car, van, ambulance, pickup, box truck, bus, military jeep**. Wheels stand out of the body, glass glints, lights glow, plates and mirrors show. A car is painted once facing east and turned by whole quarter turns (exact, no smoothing), then cached by (model, colour, direction). Cars are items in the draw list (not props), so they can move, be hit, burn and leave wrecks.

## 3. Fire, smoke and explosions in the game's pixel look

Particles are drawn at art-pixel resolution on a transparent layer and then **quantised**: fire onto a **7-colour ramp** (deep red to near white), smoke onto **5 greys** (dust onto 5 browns, tracers onto green and orange ramps), translucent areas **dithered** with a 4×4 ordered pattern, and every blob given a **1-px dark rim**, like the ink outline on the game's sprites. Stages: flash, fireball, peak, cooling, smoke head; fire in frames; muzzle flashes; tracers; rocket trails; dust; a wall burst; a smoke screen; an air-strike stick. Cost is per live particle with a cap (about 600) and automatic thinning; the layer is half-resolution, so it is cheap.

## 4. The map generator

`generate(kind, { biome, style, seed })` returns a **tile grid, roofed buildings, props, cars and ground decals**; `build()` paints it with the game's own ground painter, grades it for the biome, draws trenches, wire and craters, and returns a depth-sorted draw list. Same seed, same map (saved with the mission).

| Recipe | Size | What it builds |
| --- | --- | --- |
| **Trench line** | 120 × 74 | two front lines with firing bays, support lines, communication trenches, saps into no man's land, dugouts, barbed wire, churned ground and craters, a ruined farm, dead trees, aid tents and ammunition dumps. **Same recipe in every biome.** |
| **Compound raid** | 96 × 72 | a walled compound with a gate, four guard towers, a main house (3 floors), barracks, garage, store, generator, helipad, water tower, vehicles, an outer fence, an access road, fields |
| **City** | 110 × 80 | a grid of avenues and streets, blocks of two rows of buildings and a yard, parked and moving traffic, lamps, fountains, booths; one **architecture per country** |
| **Forest battle** | 120 × 76 | dense woods from a noise field, clearings, trails, a stream with a log bridge, a logging camp with cabins and lumber, hunting lodge, undergrowth, canopy shade |
| **Fields and villages** | 132 × 84 | a patchwork of crop fields with hedgerows, tracks, two villages around greens (farmhouses, a church, a well or fountain, a tractor, a water tower), a windmill, a stream and a ford |

**Biomes** (the atlas's own): temperate (forest, grassland), snow (tundra, taiga), desert, steppe (dry grass, savanna) and wet (jungle). A biome changes the ground base tile, the grade (snow whitens, steppe yellows, wet darkens), which trees appear (none in desert, pines only in snow), the sandbag and earth colours, and the ground's mood. It never changes the rules.

### How an atlas place picks its map

| Atlas place | Biome | Recipe(s) offered | Style |
| --- | --- | --- | --- |
| a city (`c`) or town (`t`) | from its biome | City; village for small towns | its country's |
| a military site or fort | from its biome | Compound raid | its country's |
| a province on the front line (contract: "hold the crossing") | from its biome | Trench line if the front is static, else Fields and villages | its country's |
| woods, hills, or mountains | forest, taiga | Forest battle | nearest village style |
| plains and farmland | grassland, steppe | Fields and villages | its country's |
| a port | coast | City (dock area) | its country's |

The **province's terrain** and the **engagement's type** choose among the recipes; the **seed** is the province id plus the engagement id, so replaying a mission gives the same ground, and a battle that was fought leaves its craters, wrecks and rubble (the saved destruction).

## 5. Release placement

| Release | Adds |
| --- | --- |
| v0.115.1 (9b) | the **pixel fire and smoke layer**, the **car models**, the **roofed building painter** with the floor view, **no rule changes** |
| v0.116.0 (10a) | the tactical engine on that renderer; **City and Fields-and-villages recipes**; floors, stairs and the height bonus |
| v0.116.2 (10c) | **Trench, Compound, Forest** recipes; biome grades; national styles for the other countries |
| v0.117.0 (11a) | atlas places pick recipe, biome, style and seed |

## 6. Honest limits

- The walls of the compound use the game's wall tile and look plain (no wall faces); a proper compound wall piece would be one more painter.
- Interior rooms repeat (the game's shop, house and office layouts); real variety needs more interior types.
- The ground is the game's current tile art; trenches, craters and wire are drawn over it as decals and are not yet destructible per tile.
- Cars are stationary in the pictures; their driving, burning and wrecks are not drawn.
- Entering a building is drawn as stills; the roof-lift animation is not drawn.

## 7. Questions

1. Should **ground floors** of tall buildings stay visible (for the street fight) when a force is above, or should the whole building show only the player's floor?
2. Should the **trench map** become **destructible per tile** (shell hits collapse a section of trench) or keep craters as decals?
3. Which **other countries** need their own architecture first?
