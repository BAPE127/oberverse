# The World Atlas (v0.92.0)

The world's political and physical map as data, drawn on the arms terminal's globe and on Fleet Command's chart. It is the shared base for the later Politics, War and Post-War updates (a state becomes a province; a place becomes a city). Proposal and mock-ups: `docs/WORLD_ATLAS_PROPOSAL.md`.

## What is in it

| Thing | Where | Count |
| --- | --- | --- |
| Countries | `ATLAS.countries` (name, colour, government, capital, population) | 12: Sund, Ostmark, Varn, Teshvar, Caldera, Pallas, Morrow, Lirre, Westreach, Sunmouth, Dunmere, and the Free Territories (not a country in the arms market) |
| States | `ATLAS.states` (id, name, country, `seed` [lat, lon], weight `w`, forced `biome`, `tag`) | 77 |
| Places | `ATLAS.places` (name, lat, lon, `kind`, `state`) | 131 |
| Military sites | `ATLAS.military` (army, air, naval, fort, hq) | 17 |
| Theatres | `ATLAS.theatres` (for the war update: the states where two rivals meet) | 7 |
| Rivers | `ATLAS.rivers` (`w` 1–3 and a flat `p` list of lat, lon pairs) | 266 |
| Roads | `ATLAS.roads` (pairs of place indexes and a kind: 0 local, 1 main) | 88 |

Place kinds: `c` capital · `t` city or town · `p` port · `a` airfield · `b` base · `f` fort or pass · `m` mine or oil · `r` research or industry.

## How it is made

- `src/content/atlas.js` is **generated** by `node tools/gen-atlas.mjs` from the authored lists in `docs/mockups/atlas-src/atlas.mjs` (edit names, states, places and military sites there) and the world's own geography. The generator snaps every heart, place and site to dry land, traces **rivers** (a priority-flood over a quarter-degree grid so every land cell drains to a coast; cells many others drain into become rivers; simplified to polylines; polar rivers dropped) and joins places by **road** (each place to its state's hub, hubs of a country by a spanning tree, only across dry land). The output is committed; the generator is the source of its numbers.
- `src/world/atlas.js` answers questions at runtime: `stateAt`, `countryAt`, `biomeAt`, `atlasAt`, `nearestPlace`, plus accessors (`atlasStates`, `placesOf`, `atlasRoads`…) and `atlasGrids()` (the country and state of every half-degree cell, built once). **A state is a weighted nearest-heart cut of the land**: each land point goes to the state whose heart is nearest (distance divided by the state's weight) within 22°; below 64°S everything is the Southern Ice. **Climate** (12 kinds: ice, tundra, taiga, forest, grassland, steppe, desert, savanna, jungle, mountain, volcanic, plus sea) comes from the world's own climate, height and relief, with a state's `biome` where its character demands (Teshvar is desert, Caldera volcanic).
- Nothing about the Atlas is stored in a save: it is the shape of the world. The only saved effect is that the arms market gains Westreach, Sunmouth and Dunmere the first time an older save is used.

## How it is drawn

- `src/engine/drawGlobeSurface.js` `surfaceTexture(key, palette, countries, sub, atlas=true)` bakes the Atlas texture (country tint, country and state borders). `src/engine/drawAtlasLayer.js` draws the overlay for either map from a projector: rivers, roads, places, military sites and state names, with a **zoom ladder** (`ATLAS_LEVELS`): capitals and great rivers from 0.8, state names from 1.35, main roads 1.7, ports and bases 1.9, more rivers 1.5–2.6, local roads 2.8, towns 2.5. Labels never overlap (the first claim wins; capitals first).
- Arms terminal: the **ATLAS** button (`src/ui/terminal.js`); hover gives state, country and climate, and a place's or base's kind. Fleet Command: the **Atlas** button (`src/ui/fleetCommand.js`); Fleet Command already names ports, so the Atlas leaves them out there.

## Countries and ports

- Westreach, Sunmouth and Dunmere are in `COUNTRIES` (`src/content/arms.js`): small budgets (54k, 66k, 36k), incomes (4.8k, 6k, 3k), **no rivals** and aggression 0.05, so they buy but start no wars. Their ports (`port_westreach`, `port_sunmouth`, `port_dunmere`) carry their country.
- Every port has a `state`. The home-island ports (`local`) stay `country: null` (they are Ober & Sons' own, not a market); the Atlas puts them in Sund.

## Tests

`tests/atlas.test.mjs`: every seed, place and site on land and in the state it names; every state has land and no land is unclaimed beyond a few cells; unique state and place names; every country has a capital place and a state; ports on their state's coast and in their own country; every state reachable by sea or land; rivers by land, roads across dry land within one state (local) or country (main); the Hald Reach, the clear ocean and the Marrow island; an old save loads and gains the three markets; company-name stems for the new countries.

## Known limits

- The **Sund bond merge** from the proposal is not done: Halvermouth's government bond and Sund's foreign bond remain two instruments.
- States are a nearest-heart cut, not hand-drawn borders: a few places near a border lie in the neighbouring state (the generator assigns each place the state it stands in).
- The city layer (street maps per city, zoom-level city records) is the Post-War update's, v0.106.0.
