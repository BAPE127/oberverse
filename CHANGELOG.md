# Changelog

All notable changes to the Oberverse. Versions follow `MAJOR.MINOR.PATCH` (see docs/DEVELOPMENT_WORKFLOW.md).

## [0.26.0] — 2026-10-15 — "Drydock" (development build)

Release 2 of 3 from the owner's terminal and shipbuilder brief ("the ship builder should feel like the ship builder in No Man's Sky or Starfield … parts should be detailed and ships should be detailed and not be small pixels"). Chosen in interview: a big side profile, parts snapping onto glowing attachment points from a tray. See docs/SHIPBUILDING.md.

### Added
- **Detailed side profiles** (`src/engine/drawShipProfile.js`): every hull family (cargo with bulb bow, small craft, inflatable skiff, warship, sail with castles, gun-ports and bowsprit, futuristic hydrofoil with foils and glowing trim) with plating or planking, antifouling, boot-top, sheer stripe, propeller, rudder, bridge tiers with glass, lifeboat and lit mast; and a drawing for each of the 35 parts (`PROFILE_PART`), animated (smoke, fans, radar, sails, glow). Stock ships get a standard fit (`fitFor`) so they're drawn as fully as custom ones.
- **The shipbuilder** (`src/ui/shipBuilder.js`) in Fleet Command's Shipyard: hull cards; the profile on a blueprint stage with numbered glowing attachment points; a tray of part cards by family (fit reasons, limits, store counts); drag-and-drop onto points (snap), between points (swap), off the ship (remove), click to fit, double-click or Delete to remove; a side panel with points/weight/power/mounts meters, the class's requirements, performance bars, abilities, paint, name, yard, the bill, Buy missing parts and Lay the keel. Slips & yards page with the build drawn taking shape; a parts store with every part drawn.
- **Layouts**: a design's `layout` (the slot of each part; gaps allowed) is saved with builds and launched designs (`Shipyard.layoutOf`, `fitOf`, `look.fit`). It changes only the look — a broken or missing layout means "in order".
- Tests: `tests/shipbuilder.test.mjs` (4).

### Changed
- Fleet Command's ship pictures (fleet, buy, ship card, at sea, in port) are the detailed side profiles.

### Removed
- The old tabbed logistics terminal (`src/ui/logistics.js`) and its styles; Fleet Command replaced it in v0.25.0.

## [0.25.0] — 2026-10-15 — "Fleet Command" (development build)

Release 1 of 3 from the owner's terminal and shipbuilder brief ("feels too much like a spreadsheet … should control the entire screen … easier to use"). See docs/FLEET_COMMAND.md.

### Added
- **Fleet Command** (`src/ui/fleetCommand.js`): a full-screen, map-centred ops room replacing the tabbed logistics terminal. A live chart (drag, zoom, wrap; land sampled every half degree with glowing coasts; pulsing danger zones; animated routes; ships drawn as ships along their course; port work badges; tooltips); a top bar with ⏩ 1 h / 6 h / ⏭ next event that runs the real clock visibly; a left rail (Map, Fleet, Buy, Shipyard, Ledger); a drawer for the selection; a log ticker.
- One-click orders: contract cards with the best ship pre-chosen and protection folded away; mission cards with the best team pre-chosen; "Send to…" then click a port, with a live route/time/cost preview. Yards berth choice on each of your ports.
- Simulation helpers: `Logistics.bestShipFor`, `suggestEscort`, `idle`, `opportunities`, `nextEvent`; `Missions.bestTeam`.
- Tests: `tests/fleetcommand.test.mjs` (5).

### Changed
- `PANELS.logistics` (and the new `PANELS.fleet`) open Fleet Command; the tablet's Ships app launches it; the v0.24 designer and parts store are shown inside its Shipyard sheet for now.

## [0.24.0] — 2026-10-15 — "Build Your Own" (development build)

Stage 4 of the shipping expansion (the master brief's stages G and H). The expansion's planned features are complete; playable naval combat remains a future goal (see docs/LOGISTICS.md).

### Added
- **The shipyard** (`src/systems/shipyard.js`): Mason's Os build one at a commercial-or-bigger port (`SHIPYARD`): quoted with the crew's goodwill discount and speed-up, paid once, built over days with daily progress reports, persisted; Mason's topic "Could your crew build me a shipyard?"; at Mill Road Docks, scaffolding then a slipway (`slipway` prop) showing the ship on the slip.
- **The custom shipbuilder**: 12 hulls (`HULLS`) and 35 parts (`COMPONENTS`) with technology, kind, slots, weight, power, mounts, maximums, prerequisites and per-class requirements, all validated by `Shipyard.validate`; stats computed from parts (`compute`); a parts store (`buyComponent`, `buyMissing`); the advanced licence (`TECH`); `commission` reserves and consumes parts once and charges hull + labour once; `cancel` returns parts and refunds half; launch creates exactly one vessel (waiting for a berth if needed). Saved designs are inputs only; `Logistics.model()` recomputes custom ships from content.
- Custom ships drawn with their parts on deck in slot order, in your colours (`drawShips.js`).
- Terminal: Shipyard page (yards, builds on the slips, the designer with a live preview, slot order, paint, stats, problems and the bill) and Parts page (licences and the store). Tabs wrap.
- Validator: hulls and parts (families, tech, prerequisites, bonuses, and that every hull can be fitted out with its required parts).
- Tests: `tests/shipyard.test.mjs` (8).

## [0.23.0] — 2026-10-15 — "Here Be Pirates" (development build)

Stage 3 of the shipping expansion (the master brief's stage F).

### Added
- **Piracy** (`src/systems/piracy.js`, `Logistics.voyageRisk`): pirate waters (`PIRATE_WATERS`), war zones and blockades from the arms market; risk by danger-weighted distance, cargo value, speed, stealth, escorts, guards and fleet bonuses; worst case capped by the route's most dangerous water (safe water: delays only; escorted: never captured). Encounters rolled at departure and stored as voyage events; outcomes repelled / chased / ransom / cargo seized / captured, settled once (`Logistics.pirates`, `loseCargo`) — contracts fail or pay insurance, arms shipments settle as hijacked through the market.
- **Convoys and services**: escorts (`quote`/`assign`/`armsQuote`/`Market.ship` take `escorts`), guards and cargo insurance; escorts wait while the cargo loads, sail at the convoy's speed, share its events and take a share of any fight.
- **Warships** (`WARSHIPS`, Kestrel Naval Surplus): twelve ships in four families with combat numbers, holds only where real, port restrictions and fleet bonuses (`BONUSES`, scoped fleet/port/group, never stacking).
- **Missions** (`src/systems/missions.js`, `MISSION_TYPES`): seven types offered daily at your ports; fitness from weighted stats; an estimate shown, the outcome rolled at the start and stored; vessels `mission` status; rewards once; deterrence suppresses a pirate water, port protection safeguards a port.
- Logistics terminal: Missions and Warships pages; protection and escort choices with risk on every quote; route risk on every contract; danger zones on the chart; combat stats and bonuses on Fleet. Arms terminal: guards and escorts for own-ship exports, with the risk.
- Ships drawn for every warship hull (sails and yards, turrets, a skiff).
- `tools/validate-content.mjs` checks the logistics registries (ports, ships, classes, bonuses, contract and mission requirements).
- Tests: `tests/naval.test.mjs` (10).

### Changed
- Naval bases berth size-4 ships. Contract types no longer carry a fixed risk label; the route decides.

## [0.22.0] — 2026-10-15 — "Own Bottoms" (development build)

Stage 2 of the shipping expansion (the master brief's stage D and the rest of E).

### Added
- **Arms exports in your own ships**: `Market.ship({ …, vessel })` → `Market.shipOwn` validates the order, cage, licence, hostility, budget and `Logistics.armsQuote` (docked at Mill Road Docks, free, capacity, range, berth, arrears, money) before changing anything; then removes the crates, reserves the budget, records the shipment (`vessel`, no fee, uninsured) and calls `Logistics.carryArms` (pays running costs and fees, loads, rolls customs for embargo runs). On arrival `Market.settleOwn` settles once through the same `Market.settle` path the shippers use. The market no longer settles own-ship shipments on its own clock; their ETA follows the voyage's delays.
- Arms terminal: your ships in the FILL form (with quotes and reasons), in the contact list, and on the globe (export voyages on real sea lanes; other Ober & Sons voyages in cyan, hoverable).
- Richer voyage log (departure, duration, cargo, delays) on the logistics terminal's Fleet page; arms cargo shown on Fleet and Chart.
- Tests: 4 more in `tests/logistics.test.mjs` (own-fleet exports pay once and skip the freight fee; validation changes nothing; external shippers unchanged; an embargo run's customs fate survives a reload).

### Changed
- `Market.resolve` split into `resolve` (rolls an external shipper's fate, same RNG use as before) and `settle(shipment, fate)`.

## [0.21.0] — 2026-10-15 — "Ober & Sons" (development build)

Owner's request: a player-owned logistics and shipbuilding business bought from Captain Ober (a master brief in eight stages), with Captain Ober's photo ("a very stereotypical sailor"). Owner's answers: import Captain Ober now (store the photo); old-salt voice; no relation to Ober's Oil; retiring; based at new docks at the Yards; he/him; kraken Wrath; jolly from the start; an old smuggler about your arms business; company **Ober & Sons Maritime**, his ship the **Salty Ober**; ship the brief as several releases. This release is the brief's stages A–C plus the core of E (the terminal and tracking); stages D (own-fleet arms exports), F (piracy, warships, missions) and G (the shipyard) follow.

### Added
- **Captain Ober** (`npc_ober`, imported, protected): portrait, a new `captain` peaked-cap hair style, old-salt dialogue (selling the company, his sons, his smuggling past, superstitions, advice, the kraken), relationships with Lucas and Mason, motif "Hoist Away" (`motif_ober`), and a **kraken** Wrath theme (flooding cobbles, tentacles, a whirlpool, the kraken's eye; foghorn, shanty, waves). Routine: harbour office, the quay, a pipe by the bollards, asleep aboard the Salty Ober.
- **The Yards docks**: Mill Road Yards extended south (64×62 authored): Quay Road with turning circles, the quay apron, cranes, bollards, lamps, three berths (`shipberth` props that draw your ships), the Ober & Sons Maritime harbour office (interior with the logistics terminal) and the Salty Ober (moored tug with a cabin interior).
- **Logistics** (`src/systems/logistics.js`, content `src/content/logistics.js`): buying the company (all-or-nothing, once); 34 ports in five types, up to 30 owned; ten cargo ships in five classes from a brokerage; vessel records with a validated status machine; contracts (seven types, eleven clients) posted daily per owned port, with quotes (arrival, on time, costs, profit), loading, voyages, late pay and penalties; delays rolled at departure and stored; condition and repairs; daily upkeep with arrears that hold sailings; a ledger and reports; tablet notifications (`ships` app).
- **Sea routes** (`src/world/seaRoutes.js`): A* over the globe's 3° sea cells, smoothed and cached; ports sit on coasts; every port reachable.
- **The logistics terminal** (`src/ui/logistics.js`): Overview, Chart (a sea chart with ports, routes and ship positions from the clock; hover and click), Fleet (details, rename, show at berths, repair, send), Ports (berth display, owned ports, ports for sale), Contracts (offers, assign with quotes, cancel), Brokerage (by class, with previews), Finances, Reports — in the harbour office and as the tablet's **Ships** app.
- Ships drawn top-down from their look (`src/engine/drawShips.js`: coaster, runner, freighter, container, heavy-lift, bulk, starwake, tug).
- Generic `panel` effect/interaction result (`{ panel: { name, … } }`) for dialogue that opens a panel.
- Tests: `tests/logistics.test.mjs` (13), `tests/character_ober.test.mjs` (5).

### Changed
- Globe geography moved to `src/world/globe.js` (shared by the arms terminal, the logistics chart and sea routes).
- A dialogue that opens a panel hides itself while the panel is open and rebuilds its topic menu afterwards.

## [0.20.0] — 2026-10-15 — "Streets" (development build)

Owner's request: a general world update — NPCs should prefer pavements and crossings; pavement props should not be solid for the player; cars should feel like they turn; streets felt too small for cars; no U-turns at map edges; stop lights to make junctions feel alive (not illegal to run them); a weird beeping noise; fewer cars; roads that lead nowhere ruin the immersion — make the map feel more real. Owner's answers: roads 4 tiles wide (one wide lane each way); rework the existing maps (every road joins a network, roads only leave a map through gates, map edges are real boundaries; no new districts); traffic drives off at the edges and others drive in; cars and the bus obey the lights, people use the walk signal, running a red is not a crime.

### Changed
- **Four-tile roads** (`src/world/widen.js`): maps are still authored with 2-tile roads; at load `widenAll` duplicates the first line of every road listed in `ROADS` twice, so each is 4 wide, and shifts everything after it (`fx`/`fy`; buildings, areas, spots, props, doors — gates on a road are copied across it; crosswalks stretch). Content authored in old coordinates (transit, parked cars, dealers) goes through `shiftPoint` / the shifts. Halvermouth is now 120×90.
- **The road network** (maps): Halvermouth gains a ridge cliff and Ridge Road along the top, the sea wall to the west and cliffs to the east (gaps only at the gates), Quay Road along the bottom, turning circles with statues/fountain at the old dead ends, and Crown St / Grand Ave ending at the car-park entrances; Lanternside's Lamplighter Lane ends at Lamplighter Circle and the quay at a turning circle with bollards; the Ober Fields' county road ends at Wellhead Circle under the escarpment; the Yards' gate lines up with Mill Road.
- **Transit** (`src/content/transit.js`, `src/systems/transit.js`): built from authored lanes after widening (`buildTransit`); routes have rounded corners (`Route`, quadratic curves); traffic is 7 cars — two block rings, two through-the-city routes and the coast road — and open routes despawn at the far gate and respawn after their `gap`; no U-turns.
- **Honking**: only after 3 s blocked by you, at most once per car per 15 s and once every 9 s overall, and quieter (`sfx_horn` `{quiet}`).
- **Car handling** (`Vehicles.physics`): steering ramps in (`car.wheel`), travel direction lags the heading (`car.travel`, `car.slip`; looser on the handbrake) and a slide scrubs speed; front wheels drawn steered; skid marks (`Vehicles.skids`, drawn by the renderer, fade in 14 s).
- **Audio**: `amb_city` no longer plays synthetic horn beeps; the siren follows only cruisers that are chasing or searching.

### Added
- **Traffic lights** (`src/world/lights.js`: `lightState`, `walkSignal`; 22 s cycle, per-junction offset): 12 Halvermouth junctions and Lamplighter Lane × Gullwing Road, four `trafficlight` props each (heads, walk/wait boxes). Traffic and buses stop for red and late amber (`Transit.redAhead`); NPCs wait at the kerb for WALK (`NpcSystem.waitForSignal`; not when on a call, fighting or fleeing). No crime for running a red.
- **Pavements**: solid props standing entirely on pavement are walk-through for people (`GameMap.carBlock` — cars still collide); pathfinding cost ×6 on carriageway and ×1.1 on crossings (`GameMap.walkCost`), so people keep to pavements and cross at crossings.
- **Old saves**: `Game.widenSave` shifts the player, NPCs and cars on widened maps for saves older than 0.20.0 (`olderThan` in `src/core/version.js`) and resets the buses; `CONTENT.roadShifts`.
- Tests: `tests/streets.test.mjs` (11 tests: widening, four-tile roads, roads end at gates, walk-through props, pavement routing, lights, stopping at red, through traffic, waiting for the green man, car handling, old saves); transit, world and quest tests updated for the new coordinates.

## [0.19.0] — 2026-10-14 — "By the Crate" (development build)

Owner's request: production for export in crates rather than hundreds of single weapons; orders of 5–50 crates; single weapons and ammo for the player. Owner's answers: stations make whole crates; every crate is one standard lot; countries post orders of 5–50 crates; singles and ammo at a workbench you use yourself.

### Changed
- **Crates** (`CRATE`, `CRATE_ITEMS` in `src/content/arms.js`): twelve crate items (`item_crate_<recipe>`), one standard lot each — `CRATE.units` (5) weapons' worth of value. The weapon recipes (same ids, so placed stations carry on) now make crates from 5× the inputs in 3× the time. The production report, belts, the cage and Lucas all handle crates.
- **Orders** (`src/systems/market.js`): every day each country posts purchase orders (1–2 at peace, 3 at war) of **5–50 crates** of one weapon — weighted by its wants and towards what your works can make — at a locked price per crate (today's price + up to 15%), within its budget; they expire in 3–7 days. `Market.ship({ wh, order, shipper, insured })` fills an order whole from the export cage; delivery marks it delivered, losses mark it lost. Country budgets and income ×6 for crate-sized orders; saturation 0.012 per crate.
- **Terminal Market tab**: open orders (country, crates, price per crate, total, expiry, war/embargo, cage count) with FILL → shipper, insurance, fee and SHIP; the export cage; buyers with their order counts. The globe's country tooltip lists open orders; clicking a country shows only its orders.
- Lucas's wholesale budget 2,500 → 15,000 a day.

### Added
- **The armourer's workbench** (a prop in every arms works; `BENCH_RECIPES`, `Arms.benchCraft`, panel `armsbench`): hand-make one weapon (pistol to Kestrel drone) or a box of ammunition (9mm ×20, shells ×8, rifle ×10, an RPG rocket) from raw parts on the loading dock; game time passes (15–150 minutes); research locks as at the stations; "Order missing" orders what you're short.
- Debug command `crates [type] [n]`.
- Tests: crate content and order limits, filling orders, the workbench, `crates` (market and arms tests rewritten for crates).

## [0.18.0] — 2026-10-13 — "Hot Pursuit" (development build)

Owner's request: "Can you also add police chases too?"

### Added
- **Police chases** (`src/systems/pursuit.js`): while Wanted, outdoors, and seen in the last 60 game minutes, cruisers spawn out of view on a road 16–28 tiles away — up to one per star. They're real cars (`owner: 'police'`, `chase: {...}`, model `cruiser`) driven by the shared car physics, steering along an A* route over tiles a car fits through (roads cheapest; repathed every 0.6 s), straight at you within 8 tiles; they back up and repath when stuck, follow you across seams but not through region gates, brake for pedestrians (never hurting anyone), and drive through traffic (which "pulls over"). ★: no reckless speeds; ★★★: they ram (aiming ahead of your car; contact halves your speed and knocks you off line).
- **Getting caught**: in a car, stopped or pinned (judged by actual movement) beside a cruiser for 2 s → pulled over; on foot, a cruiser within 150 px for 1.6 s → cuffed; on the bus, at its next stop → arrested. The bar under you reads "PULLED OVER — drive!".
- **Getting away**: out of every cruiser's sight for 12 s → they search your last known position for 20 s, then leave; no new cruisers until someone sees you again. Cruisers left in another region search and give up. Wanted cleared or arrest → they drive off (or vanish).
- Cruisers' sightings keep the Wanted level fresh (`police.lastSeen`).
- Sirens (`AudioEngine.setSiren`: a two-tone wail, louder as they close in), flashing light bars, red and blue light at night, flashing "P" markers on the minimap, "🚓 ×N in pursuit" / "🔦 They're searching" on the HUD, shouted orders.
- Tests: `tests/pursuit.test.mjs` (7 tests).

### Changed
- Car physics is shared (`Vehicles.physics`, `Vehicles.crossings`): turning no longer swings a car into a wall, a wedged car can work itself loose, and cars report their real ground speed (`car.moved`).

## [0.17.0] — 2026-10-13 — "Route 1" (development build)

Second half of the Transportation update.

### Added
- **Transit** (`src/systems/transit.js`, content `src/content/transit.js`, state `world.transit`): vehicles that follow lanes in **world space** (`src/world/layout.js`, now shared by the world map), so they cross maps and region gates freely. Near you (same region) they move every frame and stop for anything ahead — you (they honk), people, other vehicles (mutual blocks resolve oldest-first; any jam clears after 8 s), parked cars — with a short hold so they don't lurch; elsewhere, or during time skips, they move once a game minute. Left-hand traffic.
- **The No. 1 bus**: three buses on one loop (≈216 game minutes) — Mill Road Yards, Mill Road (the Sumps), Civic Plaza, the East End, Westbrook Row, Gullwing Road, Ober's Oil Refinery, and back — stopping 8 minutes at each stop in both directions. **Fare 2 obols.** Board a waiting bus (E), ride it for real while it drives (the camera and HUD follow; you change map with it), get off (E) at any stop beside its sign. **Bus-stop signs** (prop `busstop`, interact kind `busstop`): the next bus's ETA and direction, and "Wait for the bus" (time passes until it arrives).
- **NPC traffic**: 11 cars on four loops — round Halvermouth's Financial District, Market Street and Iron Row blocks, and back and forth along the coast road. Your car collides with them. **Carjacking**: E beside a stopped traffic car takes it (a stolen car; `fact_player_car_theft`); it rejoins the traffic two hours later.
- Night: buses and traffic light the road ahead; the bus interior glows.
- World map: bus stops (hover: next bus) and the buses (hover: direction, next stop).
- Riding HUD: direction and the next stop; key hints.
- Debug command `bus [stop]`.
- Tests: `tests/transit.test.mjs` (7 tests).

### Changed
- Halvermouth's avenue cars (parked in the traffic lanes) were removed; the car parks, police cruisers, hotel limousines and named owners' cars remain.
- `MapRenderer.worldLayout` moved to `src/world/layout.js` (`worldLayout`, `worldToMap`, `mapToWorld`).

## [0.16.0] — 2026-10-13 — "On the Road" (development build)

First half of the Transportation update. Owner's answers: drive cars yourself; ride the bus for real (next release); original dealer NPCs; hitting people, car theft and NPC traffic (next release) as extras.

### Added
- **Cars** (`src/systems/vehicles.js`, content `src/content/vehicles.js`, state `world.vehicles`, `player.driving`): eight models with price, top speed, acceleration, grip, size and body style. Tank-style driving (W/↑ throttle, S/↓ brake and reverse, A/D steer — biting harder with speed, Shift handbrake, H horn), off-road slowdown, sub-stepped collision against walls, props, doors and other cars (oriented boxes), sliding along obstacles, crash sound and camera shake. Cars cross map seams and drive through region gates with you; they stay where you park them. Engine note follows speed (`AudioEngine.setEngine`); headlights light the road at night; brake lights.
- **Fender's Pre-Loved Motors** (Westbrook Row): a forecourt, a sales hut (`fender_office` interior) and **Marty Fender** (`npc_marty`), selling the Halver Pipit (420), Morrow Dray Estate (680) and Ostley Mule Pickup (900). Buys any car parked on the lot at 40% of list, stolen ones at 30%, and sells "fresh plates" (150) that make a stolen car legitimately yours.
- **Beaumont Motor Gallery** (Halvermouth, the East End): a glass-fronted showroom with a marble interior (`beaumont_showroom`), display cars, and **Julian Beaumont** (`npc_julian`), selling the Beaumont Aurelia (6,500), Halcyon Tempest GT (11,000), Vantaggio Corsair (18,500) and Sterling Regent Limousine (26,000). Part-exchange at 55%; refuses stolen cars.
- **The dealership panel** (`src/ui/dealer.js`): car previews, stats, colour choice, buy; sell or re-plate cars parked on the lot. Opened through dialogue (effect `{ dealer: id }`).
- **Hitting people**: above 70 px/s a car hurts whoever it hits (damage by speed; lethal above 330 px/s), with knockback and the usual assault crime and witnesses; slower, they're nudged and annoyed. **Imported characters are never harmed** — the car stops; no Wrath, since it isn't a direct attack.
- **Car theft**: E on anyone else's car → hotwire (2.5 s, less with finesse; moving cancels it). Fact `fact_player_car_theft` (severity 3, Wanted ★★); the owner holds a grudge; officers who see you driving a stolen car raise the Wanted level and give chase; stolen cars that police have flagged are impounded back to their owners if you're jailed. Dealers restock a stolen display car the next morning.
- **Every parked car is real**: Halvermouth's 'car' props (avenues, the Harbourline car park, the police cruisers, the Grand Hotel's limousines) become drivable, stealable cars, plus cars belonging to Sir Moneybucks, Mason, Lucas and Osric.
- Your cars on the world map (🚗, hover for model and place) and a garage card on the tablet's Home screen. Map icons for both dealerships.
- Driving HUD: car name, speed in mph, a stolen tag; driving key hints. Hotwire progress bar.
- Character art: `pattern: 'check'` blazers, `chain` and `shades` accessories.
- Sounds `sfx_car_start`, `sfx_crash`, `sfx_horn`; the engine loop.
- Debug command `car [model]`.
- Tests: `tests/vehicles.test.mjs` (12 tests).

## [0.15.1] — 2026-10-13 — "Overwatch" (development build)

### Changed
- **The arms-works terminal is an OSINT console** (`src/ui/terminal.js`): a CRT monitor frame (`className: 'monitor'`), scanlines, phosphor text, a header bar, STATUS / CONTACTS (live shipment progress) / INTERCEPTS (news) panels, F1–F6 command tabs and a shell prompt. The tablet's Business app shows the same console.
- **The globe is interactive**: drag to rotate, wheel or +/− to zoom, HQ and auto-rotate buttons; hover tooltips for countries (anywhere on their land: status, budget, wants, prices, stance, your inbound cargo), your shipments (operator, destination, cargo, value, progress, ETA, insurance, embargo) and Halvermouth. Your craft sit at their true progress with a sonar ping, a solid wake behind and a flowing dashed route ahead; air freight (Stork) is drawn as a plane on a higher arc. 22 ambient vessels sail the trade lanes continuously (hover: name, route, declared cargo; some run dark). Clicking a country opens the Market with it as the buyer.
- **The map (M) is a world map** (`MapRenderer.worldLayout` / `drawWorld` in `src/ui/maps.js`): every outdoor map in one space — regions joined by gateways are placed side by side with a road between the gates. Pan by dragging, zoom with the wheel or buttons (1–24 px per tile), Whole world / Me / per-region buttons, building icons (`src/content/mapIcons.js`, 52 buildings) with hover tooltips, names when zoomed in, district names, region names when zoomed out, fog over unexplored districts, gold rings on your home and owned property. Inside a building you're shown at its door; a second tab keeps the building's own floor plan.
- Panels can set any `className` on the modal (`monitor`, `tablet`, `wide`).
- Tests: `tests/worldmap.test.mjs` (3 tests).

## [0.15.0] — 2026-10-13 — "OberPad" (development build)

### Added
- **The tablet** (`src/ui/tablet.js`, panel `tablet`, title "OberPad") replaces the journal (J / Q). Apps: **Home** (notification feed + business and stock summary cards), the journal's Quests, People, Customers, Notes and Standing, **Business** (only once you own an arms works) and **Stocks**.
- **Business app**: a remote link to each arms works' terminal — the same globe and Overview / Parts / Equipment / Staff / Research / Market screens (`terminalScreen` in `src/ui/terminal.js`, shared with the works terminal), with a works switcher when you own several.
- **Stocks app**: the Ober's Oil share register (`stocksScreen` in `src/ui/panels.js`, shared with Sir Moneybucks's register) plus a closing-price chart with per-day hover.
- **Business notifications** (`src/systems/tablet.js`, state `world.tablet`): `tablet.post(app, text, kind)` toasts and keeps a feed of 60 with an unread count. Posted by: parts deliveries, payroll, a payroll-you-can't-cover warning at 18:00, staff quitting, a daily production report per works at 19:00, staffed stations stalling (out of parts, output full, no recipe, no power, lab with no project; once per stall), research complete, shipments delivered or lost, world news, Ober's Oil dividends and share moves of 3+ obols. HUD badge "📱 N new" (click to open).
- Tests: `tests/tablet.test.mjs` (7 tests).

### Changed
- The pause menu's Journal button is now Tablet; the HUD key hint reads "J tablet".
- The terminal's Overview no longer says the global market "opens soon".

## [0.14.0] — 2026-10-13 — "Gun Running" (development build)

Second half of the Guns and Gun Running update.

### Added
- **The global market** (`src/systems/market.js`, state `world.market`): eight fictional countries with budgets, income, wants per weapon family, aggression and rivals. Daily at 06:00: budgets grow, wars end (after 5+ days, 15%/day) or start (rivals, 5% × aggression), aggressors may be embargoed, sanctions occasionally lift, and news is posted. Prices = value × wants × war boost × (1 − saturation) × (1 − hostility/200); hostile countries (60+) refuse to buy. Starts with Varnistan and Caldera at war and Pallas sanctioned.
- **Shipping** from a works' export cage to a country: five shipping companies (fee, reliability, days; two run embargoes, at extra risk), optional insurance (+8%, pays 60% if lost — not for seized smuggling), payment on arrival; losses are sunk, hijacked or seized. **Heat**: a seized embargo run is traced to you (record +8, Wanted ★★); a seizure by the buyer's enemy makes them hostile (+30); arming one side of a war annoys the other (+5).
- **Terminal Market tab**: world news, shipments in transit, every buyer's status, budget and prices, and a shipping form (buyer, shipper, insurance, quantities, live quote). The globe draws wars as pulsing red lines and your shipments crossing from Halvermouth.
- **Heavy weapons in the field** (`src/systems/heavy.js`): the RPG launcher fires rockets (explode on impact, 2.5-tile blast); Skylance guided missiles home on the nearest person; Longbow cruise missiles strike the aimed point after a 2.5 s countdown (5-tile blast); Hornet drones dive at whoever you're fighting; Kestrel drones fire four missiles. Blasts hurt you too, scorch the ground, shake the camera and make bystanders flee. **Explosions never harm imported characters and drones/missiles never target them; only a direct rocket hit calls down their Wrath.** Explosions are a major crime (record +10).
- Sounds `sfx_rocket`, `sfx_explosion`, `sfx_drone`; fact `fact_player_explosion`.
- Debug commands `heavy`, `war <a> <b>`, `peace`, `arrive`, `nextday`.
- Tests: `tests/market.test.mjs` (12 tests).

### Changed
- Witnesses to one scene now make a single police call (the worst crime they saw) instead of one each.

## [0.13.0] — 2026-10-13 — "Pipecreek" (development build)

First half of the Guns and Gun Running update.

### Added
- **Lucas Eastrise** (`npc_lucas`): imported from a player-supplied photo (stored with permission; portrait embedded). Sleazy, creepy, conspiratorial; 14 rotating rants about the fictional countries and generic real-world-style conspiracies (no real names). Protected, with an `arms` Wrath ("EVERYTHING IS FOR SALE") and strike sound `sfx_crate`. See `docs/characters/npc_lucas.md`.
- **Pipecreek Armory**: the gun shop renamed, staffed by Lucas (counter 09:00–19:00), with a back room. Buying a gun unlocks his pitch; accepting it unlocks the **arms licence** (500 obols).
- **Mill Road Yards** (`yards`, a new region through a gateway at the west end of Mill Road), with three **arms works** for sale (Yard 1 Works 2,500, Yard 2 Works 6,000, Foundry Hall 12,000; licence required). Interiors `aw1`/`aw2`/`aw3`, all larger than the calculator warehouses: loading dock, export cage, terminal, staff bunks.
- **Arms production** (`src/systems/arms.js`), built on the factory engine: seven workstation types (`item_st_*`, domain `arms`) running one recipe each; 11 parts, 6 components, 18 recipes; new weapons: assault rifle, sniper rifle and LMG (usable now, rifle rounds), RPG launcher, RPG rocket, Skylance guided missile, Longbow cruise missile, Hornet and Kestrel drones (use in v0.14).
- **Employees**: procedurally generated (name, look, four skills, quirk, wage), hired from the terminal into bunks. They are NPCs who live in their works, walk to their assigned station on shift, and run it. Payroll at 19:00; morale, bonuses, quitting.
- **Research tree**: five branches, 21 nodes (unlocks, speed, price bonuses, cheaper parts), fed by staffed research labs.
- **The terminal**: a hand-drawn rotating globe with eight fictional countries, borders, glowing trade routes and traffic; tabs for Overview, Parts, Equipment, Staff, Research and Market.
- **Wholesale**: Lucas buys arms items at half value (with research), up to 2,500 obols a day; the shop shows his remaining budget.
- Factory engine generalized (`Factory` hooks: `recipeOf`, `rate`, `produced`, `stepMachine`, `settingOptions`, `statusExtra`, per-system state and warehouse registry); calculator machines and arms stations can't be mixed.
- Debug commands `licence`, `works <id>`, `armsparts [n]`, `stations`, `research <id|all>`, `hire [n] <works>`.
- `docs/ARMS.md`. Tests: `tests/arms.test.mjs` (14 tests).

### Changed
- The shop sell list uses `Game.priceFor` (so dynamic prices show).

## [0.12.0] — 2026-10-13 — "The Calculator Works" (development build)

Second half of the gang update: making your own calculators, Factorio-style.

### Added
- **Warehouses** for sale on the Halvermouth docks (`src/content/warehouses.js`): Warehouse 7 (300 obols), Pier 9 Shed (750), The Old Cannery (1,500), each with its own interior (`wh7`, `wh9`, `wh12`): concrete floor, an input bay, an output crate and a workbench. Bought at the FOR SALE sign; the door unlocks (`owns_<id>`).
- **Sal's Surplus Electronics** (`surplus` map) and **Sal Vage** (`npc_sal`, generated): parts (`shop_surplus`; also buys calculators back at 7 and blanks at 3), machinery (`shop_machines`, after 5 made), daily **delivery contracts** (small 50 / large 140 obols, after 10 made) into your biggest warehouse's input bay at 07:00, paid on delivery.
- **Production chain**: five parts (`item_part_*`) → core, shell → blank → tuned calculator. **Hand-crafting** at the workbench (10/10/15/8 game minutes, from pockets and the input bay).
- **Factory** (`src/systems/factory.js`): machines (soldering station, case press, assembler, tuning bench; 2×2, buffered), conveyor belts (one item a minute; the end of a line feeds machines and crates; lines back up, never drop), inserter arms (one item a minute, only what the target wants), generators (power: the wall socket runs the first 2–3 machines, each generator 4 more). Runs one step per game minute for every owned warehouse — on or off the map and through skipped time. Entities are saved and reinstalled as runtime props (`GameMap.addProp/removeProp`).
- **Build mode** (B in a warehouse you own): a toolbar of your machinery, number keys or click to choose, R to rotate, click to place, right-click to pick up (contents come back), a green/red placement ghost with direction arrows, power readout. E on a machine: status, set the tuner, load inputs, collect output.
- Containers you own have **All** buttons and **Store all parts**.
- Drawing for every fitting and machine (`src/engine/drawFactory.js`): crawling belt chevrons, items sliding along belts, swinging arms, glowing machine windows, progress bars, power lights, generator exhaust.
- Debug commands `warehouse <id>`, `parts [n]`, `machines`, `made <n>`.
- `docs/FACTORY.md`. Tests: `tests/factory.test.mjs` (13 tests, including a full parts-to-calculator production line).

## [0.11.0] — 2026-10-13 — "Sums of Anarchy" (development build)

First half of the gang update (the warehouse and factory builder follow in 0.12.0).

### Added
- **Arthur Anderson** (`npc_arthur`) — imported from a player-supplied image (stored with permission; portrait embedded) and interview. Leader of the Sums of Anarchy; always angry (a permanent flush, slammed brows and steam: new `appearance.angry`), maths-obsessed, protective, petty, vengeful. Protected, with a `maths` Wrath ("YOU DON'T ADD UP": graph paper, orbiting calculator keys and bad sums, falling digits, a giant calculator reading ERROR, division by zero → UNDEFINED) and strike sound `sfx_digit`. See `docs/characters/npc_arthur.md`.
- **The crew** (generated, killable, faction `fac_sums`): Al Gebra (enforcer), Percy Ntage (bookkeeper), Minnie Mus (the counter), Dee Nominator (bouncer), Tony Tangent (lookout), Max Imum (reckless).
- **The Abacus** — the gang's bar in the Sumps (`abacus` map): bar, pool hall, bunk room, Arthur's office. 17 new Sumps spots.
- **Calculators** (`src/systems/calculators.js`): six items (`item_calc_*`). Stat calculators give +1 for ~4 h then −1 for 1 h; Plus Pack heals 40; Overclock +45 energy then a crash 3 h later. Tolerance per type weakens and shortens each use (1 / (1 + 0.6 × uses)) and fades a point every 8 h. `Game.stat(name)` gives effective stats; dialogue checks and the jail key reach use it. Grit now reduces damage taken (8% per point above 2).
- **Customers and dealing** (`src/systems/gang.js`, state `world.gang`): 12 Sumps residents with a favourite calculator, budget and referral. Free samples win gang customers (chance from favourite, Charm and earlier attempts); won customers page daily orders (type, quantity, price, meeting spot, two-hour window) and walk to the spot; deliveries pay and build habit; three deliveries unlock a referral; missed orders sour them back to the gang.
- **Gang anger** 0–100: +12 per stolen customer, +2 per deal, +10 assault / +40 murder of a member, −4 per quiet day. 25 a warning, 50 the crew jump you in the Sumps and the Abacus, 75 war: they jump you anywhere in Halvermouth and send hunters every 3 hours. **Truce**: tribute (30 + 2 × anger) or hand back half your customers for 7 days (stealing during a truce: +40).
- **Police**: dealing is a crime (severity 2) — an officer who sees it makes you Wanted (bribes cover it); Finesse shrinks the witness range; gang members and customers never call the police; jail confiscates contraband (calculators). Gang members and officers trade insults when they meet.
- Minnie's counter (`shop_sums`) works across the bar while she's behind it, and refuses you once the gang is hostile (`interact.staffed`).
- HUD: calculator highs and comedowns, the gang's mood. Journal → **Customers** tab with every customer, orders and gang anger. Character panel shows boosted stats.
- Debug commands `calcs [n]`, `gang <n>`, `customers`, `customer <name> <status>`, `order <name>`.
- Tests: `tests/gang.test.mjs` (21 tests).

### Fixed
- Dialogue topic and choice labels weren't interpolated, so Chief Order's bribe choice showed a literal "{bribe}".

## [0.10.0] — 2026-10-13 — "Law & Order" (development build)

### Added
- **Chief Lawrence Order** (`npc_lawrence`) — imported from a player-supplied image (stored with permission; portrait embedded) and interview. Careless, comfortable, bribable; never leaves Precinct 1. Protected, with his own Wrath (theme `law`, `after: 'jail'`). See `docs/characters/npc_lawrence.md`.
- **Five generated officers** (justice-pun names, all armed, all killable): Sgt. Justin Case (revolver; Plaza, Bank Row, East Gate, Founders Park), Warren Tee (pistol; Sumps, Mission, Docks), Bailey Bond (pistol; Lanternside), Miranda Wright (baton; Westbrook, Gullwing Park, Canal Row), Hugh Jury (shotgun; Ober Fields, then the cell block at night — dozing 01:00–04:00). Plus **Petty Larson**, the prisoner in the next cell.
- **Police system** (`src/systems/police.js`, state `world.police`): criminal record (murder 10, an officer 20; assault 3/6; gunfire 2; jailbreak 8; trespass/theft 1), Wanted 0–3 stars, witness calls with a delay, dispatch of the nearest officers, pursuit, cuffing (1.4 s close contact), shoot-on-sight at ★★★, Wanted lapsing unseen, a point off the record per clean day. The Chief is lax below record 8.
- **Bribes** (3 days: calls ignored, officers look away; a killing is still reported 4 hours late) and **fines** via Chief Order's dialogue (`police` effect and condition).
- **Jail** (`jail` map, below the rebuilt precinct with the Chief's office and the officers' bunk room): weapons and contraband go to the evidence locker (`ct_evidence`); sentence 4 h + 2 h per record point; serve it on the cot (gear back, record halved). **Breakouts:** spoon digging (4 nights' hours), the guard's keys (Finesse; +12 h if caught), bribing the guard (no warrant, no gear), Petty's vent (25 obols or a cigar for the bent fork). Escaping is a jailbreak: ★★.
- **Death and knock-outs** now land you in jail instead of at home.
- **LAW & ORDER Wrath**: siren wash, sweeping searchlights, police tape, rings of badges, handcuffs and CASE CLOSED/DENIED stamps, a chalk outline, four squad cars ramming in, a giant gavel, a paperwork blizzard stamped GUILTY, and cell bars dropping. Audio: siren, the Chief's tuba motif, typewriter, cell-door clang; strike sound `sfx_ram` (fifth = gavel). Banner "YOU HAVE THE RIGHT TO REMAIN SILENT".
- HUD Wanted stars / bribe / time-left line; a cuffing bar over the player; **G** to surrender.
- Debug commands `wanted`, `record`, `jail [hours]`, `release`, `bribe`.
- Items `item_jail_keys`, `item_spoon`, `item_bent_fork`; props `loosebrick`, `vent`, `wallcrack`; motif `motif_lawrence`.
- Tests: `tests/police.test.mjs` (20 tests).

### Changed
- `combat.test.mjs`: being beaten unconscious now ends in a cell, not at home.

## [0.9.0] — 2026-10-13 — "Personal Wrath" (development build)

### Fixed
- **Attacking a protected character often did nothing.** Melee only hit within ~1.4 tiles, and Sir Moneybucks spends most of the day behind furniture (study desk, dining table, card table) where the player can't get that close, so the swing silently missed. Tests had always placed the player adjacent. Now any melee swing aimed at a protected character within 2.6 tiles (50° cone, line of sight) calls down the Wrath, and so does any shot whose path passes within 28 px of one (`Combat.raisedAgainst`, `Combat.protectedOnRay`). Regression tests reproduce the dining-table case.

### Added
- **Themed Wraths** (`profile.wrath.theme`; `THEMES` in `src/engine/wrath.js` — `arcane`, `oil`, `construction`), each restyling the same beats (aura → banner → convergence → five strikes → finale), with per-character `banner` and `subtitle`:
  - **Sir Moneybucks — oil**: "YOU CANNOT AFFORD THIS". Sepia-black sky; a milled-coin "$" sigil; six derricks burst up around him and spout crude; spinning gold coins and oil barrels orbit as he rides a gusher; the strikes are oil geysers under the player that ignite from the third; an oil slick burns; the finale is a pillar of burning oil and black smoke with coins raining down.
  - **Mason — construction**: "DEMOLITION ORDER APPROVED". A blueprint grid spreads over the ground; hazard-tape rings, orbiting hammers/wrenches/trowels/bricks and a ring of nails; a crane cable lifts him on an I-beam; orange "DEMOLISH" spray paint marks the player; four I-beams fall (dust, sparks) and a wrecking ball swings in; a brick wall builds itself over the player, is stamped CONDEMNED, and collapses into dust.
- **Themed audio**: `sfx_wrath` takes the theme — oil adds a ka-ching, Sir Moneybucks's motif on brass, a fire roar and coins; construction adds anvil strikes, Mason's whistled motif and clattering bricks. New strike sounds `sfx_gusher` (ignites from the fourth strike) and `sfx_beam` (the fifth is the wrecking ball). All themes rendered offline: peaks 0.88–0.89.
- Validator: `wrath.theme` must be a known theme.

### Changed
- Mason's last word is now construction-themed ("Looks like you just got… nailed.").

## [0.8.0] — 2026-10-13 — "Debug Menu" (development build)

### Added
- **Debug menu** (` key, or Pause → *Debug menu (testing)*): live status (obols, health/energy, position, time, weapon/ammo), quick buttons (+100/+1000 obols, heal, god mode, all weapons, ammo, revive all, jump to 08:00/22:00, skip an hour, overlay), a map teleporter, a searchable **item spawner** with quantity, and a **command console** with history (Up/Down).
- **Console commands** (`src/game/debugCommands.js`, DOM-free and tested): `help`, `give <item> [n]`, `take <item> [n]`, `items [filter]`, `money <n|+n|-n>`, `health <n>`, `energy <n>`, `heal`, `god`, `weapons`, `ammo [n]`, `time HH:MM`, `skip <min>`, `maps`, `spots <map>`, `tp <map> [spot]`, `revive <npc|all>`, `npcs`, `stat <stat> <1–5>`, `rep <faction> <n>`, `flag <name> [value]`, `overlay`, `clear`. Items resolve by id or part of the name.
- God mode (`player.god`) blocks all damage except the Wrath.
- Tests: `tests/debug.test.mjs` (5 tests).

### Changed
- The ` key opens the Debug menu instead of toggling the overlay directly (the overlay is a button and a command in the menu).
- Opening any menu hides the world caption box so it can't cover the menu.
- Any state-changing debug command sets the flag `debug_used` in the save.

## [0.7.0] — 2026-10-13 — "The Oberverse Protects Its Own" (development build)

### Added
- **Imported characters are protected** (`isProtected()` in `src/systems/combat.js`): any character with `origin: 'imported'` cannot be damaged, knocked out or killed — unless their profile sets `killable: true` (the project owner's decision).
- **The Wrath**: attacking a protected character with anything (fists, melee, guns) triggers a ~10-second cutscene (`src/engine/wrath.js`) that strikes the player down:
  - the world freezes (clock, NPCs, input), letterbox bars slide in, the camera pushes in and the sky darkens toward the character's colour;
  - three counter-rotating rings of procedurally drawn runes unfold around the levitating victim, whose eyes burn; a heptagram sigil glows beneath them; motes swirl inward;
  - the banner "THE OBERVERSE PROTECTS ITS OWN" drifts together letter by letter;
  - the runes converge on the player and a sigil opens under their feet; five forked lightning bolts strike with white-out flashes and screen shake;
  - a pillar of light rises, the player dissolves into embers, fade to black, and the victim has the last word (`profile.wrath.line`, coloured by `profile.wrath.color`).
- **Score**: `sfx_wrath`, an original 8-second procedural piece (impact, timpani roll, detuned "choir" through vowel formants, organ pedal, rune hum, brass stabs, a rising whoosh, final D-major crash), timed to the visuals; `sfx_thunder` on every strike; music and ambience duck for the scene. Rendered offline in Chromium to confirm output and headroom (peak 0.91).
- **Struck down** card: *Rise again* (wake at home at 08:00 the next day, full health, half your obols gone) or *Load last autosave*.
- Consequences: the victim remembers; witnesses and the victim learn `fact_player_smitten` (gossip); flag `smitten_by_<id>` counts attempts for future dialogue.
- Wrath lines and colours for Sir Moneybucks (gold) and Mason Nails (orange).
- Tests: `tests/wrath.test.mjs` (5 tests).

### Changed
- `docs/CHARACTER_IMPORT.md` and prompt 03: imported characters are protected by default; ask the owner before setting `killable`, and write a `wrath.line`.

### Compatibility
- Save schema unchanged (1). The cutscene is never saved (autosave is suspended while it plays).

## [0.6.0] — 2026-10-13 — "Hard Lessons" (development build)

### Added
- **Combat system** (`src/systems/combat.js`). The player can attack any NPC with melee weapons or guns.
  - Melee: an arc in front of the player (range, arc, cooldown, knockback per weapon). Guns: hitscan rays stopped by walls and buildings, with spread, pellets (shotgun), full auto (SMG), magazines, reloading and ammunition items.
  - Aiming: the mouse when it is in use; otherwise facing with a forgiving auto-aim cone. A dashed aim line shows for guns.
  - **NPC health bars** appear over anyone who is hurt or fighting (green → amber → red, white flash on hit), with floating damage numbers; "KNOCKED OUT" under the bar while they are down.
  - **Fight or flight**: victims and witnesses flee or fight back by temperament (`profile.combat`: `fights`, `defends` (true or a list of people), `never`, `weapon`, `maxHealth`) and personality. Fighters chase with collision and short A* re-plans; badly hurt fighters break and run.
  - **Non-lethal** weapons (fists, brass knuckles, police baton) knock people out for two game hours; they wake at 30% health, frightened. **Lethal** weapons kill: bodies stay where they fell, the dead never act again, can't be talked to, and quests they gave fail.
  - Consequences through existing systems: victims' relationships and memories, witnesses learn `fact_player_assault` / `fact_player_murder` (gossip, reputation), a new `frightened` mood, gunshots scare everyone within earshot (and wake sleepers).
  - The player can be beaten: at 0 health you black out and wake at home six hours later with 45 health, missing a quarter of your money. Health regenerates slowly out of combat.
- **Weapons** (items with a `weapon` block): brass knuckles, police baton, baseball bat, crowbar (now also a weapon), machete, fire axe; .38 revolver, 9mm pistol, pump shotgun, hunting rifle, submachine gun. **Ammo**: .38, 9mm, shotgun shells, rifle rounds (sold by the box; items take a `bundle` size).
- Where to get them: **Rook & Rifle** (Halvermouth) is now an unmanned shop (honesty box; restocks at 09:00); Tibbs sells a fire axe; a baton in the police station lockers (faction `fac_police`); a bat in a crate in the Sumps (unowned containers can be taken from freely).
- Controls: **F / left click** attack (hold for automatic weapons), **R** reload, **X** next weapon, **1–9** pick a weapon, **Z** put weapon away; Equip / Put away buttons in the inventory; HUD shows the weapon and ammo.
- Art: weapons held in hand, bodies lying down (dead ones over a dark pool), tracers, muzzle flashes, swing arcs, bullet sparks, a red vignette when hurt or low on health.
- Audio: swing, punch, whack, slash, three gunshots, reload, dry fire, hurt.
- Combat temperaments for 18 characters (e.g. Silas defends with a revolver; Barnaby protects anyone; Mason, Osric, Sir Moneybucks and others never fight).
- Validator: weapon definitions, ammo references, combat profiles; interact kind `shop`; shops and containers may have `owner: null`.
- Tests: `tests/combat.test.mjs` (10 tests).

### Compatibility
- Save schema unchanged (1). New optional fields: `player.equipped`, `player.mags`; per NPC `health`, `dead`, `downUntil`, `diedAt`. Older saves load with fists and everyone at full health.

## [0.5.0] — 2026-10-13 — "Halvermouth" (development build; map only)

### Added
- **Halvermouth** (`halvermouth`, 112×80 tiles — the largest map), a metropolis west of Westbrook. It is its own region (`city` in `src/content/world.js`) and is **loaded when the player enters** through gateway doors at Westbrook's west edge / the city's East Gate, rather than stitched seamlessly.
- Districts: the Financial District, Bank Row, Civic Plaza, Precinct Row, the East End, Market Street, Iron Row, Founders Park, the Docks and **the Sumps** (slums).
- **Skyscrapers** (new `tower` building style: tall glass facades, floor bands, lobbies, helipads, antenna beacons, offices lit at night, night glow): eleven towers including Ober's Oil Tower (30 storeys).
- **Hall of Justice** (courthouse + Mayor's office) with a dome and pediment at the centre of Civic Plaza; **Police Precinct 1** with a car park of cruisers; **Rook & Rifle Firearms** on Iron Row. Interiors: `hall_of_justice` (lobby, Mayor's office, Courtroom One), `police_station` (front desk, desks, holding cells), `gun_shop` (display counter, racks).
- Closed-for-now buildings with flavour text: the other towers, bank, hotel, cinema, diner, pawnbroker, bar, garage, locksmith, bail bonds, mission, warehouses.
- New tiles `m` (plaza stone) and `u` (mud); building styles `flatRoof`, `dome`, `pediment`, `shabby`; props `car` (incl. police and wrecked), `flagpole`, `statue`, `trash`, `barrelfire` (a light source), `tent`, `laundry`, `crosswalk`, `hydrant`, `dumpster`, `chainfence`, `gunrack`, `cellbars`, `gatepost`; a firearms variant of the display case.
- Audio: `mus_halvermouth` ("City of a Thousand Windows"), `amb_city` (traffic hum, distant horns).
- Map (M): a tab for every region, including regions not yet visited; gateway arrows at map edges ("◀ Halvermouth"); the full map now always stitches the whole region.
- Tests: `tests/world_halvermouth.test.mjs` (6 tests: region separation, walking through the gateway both ways, required buildings and districts, reachability of every open door and interior, opening hours, saves).

### Changed
- Doors may carry `gateway: '<name>'` (edge doors into another region); building `mapLabel: ''` hides a label on the map.

### Not included (by request — map first)
- No residents, shops, jobs, quests or events in Halvermouth yet.

### Compatibility
- Save schema unchanged (1). Older saves load; the city simply appears.

## [0.4.0] — 2026-10-13 — "Mason's Os" (development build)

### Added
- **Second imported character: Mason Nails** (`npc_mason`), from a player-supplied image and interview. Cheerful, neutral, always friendly, a dad-joke machine; owns Mason's Os ("That's O plural!"). His photo is his dialogue portrait.
- **Pun of the Day**: a different pun each in-game day (`Game.dailyPun()`, bank in `src/content/dialogue/mason.js`); groan, laugh, or fire one back (Wits check).
- **Westbrook Lots** (`westbrook`, 44×48), joined seamlessly to the west of Lanternside: Mason's Os yard and site office (`mason_office`), a construction site with a working excavator (animates while Mason digs), the Plumb Line Apartments (`apartments`), the canal's western basin and surveyed lots.
- **Three generated crew**: Dee Rivera (foreman), Barnaby Cole (labourer, birdwatcher, feuding with Tibbs over a gull), Quinn Abernathy (apprentice surveyor/draftsperson). All live at the Plumb Line.
- **Construction shifts** (`job_construction_shift`, `src/systems/construction.js`): trench, bricks, mixer; properly or rushed. Flat 6-obol wage; careful shifts earn crew goodwill (discounts up to 25%, builds up to 2 days faster).
- **Property groundwork** (`src/systems/properties.js`, `src/world/plots.js`, `src/content/properties.js`, docs/PROPERTIES.md): plots and blueprints (home, rental, business), contracts board, Form 22-B permits from Osric, multi-day builds, finished buildings added to the map at runtime with their own interior, rent/income at 18:00. **No plots exist yet** — added on request.
- New condition keys `site`, `property`; effect keys `site`, `permit`; `payWages: 'construction'`; interact kind `contracts`; workstations take a `company`.
- New faction `fac_builders`; facts about Mason's Os, the gull feud, Dee's secret pun tally.
- Audio: `mus_westbrook` ("Measure Twice"), `motif_mason` (whistled), `amb_site` (hammering, idling excavator).
- Docs: `docs/characters/npc_mason.md`, `docs/PROPERTIES.md`, prompt 17 (add a property plot); registry, world bible, content format, architecture, audio guide, known issues, testing record updated.
- Art: scaffold, excavator, lumber, bricks, cement mixer, trench, survey stake, contracts board.
- Tests: `tests/character_mason.test.mjs` (13 tests, incl. a full property lifecycle on a test-only plot).

### Changed
- Mags, Osric, Tibbs and Sir Moneybucks know Mason (relationships and opinions); Sir Moneybucks wants him exclusively and was refused.
- Region renamed "Lanternside & surrounds" (Westbrook · Lanternside · Ober Fields).
- Map rendering caches are keyed by map object so maps can be rebuilt at runtime.

### Compatibility
- Save schema unchanged (1). `world.construction`, `world.properties`, `fac_builders` and the four new residents are defaulted on load of older saves.

## [0.3.0] — 2026-10-13 — "One Coast" (development build)

### Changed
- **Lanternside and the Ober Fields are one continuous space.** Outdoor maps can be placed side by side in a *region* (`src/content/world.js`); the shared edge column becomes a seam the player and NPCs walk across with an exact, jump-free handover (no fade, no camera snap).
- The renderer draws neighbouring maps (ground, water, buildings, props, people, street lights, the lighthouse beam) beyond the current map's edge, and the camera pans across the seam.
- The minimap and the full map (M) draw the whole region stitched together as "Lanternside & the Ober Fields".
- The Ober Fields' west edge continues the Lantern Canal (ending in a culvert pool) and the harbour shore; a westward signpost was added.
- NPCs choose the seam crossing that best lines up with their route.

### Added
- `src/world/regions.js`: seam generation (walkable tiles only) and region offsets; `Game.neighbors()`, `Game.mapOffset()`.
- The welcome letter points new players east to the Ober Fields; loading a save from an older version shows a "what's new" note.
- Tests: walking across and back with no jump; seams only on walkable ground; an NPC crossing physically.

### Removed
- The two explicit "Road to …" edge doors (replaced by the generated seam).

### Compatibility
- Save schema unchanged (1). Saves made on either map load as before.

## [0.2.0] — 2026-10-13 — "Ober's Oil" (development build)

### Added
- **First imported character: Sir Richard E. Moneybucks, Esq.** (`npc_moneybucks`), from a player-supplied image and interview. Ruthless robber baron and antagonist you can work with; status-tiered treatment of the player; his photo as dialogue portrait (embedded data URI).
- **The Ober Fields** district (`ober_fields`) reached by the road east of Lanternside, with interiors: Moneybucks Manor (hall + study), Ober's Oil Refinery No. 1, Workers' Bunkhouse.
- **Ten generated employees**: Crisp, Agnes, Gideon, Ruby, Hank, Pip, Delphine, Silas, Mabel, Otto — routines, personalities, relationships, dialogue and system hooks.
- **Ober's Oil economy** (`src/systems/oilCompany.js`): shares, daily output and dividends, expansion projects (derricks, pipeline, safety refit) with visible and social consequences, wages, morale, accident risk, strikes.
- **Refinery shift job** with three work stations (do it properly or cut corners).
- **"The Ledger"** card wager (`src/systems/ledgerGame.js`), tuned by simulation so reading his tells (Wits) beats naive play.
- **Quest "The Seal of M."** continuing the lighthouse mystery, with four endings (expose, restore, blackmail, partnership); a relit lighthouse with a sweeping beam.
- Events: strike, refinery accident, the Kettle & Crumb buyout, canal slick, the empty vault, lens requisition. Notice-board posts for each.
- Manor invitations (door locks with flags), private documents that catch snoopers, keyed vault, company store with gouging prices, edge-of-map road exits.
- Art: top hats, hard hats, caps, beards, handlebar moustaches, monocles, pinstripes, watch chains, held cigars/clipboards/wrenches; derricks, pumpjacks, tanks, pipes, refinery machinery, vault, paintings.
- Audio: three new compositions, Sir Moneybucks's motif, brass instrument, two ambience beds.
- New faction `fac_oil`; new condition keys `wealth`, `oil`, `arrived`; new effect keys `oil`, `payWages`, `schedule`, `action`.
- `tests/character_moneybucks.test.mjs` (14 tests); validator checks for impossible impulses and event id mismatches.

### Fixed
- Event templates lacked ids, so all events shared one cooldown/once slot.
- Impulses that could never fire (Mags's patio natter, Osric's overtime, Tibbs's gull watching).
- Character portraits drawn before their image loaded fell back to procedural art.

### Compatibility
- Save schema unchanged (1). Older saves load and gain the new characters, Ober's Oil state and `fac_oil` reputation automatically (tested with the 0.1.0 fixture).

## [0.1.1] — 2026-10-13 — "Just Open It" (development build)

### Changed
- **The game is now a single, self-contained `index.html`.** Double-click it to play: no server, no installation, no internet. The same file is served as-is by GitHub Pages, so the game can be shared as a link.
- The multi-file module page moved to `dev.html` (development only, `npm run dev`).

### Added
- `tools/build.mjs` (`npm run build`): zero-dependency bundler that inlines the stylesheet and every module into `index.html`.
- `tests/build.test.mjs`: fails if `index.html` is out of date with the sources, or stops being self-contained.
- Smoke test now runs against `index.html` over `file://` (24 checks, including saves persisting across a reload); `--dev` tests `dev.html` through the dev server.
- `.nojekyll` so GitHub Pages serves files untouched.

## [0.1.0] — 2026-10-13 — "Foundations of Lanternside" (development build)

First playable foundation (roadmap stages 0–1, with early parts of stages 2–6).

### Added
- Project structure, zero-dependency static server, ES-module browser game with no build step.
- Version identifiers in `VERSION`, `package.json`, `oberverse-manifest.json` and `src/core/version.js`; version shown on the title screen, pause menu and About screen.
- World clock (1 real second = 1 game minute), weekdays, dawn/dusk lighting, lit windows and street lamps.
- Lanternside outdoor map (64×48 tiles) with six districts and six interiors (player flat, Kettle & Crumb café, Civic Office, Hollow Fixings workshop, the Old Lighthouse, Vane residence).
- Smooth player movement with acceleration, collision, corner sliding, sprinting and energy.
- Doors with keys, owners and opening hours; trespass detection for restricted places.
- Interaction framework: talk, examine, read, search containers, sit, sleep, forage, pry obstacles, notice board.
- NPC simulation in two tiers (physical on the player's map, abstract elsewhere) sharing one utility-based brain over schedules and personality-driven impulses.
- Knowledge system with witnessing, hearing, reading, gossip and rumours; NPC-to-NPC conversations that spread information.
- Relationships (trust, affection, respect, suspicion), moods, bounded importance-based memory, observation rules.
- Three original characters: Mags Pell, Osric Vane, Tibbs Hollow — with dialogue, opinions, gifts, reactions and distinctive mechanics (gossip trading, formal requests, junk trading).
- Dialogue engine: conditional greetings, topics, choices with skill checks, gifts, gossip trading, bounded "Ask about…" keyword box, anti-repetition.
- Inventory, money (obols), shops with friendship pricing and persistent stock, containers with ownership and witnessed theft.
- Quests: *The Dark Lamp* (three entry approaches, two resolutions), *The Lucky Spanner*, daily job *Coffee for the Clerk* with expiry.
- Reputation with Lanternside and three factions.
- Emergent event director with event chains: workshop bang → noise citation, missing key investigation, café sell-out, gull heists.
- Original procedural soundtrack (7 pieces), ambience beds, 18 sound effects, 3 character motifs, per-character voice blips; volume controls and mute.
- HUD, minimap, full map with fog of war and quest markers, journal (quests, people, notes, standing), inventory, shop, container, document reader, settings, save/load, About & release history, debug overlay.
- Saves: autosave + 3 slots, automatic backups, validation and repair, schema version 1 with migration framework, JSON export/import.
- 59 automated tests, content validator, 21-check browser smoke test, map preview tool, save-fixture generator.
- Documentation set and AI prompt bank.

### Known limitations
See docs/KNOWN_ISSUES.md. Notably: no combat yet, no equipment slots, a single outdoor map, no controller support.
