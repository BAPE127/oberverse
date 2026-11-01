# Proposal: the World Atlas (the first stage of the War update, and the map the Politics update uses)

Status: **proposal only; no game file has changed.** You asked the war plan to **begin with a detailed world map**: regions, countries, biomes, states inside the countries, cities and other areas. This is that map. It is shared: the strategic war uses the states as provinces, the politics update uses Sund's nine states as polling regions, and contracts, ports and embassies use the places.

## 1. The pictures

| Picture | What it shows |
| --- | --- |
| `proposal-war-atlas-world.png` | the whole world: terrain at pixel level, countries, state borders, rivers, roads, capitals, ports, military sites |
| `proposal-war-atlas-biomes.png` | the same land with no borders, only biomes |
| `proposal-war-atlas-theatres.png` | the seven theatres where two rivals meet |
| `-sund.png`, `-east.png`, `-south.png`, `-west.png`, `-morrow.png` | zoomed, with state and city names (Sund and the capital; Ostmark, Varnistan and Teshvar; Caldera and Pallas; Lirre and the western free lands; the Morrow Isles and the south-east) |

Labels were kept thin and few on purpose: the world view names only countries and capitals; the zooms add states, then ports and bases, then towns.

## 2. How it was made (and why it is honest)

- **It is the game's own world.** The coastlines are the game's `elevation()` function in `src/world/geography.js`, sampled **per pixel** (no scaling of the half-degree grid, so coasts are sharp). Mountains, lowlands, shallows and sea depth come from the same function.
- **Two changes to the world.** (1) **A clear ocean** (your request after the first atlas): I removed the game's "scatter of lone islands in the open ocean" and the noise-made archipelagos (Spice Isles, Lantern Keys, Marrow Reefs, Ice Teeth), and any land piece under 15 half-degree cells unless a port stands on it. That took the world from **229 separate pieces of land to 29**. The Morrow Isles keep their islands, and the two ports on rocks (Southwind Isle and the Morrow harbours) keep theirs. (2) You chose to redraw Sund so Halvermouth is its capital. That is a single added chain of land, the **Hald Reach**: `[[53, -6, 2.2], [52.5, -12, 2.1], [51.5, -19, 2.3], [52, -27, 3.4]]` in the `LAND` list. It joins Sund's southern tip to the home island. Nothing else in the geography changes.
- **States** are a weighted nearest-seed cut of the land (a seed per state, a weight for how large it should be, a gentle warp so borders are not circles). They are *data*: each state has an id that will never change, and its seed can be moved by hand.
- **Biomes** (eleven: ice, tundra, taiga, forest, grassland, steppe, desert, savanna, jungle, mountain, volcanic) come from the game's own climate function (`biome()`), height and relief, with a state's character where it matters (Teshvar is desert, Caldera is volcanic). Latitude bands are wobbled so there are no straight lines.
- **Rivers** are computed by a priority-flood on the same terrain (every land cell drains to a coast); **roads** join each place to its state's hub and the hubs of a country, only across dry land; the faint dots are **unlabelled villages** placed on fertile land. All three are generated, deterministic, and can be cut or replaced by hand.
- **Everything is in `docs/mockups/atlas-src/`** (`atlas.mjs` is the data you edit; `make-all.sh` rebuilds every picture in about five minutes; `gen-doc.mjs` rebuilds the tables below).

## 3. What I found that you should know

- **The home island is small** and Sund is now one long island chain: about 2,600 km from Kingsfjord in the north to Halvermouth in the south-west. The capital is at the far end of its country (the king lives in the north, so that is fitting).
- **The ocean is now clear, and four places lost their land.** The Lantern Keys, the Spice Isles and the Marrow Reefs were only specks; their regions are removed from the atlas (three fewer regions). The port **Marrow Strait** (`port_marrow`) now sits at sea, 4° from the nearest land, and the Atlas release must give it a real island (or move the port). The game's own `geography.js` still has the scatter; the Atlas release would remove it there too, which moves some coastlines near ports, so the ports test needs a listed edit.
- **Sund's east tip is a short sea crossing from Ostmark's coast.** I have not yet checked that the strait is navigable by the sea-route code; that is a stage-1 test.
- **The western continent has one country (Lirre) and a great deal of free land.** That is deliberate: it is the mercenary frontier (see below).
- **Halvermouth's own ports** (Mill Road Docks, Lanternside Quay, Gullwing Point) are marked `local` and have no country today. In the new atlas they belong to Sund.

## 4. Countries, states, cities

Eleven countries: the eight the game already has, plus **three small ones promoted from the free ports at your request** (the Westreach League, the Sunmouth Isthmus Compact and the Free Harbour of Dunmere), and one **free** group. The remaining "free territories" are **not countries**: they have no embassy and no army. They are free ports, leagues, clans and empty land, and they are where small contracts and the mercenary frontier live.

### Kingdom of Sund

*Constitutional monarchy: the boy king (11) is head of state; an elected President governs.* Capital: Halvermouth (royal seat: Kingsfjord). Population: about 9 million. 9 states.

| State | Main biomes | What it is for | Places |
| --- | --- | --- | --- |
| **Halvermouth Crown District** | grassland 83%, taiga 17% | The capital: the city, the Crown Quarter, the Yards, the docks, Lanternside | Halvermouth (capital); Lanternside (port); Westbrook (city); Mill Road Docks (port); Ober Fields (mine / oil) |
| **Lariat Downs** | taiga 65%, grassland 35% | Farm country, Starling Flats aerospace park | Lariat (city); Starling Flats (industry / research); Chuckie's Mills (city) |
| **Gullwing Coast** | grassland 88%, desert 12% | Southern headland and fishing coast | Gullwing Point (port); Southmere (city) |
| **Hald Reach** | grassland 52%, desert 48% | The narrow neck of land joining the capital to the north: rail, fog, and the national base | Haldwick (city); Brine End (port); Fort Gullcrest (base) |
| **Thornmonth Isle** | grassland 49%, taiga 43% | A rock off the capital with a lighthouse and a reputation | Thornmonth (city) |
| **Sundholm** | grassland 76%, desert 21% | Royal Sund: the harbour, the royal yacht, the fleet | Sund Harbour (port); Sundholm (city); Royal Sund Naval Station (base) |
| **Middle Fjords** | taiga 84%, grassland 16% | Fjord towns and herring | Fjell (city); Norrby (port); Lindqvist (city) |
| **Skarn Highlands** | mountain 86%, tundra 12% | Granite, mines and the old pass | Skarn (mine / oil); Vik (city) |
| **Kingsfjord** | tundra 65%, ice 35% | The boy king's castle; the fishing fleet reviewed every Monday | Kingsfjord (port); Kingsfjord Castle (fort / pass) |

### The Ostmark Union

*Federal union of seven provinces, one parliament.* Capital: Hartmannsburg. Population: about 60 million. 7 states.

| State | Main biomes | What it is for | Places |
| --- | --- | --- | --- |
| **Westmark** | desert 82%, grassland 18% | Gate province: the great port, seven colours of crane | Ostmark Gate (port); Brandtburg (city) |
| **Brandtland** | grassland 46%, desert 38% | Industry belt: Brandt turbines and canals | Brandt (industry / research); Kessel (city) |
| **Hartmann March** | taiga 86%, grassland 12% | Federal province and the capital | Hartmannsburg (capital); Falkenau (city) |
| **Kesslerau** | grassland 48%, taiga 27% | Steel and the arms works | Kessler Works (industry / research); Rheinbrück (city) |
| **Rheinholt** | taiga 79%, grassland 21% | Forest province: timber and paper | Rheinholt (city); Falken Pass (fort / pass) |
| **Falkenmark** | taiga 79%, grassland 15% | The southern marches: the Halden shore and the Varn frontier | Halden Roads (port); Falkenhorst Air Base (base) |
| **Seventh Province** | taiga 83%, grassland 17% | Grey ships, grey sheds, the northern fleet | Seventh Province Naval Yard (base); Grey Harbour (port) |

### Varnistan

*Mountain republic, permanently about to hold elections.* Capital: Daghan. Population: about 22 million. 5 states.

| State | Main biomes | What it is for | Places |
| --- | --- | --- | --- |
| **Port Varn Coast** | grassland 82%, forest 14% | The only real port; election posters nineteen years old | Port Varn (port); Salt Landing (city) |
| **Orlov Highlands** | mountain 97%, grassland 3% | Passes, shepherds and old rifles | Orlov (city); Ironmark Pass (fort / pass) |
| **Daghan District** | steppe 100% | The capital district: barracks and a parliament building under repair | Daghan (capital); Tashkar (city) |
| **Ironmark Plateau** | steppe 95%, grassland 5% | Open plateau: armour country and mines | Ironmark (mine / oil); Varn Forge (industry / research) |
| **Kestrel Reaches** | mountain 64%, desert 28% | The pass to the gulf; a small military-ish harbour | Kestrel Landing (port); Kestrel Pass (fort / pass) |

### Teshvar

*Oil sheikdom of five emirates under one sheikh.* Capital: Sarkhan. Population: about 14 million. 5 states.

| State | Main biomes | What it is for | Places |
| --- | --- | --- | --- |
| **Khoral Emirate** | grassland 76%, desert 24% | Dune country and the northern oil road | Khoral (city); Oasis Nine (mine / oil) |
| **Zhan Oil Coast** | grassland 83%, desert 17% | Tankers the size of towns | Teshvar Oil Terminal (port); Zhan Wells (mine / oil) |
| **Sarkhan** | desert 58%, grassland 42% | The sheikh's city | Sarkhan (capital); Golden Guard Air Base (base) |
| **Orun Emirate** | savanna 100% | Dry hills and the eastern wells | Orun (city) |
| **Bai-Dun Golden Coast** | savanna 100% | Gold-leaf bollards and the advanced port | Golden Quay (port); Bai-Dun (city) |

### Republic of Caldera

*Volcanic republic; presidents come and go with the ash.* Capital: Calderon. Population: about 35 million. 6 states.

| State | Main biomes | What it is for | Places |
| --- | --- | --- | --- |
| **Crater Province** | volcanic 81%, savanna 19% | Built on a volcano; the capital is a cone | Calderon (capital); Ember Gap (fort / pass) |
| **Caldera Bay Coast** | savanna 100% | The warm, suspiciously warm, harbour | Caldera Bay (port); Salto (city) |
| **Northern Mesa** | savanna 100% | Plateau farms and the Verdan highlands | Mesa Verdan (city); Corvane (city) |
| **The Horn** | grassland 98%, desert 2% | The long eastern horn; a naval post on a baked headland | Horn Landing (port); Horn Naval Post (base) |
| **Ashport Coast** | volcanic 71%, savanna 29% | Everything is grey, including the tea | Ashport (port); Greyfield (city) |
| **Saltlands** | desert 90%, grassland 10% | Salt flats and the southern railway | Saltmarch (mine / oil); Southcape (port) |

### Free State of Pallas

*A free state of three coasts; under embargo.* Capital: Thessal. Population: about 6 million. 3 states.

| State | Main biomes | What it is for | Places |
| --- | --- | --- | --- |
| **Free Harbour Coast** | savanna 51%, jungle 49% | Several flags, one crane, many questions | Pallas Free Harbour (port); Aegir (city) |
| **Pallas Midlands** | savanna 59%, jungle 41% | Hills, coffee and the seat of government | Thessal (capital); Ionis (city) |
| **Coup Cove** | savanna 81%, jungle 19% | Named after the last government. And the one before. | Coup Cove (port); Krios (city) |

### Morrow Isles

*League of two hundred islands, each with a navy.* Capital: Morrow Town. Population: about 8 million. 5 states.

| State | Main biomes | What it is for | Places |
| --- | --- | --- | --- |
| **Main Isle** | savanna 55%, jungle 45% | Morrow Town and the League chamber (two hundred chairs) | Morrow Town (capital); Palmer (city) |
| **Western Harbour** | jungle 76%, savanna 24% | The one big harbour and one very tired harbour master | Morrow Main Harbour (port) |
| **Isle of Navies** | jungle 58%, savanna 42% | Every island's navy moors here | Isle of Navies (base) |
| **Reef Islands** | savanna 100% | Turquoise water and a smuggling museum | Reef Town (port); Coralline (city) |
| **Southern Tides** | savanna 64%, jungle 36% | Kauri islands and the outer fishing fleets | Kauri (city); Tideline (city) |

### Grand Duchy of Lirre

*Armed neutral duchy of six cantons.* Capital: Lirre. Population: about 12 million. 6 states.

| State | Main biomes | What it is for | Places |
| --- | --- | --- | --- |
| **Lirre Canton** | grassland 59%, desert 22% | The ducal seat and the museum of neutrality | Lirre (capital); Montclair (city) |
| **Port Canton** | grassland 51%, desert 36% | Neutral waters, neutral harbourmaster, neutral coffee | Port Lirre (port); Valmont (city) |
| **Aubrac Hills** | forest 38%, desert 38% | Hill farms; the cheese border | Aubrac (city); Cheddarmouth (city) |
| **Lorrain Marches** | taiga 93%, grassland 7% | Forest cantons on the northern border | Lorrain (city); Duke's Watch (fort / pass) |
| **Duchess Coast** | grassland 55%, taiga 45% | A pretty harbour with a museum about customs | Duchess Bay (port); Customs Museum (city) |
| **Valley Canton** | grassland 30%, desert 30% | Wide valleys: the armed-neutral reserve | Fairvale (city); Neutral Watch (base) |

### Westreach League

*A league of free ports on the far western coast; each port keeps its own harbour master.* Capital: Westreach. Population: about 3 million. 1 states.

| State | Main biomes | What it is for | Places |
| --- | --- | --- | --- |
| **Westreach Free Coast** | desert 59%, grassland 41% | A league of free ports; everything costs more | Westreach (capital); Brass Mile (city) |

### Sunmouth Isthmus Compact

*A compact of canal towns around the equatorial megaport; everything is licensed and nothing is finished.* Capital: Sunmouth. Population: about 5 million. 1 states.

| State | Main biomes | What it is for | Places |
| --- | --- | --- | --- |
| **Sunmouth Isthmus** | jungle 58%, savanna 42% | The equatorial megaport and the canal that is always almost finished | Sunmouth (capital); Isthmus Gate (city) |

### Free Harbour of Dunmere

*A crossroads harbour republic: everybody passes through and nobody admits to staying.* Capital: Dunmere. Population: about 1 million. 1 states.

| State | Main biomes | What it is for | Places |
| --- | --- | --- | --- |
| **Dunmere** | savanna 100% | The crossroads harbour: everybody passes through | Dunmere (capital) |

### Free Territories

*Free ports, leagues, clans and nobody-in-particular: no embassy, no army, plenty of contracts.* Capital: —. Population: scattered. 27 regions.

| State | Main biomes | What it is for | Places |
| --- | --- | --- | --- |
| **Coldwater Cape** | tundra 100% | Icebergs in summer; the harbour cat has a coat | Coldwater (port) |
| **Greyfen Marches** | grassland 60%, taiga 40% | Fen, fog and fur; contracts for anyone who can read a map | Greyfen (city); Oldhall (city) |
| **High Prairies** | steppe 83%, grassland 17% | Open ranch country; a compact of towns | Broadacre (city); Harrow Cross (city) |
| **Mere Counties** | taiga 100% | Lakes and logging | Meremouth (city) |
| **Redrock Flats** | desert 88%, grassland 12% | Desert country on the way to the isthmus | Redrock (mine / oil) |
| **Equator Coast** | savanna 68%, jungle 32% | Banana republic-in-waiting; the shipping lanes' southern door | Quito Bay (city) |
| **Great Cordillera** | mountain 74%, savanna 13% | The long range down the west of the continent | High Pass (fort / pass) |
| **Saltpan Coast** | desert 57%, grassland 43% | Dry coast and nitrate mines | Saltpan (mine / oil) |
| **Cape Low** | desert 81%, grassland 17% | The bottom of the continent: storms, ropes and stories | Cape Low (port) |
| **Greyhook Fjords** | tundra 100% | A cold quiet anchorage nobody admits to owning | Greyhook (base) |
| **Oldmoor Coast** | tundra 100% | Fog-bound; every boat is called Mary | Oldmoor (port) |
| **Frostbay** | ice 100% | Open three months a year | Frostbay (port) |
| **Ice Teeth** | ice 71%, tundra 29% | Rocks and seals | — |
| **Greenmoor** | ice 100% | An arctic island; the northern edge of the sea lanes | Greenmoor (city) |
| **Windfen Plains** | grassland 52%, taiga 48% | The northern plains' west: fen and railway | Windfen (city) |
| **Hollow Steppe** | grassland 70%, steppe 30% | The great grass: clans, herds and caravans | Hollow Well (city); Caravan Cross (city) |
| **Yellowfen** | steppe 96%, grassland 4% | Marsh and river towns | Yellowfen (city) |
| **Eastwatch Coast** | taiga 90%, grassland 10% | The northern route's last stop before the ice | Eastwatch (port) |
| **Far East Peninsula** | desert 93%, grassland 7% | A long peninsula pointing at nothing in particular | Far Light (port) |
| **Dustmark Basin** | grassland 83%, desert 17% | The great dry basin between Teshvar and the steppe | Dustmark (city) |
| **Cinder Hills** | mountain 78%, grassland 16% | Old volcanoes, new mines | Cinder Mine (mine / oil) |
| **Frost Barrens** | ice 100% | Arctic island; empty, which is its point | — |
| **Coral Coast** | savanna 100% | The south-eastern continent: coral on one side, dust on the other | Coral Sound (port); Redland (city); Bluewater (city) |
| **Southeastern Outback** | grassland 81%, desert 19% | Red interior; mining and long straight roads | Outback Junction (mine / oil) |
| **Meridian Free Zone** | savanna 100% | A gleaming free port on the meridian line; dock robots with union representation | Meridian Free Port (port); Applied Sciences (industry / research) |
| **Southwind Isle** | ice 100% | A rock, a hut, a pier. The pier is new. | Southwind (port) |
| **Southern Ice** | islands | The polar continent: nobody lives here, which does not stop people claiming it | — |

### Military sites on the strategic map

| Site | Owner | Kind |
| --- | --- | --- |
| Fort Gullcrest (national base) | Kingdom of Sund | hq |
| Royal Sund Naval Station | Kingdom of Sund | naval |
| Kingsfjord Coastal Battery | Kingdom of Sund | fort |
| Seventh Province Naval Yard | The Ostmark Union | naval |
| Falkenhorst Air Base | The Ostmark Union | air |
| Hartmann Armoured Depot | The Ostmark Union | army |
| Kestrel Pass Fortress | Varnistan | fort |
| Daghan Barracks | Varnistan | army |
| Golden Guard Air Base | Teshvar | air |
| Oil Terminal Garrison | Teshvar | army |
| Crater Command | Republic of Caldera | hq |
| Horn Naval Post | Republic of Caldera | naval |
| Coup Cove Garrison | Free State of Pallas | army |
| Isle of Navies | Morrow Isles | naval |
| Neutral Watch | Grand Duchy of Lirre | fort |
| Duke's Watch | Grand Duchy of Lirre | fort |
| Greyhook anchorage | Free Territories | naval |

### Theatres (where two rivals meet)

| # | Theatre | Between | Kind | States | Note |
| --- | --- | --- | --- | --- | --- |
| 1 | **The Halden Front** | The Ostmark Union / Varnistan | land | Falkenmark, Port Varn Coast, Orlov Highlands | The one big land front: the Halden shore road and the Falken marches. |
| 2 | **The Northern Sea** | The Ostmark Union / Kingdom of Sund | sea + air + landing | Westmark, Seventh Province, Sundholm, Hald Reach | Ostmark's northern fleet against Sund's coast; landings on the Hald Reach. |
| 3 | **The Kestrel Theatre** | Varnistan / Teshvar | mountain + desert | Kestrel Reaches, Khoral Emirate, Zhan Oil Coast | The pass and the gulf: no armies yet, but every oil convoy passes it. |
| 4 | **The Rift** | Varnistan / Republic of Caldera | sea + landing | Daghan District, The Horn, Caldera Bay Coast | Across the southern sea: landings, volcanoes and the Horn. |
| 5 | **The Grey Ocean** | Republic of Caldera / Free State of Pallas / Grand Duchy of Lirre | sea + air | Ashport Coast, Free Harbour Coast, Port Canton | Long-range: convoys, blockade and the Pallas embargo. |
| 6 | **The Oil Belt** | Teshvar / Morrow Isles | sea + air | Bai-Dun Golden Coast, Western Harbour, Main Isle | Tankers against two hundred navies. |
| 7 | **The Free Marches** | Free Territories | contracts | Greyfen Marches, High Prairies, Hollow Steppe, Equator Coast, Southeastern Outback | No flag, no army: where small contracts and mercenary work begin. |

Totals: 76 states and regions, 130 named places, 17 military sites, 7 theatres.

## 5. How the rest of the game would use it

- **Strategic war**: states are provinces; theatres group them; the places are where bases, ports, airfields, passes and oil sit; the military sites are the starting garrisons.
- **Politics**: Sund's nine states are the polling regions.
- **Shipping and ports**: every port gets a `state` (a one-line data change); sea routes are unchanged except where the Hald Reach changes a coast.
- **Embassies and contracts**: a country's embassy offers contracts in its states; the free territories offer frontier contracts.
- **Generated companies**: a company's home becomes a state, not just a country.
- **Economy**: control of a province feeds the existing geo event severity and arms demand (the arms market reads provinces, not a bare list of rivals).

## 6. The atlas release (v0.92.0)

What it would contain: the one added chain of land, the removal of the lone-island scatter and the four noise archipelagos from `geography.js`, and an island for Marrow Strait; `src/content/atlas.js` (countries, states, places, military sites, theatres); a `state` on every port and a Sund country for the home-island ports; **three new country records** in the arms content (Westreach, Sunmouth, Dunmere: budget, income, wants, aggression, rivals) with their ports moved from "free" to their country; an **Atlas** page on the arms terminal's globe and Fleet Command (state borders, names, cities, biomes on hover); documentation. **No other gameplay changes.**

Knock-on effects of three more countries, so nothing surprises you: the arms market gains three buyers; generated companies gain three home countries; the foreign bond list gains three issuers (and Sund's merges into Halvermouth's); the geo events can involve them. Tests that count "eight countries" will be edited and listed. I will keep the three small (low budget and income) so the arms trade does not change character.

Tests: every seed and place is on land; every state has land; every country has a capital; no two places share a name; ports are on the coast of their state; every state is reachable by sea or land; every list that counts countries now has eleven; old saves load; the existing geography and ports tests still pass (with a listed edit where the home-island ports change country).

## 7. Questions still open

1. **Is Sund's shape right?** It is now a long chain. You may prefer the Hald Reach shorter or the home island nearer Sund.
2. **Are Westreach, Sunmouth and Dunmere the right three?** I chose them as the biggest free ports. Others that fit: the Meridian Free Zone (a gleaming free port on its own island), Cape Low, Coral Sound.
3. **Names and extra states**: the data is one file (`atlas.mjs`).
4. **How detailed in-game?** The Atlas page can start at state level (76 regions) with cities, and add rivers and roads later. Do you want rivers and roads in the game at all, or only as this mock-up's decoration?
