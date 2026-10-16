# Testing

## Automated

| Command | What it does |
| --- | --- |
| `npm test` | Runs every `tests/*.test.mjs` with Node's built-in test runner. Fully headless: the whole simulation runs without a browser. |
| `npm run validate` | Content reference validator (`tools/validate-content.mjs`). |
| `npm run check` | Both of the above. |
| `npm run smoke` | Opens the standalone `index.html` via `file://` (no server — exactly as players do), drives it in headless Chromium via Playwright, fails on any page error or engine warning, and writes screenshots to `tools/out/`. `npm run smoke -- --dev` runs the same checks on `dev.html` through the dev server. Requires Playwright (a global install is fine). |
| `node tools/make-save-fixture.mjs` | Writes a representative save for the *current* schema to `tests/fixtures/`. Run once per new schema and commit; never regenerate old fixtures. |

### Test files

| File | Covers |
| --- | --- |
| `version.test.mjs` | Version agreement across VERSION, package.json, manifest, game, release notes, changelog, version history. |
| `clock.test.mjs` | Time parsing, wrap-around windows, day/night, pausing. |
| `world.test.mjs` | A* and cross-map routing, wall collision, door transitions, locks/hours/owners, interaction targeting. |
| `dialogue.test.mjs` | Greetings, distinct voices, topic effects, bounded Ask-about (secrets, unknowns), knowledge boundaries, gifts with diminishing returns, gossip trading, locked choices, moods vs persuasion, condition evaluation. |
| `simulation.test.mjs` | Schedules cover 24 h, a full simulated day in the abstract tier, physical walking on the player's map, NPC chats spreading information, rumour vs fact, observation, bounded memory, impulsive deviation, sleep/time-skip consistency. |
| `quests.test.mjs` | The Dark Lamp's three entry approaches (permission, theft + later discovery + confession, caught red-handed, hatch, witnessed hatch), both resolutions, The Lucky Spanner, job expiry & recovery, shops & pricing. |
| `events.test.mjs` | Bang → citation chain gated by information flow, sell-out → irritable Osric, gull heists, witness-only crimes. |
| `save.test.mjs` | Round-trip of rich state, backup fallback on corruption, validation/repair, migrations, forward-compatible content, import/export, settings. Loads the schema-1 fixture. |
| `build.test.mjs` | `index.html` matches a fresh build; the page is self-contained (no module scripts, external files); the bundle parses and includes every module once. |
| `character_moneybucks.test.mjs` | Sir Moneybucks's tiers, schedule, invitation, refinery shifts, investing, the Ledger, the strike, the mystery, saves. |
| `character_mason.test.mjs` | Mason's import, puns and Pun of the Day, always-friendly rule, schedules and physical routes, construction shifts and goodwill, contracts board, the property lifecycle on a test plot, the Westbrook seam, old-save compatibility. |
| `world_halvermouth.test.mjs` | Halvermouth: separate region, gateway travel both ways, required buildings/districts/slum, reachability of every open door and interior, opening hours, saves. |
| `combat.test.mjs` | Weapon variety, punching + health bar, flee vs fight-back, the player being beaten, witnesses, knock-outs and waking, killing (permanent, quests fail, saves), buying/loading/shooting a gun, walls stopping bullets, gunfire panic, weapons in the world, old saves. |
| `wrath.test.mjs` | Protection of imported characters (and only them), the Wrath freezing the world, five strikes, rising again, every weapon type triggering it, `killable: true` lifting it. |
| `market.test.mjs` | Countries and shippers, prices (wants, war, saturation, hostility), shipping rules, arrival and payment, losses with insurance, embargo heat and enemy seizure, wars starting and ending with embargoes, saves; RPG blasts sparing imported characters, a direct hit calling the Wrath, missiles and drones never targeting them, the cruise missile's delay, debug commands. |
| `arms.test.mjs` | Lucas and Pipecreek, the pitch and the licence, the Yards and works sizes, terminal orders, station placement and staffing, applicants and bunks, staff staying in their works, research, a staffed assembly line into the export cage, payroll and quitting, wholesale and Lucas's budget, save/load, Lucas's Wrath, the new guns and recipe integrity. |
| `factory.test.mjs` | Warehouses, signs and doors; Sal's shops and unlocks; hand-crafting the full chain; placement rules; arms, belts, machines; a full parts-to-calculator line; power; backed-up belts and full outputs; deliveries; running while away; save/load as props; the machine panel; debug commands. |
| `gang.test.mjs` | The Sums of Anarchy cast, calculators (highs, comedowns, tolerance, heal, energy crash), Grit, Minnie's shop and counter, samples and stealing, orders, deliveries, referrals, missed orders, dealing and the police, anger tiers, ambushes and hunts, truce, hurting the crew, Arthur's Wrath, gang-police insults, jail confiscation, saves, debug commands, the Abacus. |
| `police.test.mjs` | The police cast (imported chief, armed killable officers, beats in all four areas), the lax chief, calls and dispatch, bribes and fines, pursuit and cuffing, surrender, death → jail, serving a sentence, all four breakouts, the LAW Wrath → jail, killing an officer, Wanted lapse and record decay, saves, debug commands, walkable precinct and cells. |
| `debug.test.mjs` | Debug console: give/take by id or name, money/health/energy/heal/god, weapons and ammo, time/skip/teleport/stats/rep/flags, reviving the dead and knocked-out. |
| `content.test.mjs` | Validator passes and catches injected errors, songs compile into whole bars, every major character has motif/voice/personality, **no network or external AI usage anywhere in `src/` or `index.html`**. |

## Manual testing with the Debug menu

Press ` in game (or Pause → *Debug menu*). Useful recipes: `weapons` then `tp halvermouth` for combat; `money 1000` for shops and property; `time 22:00` for night lighting; `revive all` after combat tests; `god` to watch fights without dying; `npcs` to find someone. Saves made after using it carry `flags.debug_used = true`.

## Verification record — v0.35.2 (2026-10-16)

- `npm run check` — **354/354 tests passed** (1 new: a car nosed into the Kettle & Crumb's wall and floored never centres inside the building, ends clear and lets you out; overlapping another car you can still back away). The test fails on v0.35.1. Two older tests (`streets`, `pursuit`) relied on the bug — a car started off the map, and a pull-over staged among the plaza's lamp posts — and were moved onto real roads. (The first push of this fix went out with those two failing; corrected in the next commit.)
- Reproduced first: a Pipit overlapping the café wall, accelerator held, spent 19 frames centred inside buildings. After the fix: 0, headless and in the browser (holding W for 3 s; E got out). Exit sweeps (Lanternside, every map edge) still 0 failures.

## Verification record — v0.35.1 (2026-10-16)

- `npm run check` — all tests pass (3 new regression tests; both bus tests fail on the old code).
- Browser: boarded the No. 1 at the Yards and got off at the next stop (Mill Road), the No. 2 in Lariat at noon, and the No. 2 at 22:45 riding past closing time to Justice Way — all with the E key. Got out of cars (Pipit, Bullion, Tempest) by the Kettle & Crumb.
- Sweeps: getting out at every drivable spot (5 models × 12 angles) on Lanternside, and along every outdoor map's edges — 0 failures (6 before the fix, in Halvermouth and the Yards).

## Verification record — v0.35.0 (2026-10-15)

- `npm run check` — **351/351 tests passed** (4 new in `livingworld3.test.mjs`: errands vary over 40 days within the region and are deterministic; Rosa and Lorna choose the same place on a meet day and both walk there; a call goes reported → responding → investigating → closed, through a save mid-investigation, the witness telling the officer, the officers back on their beats; the checker catches a one-sided meet-up and an unknown errand); validator 0 errors.
- `npm run smoke` — 24/24.
- Browser: a call placed in Halvermouth, officers responding, the incident marked on the world map. No page errors. Found and fixed during testing: incidents never closed when the officers' own routine ended the dispatch first (closing is now by "nobody attending").

## Verification record — v0.34.0 (2026-10-15)

- `npm run check` — **347/347 tests passed** (5 new in `signatureCars.test.mjs`: one car per imported character, each parked on clear ground out of every lane, unique plates; older saves gain them once; dealers refuse them and the owner minds; the Gavel saluted and the Paranoia unseen by an officer with a clear view; the Landlubber sails 30% faster than its road top speed while a Pipit can't enter the water); validator 0 errors with the new rule.
- `npm run smoke` — 24/24.
- Browser: all seven cars rendered together (checked by eye), and the Landlubber driven across the Yards harbour leaving spray. No page errors. Found and fixed: "Look at the The Landlubber" (names dropped their "The"); the Landlubber's sea speed was capped at its road speed; the Hypotenuse's fourth wheel floated outside its triangle (now a three-wheeler).

## Verification record — v0.33.0 (2026-10-15)

- `npm run check` — **342/342 tests passed** (6 new in `worldsim.test.mjs`: two lines, every stop on its route with a place to wait, the No. 2's hours; an older save's buses kept and the new line's added; Wade's round trip on the No. 2 phase by phase; a passenger through a save (once, hidden, gets off); Quinn always the quick way on the No. 1; the player riding the No. 2 to Lariat and paying 3 obols); validator 0 errors with the new transit rules.
- `npm run smoke` — 24/24.
- Traced by script: Wade walks from the parlour to the Church Street stop, boards at 19:16, reaches Justice Way at about 19:55 and walks on to the plaza; the ride home leaves at 21:29. Quinn rides Westbrook Row → Civic Plaza on the No. 1 and comes back the same way round. Found and fixed: passengers boarding a No. 1 going the long way round (via the Yards); buses and stops all painted "1". (A bus waiting forever turned out to be waiting for the test's player, standing in FM 38.)
- Browser: the world map with both routes drawn, a No. 2 at the Cotton Street stop. No page errors.

## Verification record — v0.32.0 (2026-10-15)

- `npm run check` — **336/336 tests passed** (5 new in `worldsim.test.mjs`: every character has a home or exception and the checker catches a homeless or doubled-up resident; the four flats, tenants asleep in their own, private doors; an officer walking a beat on screen (≥3 waypoints, >20 distinct tiles) and off; a conversation pausing and resuming a beat, and a save keeping the place on it; every officer's beat and the cruiser). Two tests updated (the crew's flats; a voyage test's robust wait). Validator 0 errors with the new rules.
- `npm run smoke` — 24/24.

## Verification record — v0.31.0 (2026-10-15)

- `npm run check` — **331/331 tests passed** (4 new in `farming.test.mjs`: pastures, stock by area and kind, animals drawn; feeding, produce, hunger and losses; cattle growth, auction demand and overnight recovery; the books, the herd through a save and back on the map, Wes and the feed; the Co-op test now expects demand); validator 0 errors.
- `npm run smoke` — 24/24.
- Browser: a pasture with a dozen calves grazing, the Hoof & Horn sale ledger, the tablet's Farm app with plots, feed, prices and the books. No page errors.

## Verification record — v0.30.0 (2026-10-15)

- `npm run check` — **327/327 tests passed** (5 new in `farming.test.mjs`: plots, buying once; by hand vs. with a tractor parked by the field; growth, harvest once, the Co-op, spoiling; the field redrawn as the crop grows and the price band; saves, older saves, the three tractor tiers, shops and people); validator 0 errors. `logistics.test.mjs`'s export test made robust to en-route delays.
- `npm run smoke` — 24/24.
- Browser: Red Dirt's lot and dealership panel (tractor previews), buying a plot and a Longhorn, tilling and planting corn with it (33 minutes each), the corn growing in the field, the plot panel. No page errors.

## Verification record — v0.29.1 (2026-10-15)

- `npm run check` — **322/322 tests passed** (1 new: Lariat's grid reachable from the gate, fields all on field tiles and none on the creek, no per-frame crop props, no street furniture on roads/buildings/water/fields, two junctions with lights and crossings, the arch and the North Gate's gateposts and sign, no sea-wall border); validator 0 errors.
- `npm run smoke` — 24/24.
- Browser (headless Chromium): the whole of Lariat rendered in one image before and after; close-ups of the arch, Main & FM 38, Cotton & FM 38, the cotton field and Halvermouth's North Gate; the world map. 60 fps over the cotton field (the per-frame stalks are gone). Fixed from the runs: the arch's beam floating above its posts, an overflowing sign on the one-tile ridge, a lamp and a tree in the road, a front walk that ran to the map edge. No page errors.

## Verification record — v0.29.0 (2026-10-15)

- `npm run check` — **321/321 tests passed** (13 new in `lariat.test.mjs`: Chuckie imported and protected with the stampede Wrath; Lariat reachable through the North Gate with every door, hideout and the paddock reachable on foot; a new game's cows loose at their hideouts; Chuckie's quest states and no repeated intro; the lasso always in stock and buying it advancing the quest; no rope without a lasso, roping first starting the quest; a roped cow following at walking pace and coming home in the paddock (capacity 55% → 64%); waiting outside interiors, not chasing you across the county, and staying roped through a save; the reward paid once, also after a load; production, dividends once a day and the price toward fair value; the anti-exploit limits; an older save gaining the dairy; the company board and markers; a cow crossing the North Gate with you); validator 0 errors (it now also rejects duplicate ids).
- `npm run smoke` — 24/24.
- Browser (headless Chromium, 1280×800): Main Street, the dairy yard and paddock, Bessie at her hideout and in conversation (cow portrait), Chuckie in conversation (photo portrait), five interiors, the exchange on CHZ and the tablet's Stocks app, the world map with Lariat north of Halvermouth, and Chuckie's Wrath frame by frame. Fixed from the runs: Bessie's hideout was in the middle of Dairy Road (moved behind the diner); the dividend per share read 0.000 (now per 100 shares); a roped cow fell behind a walking player (she now trots to catch up, never faster than your sprint). No page errors.

## Verification record — v0.28.0 (2026-10-15)

- `npm run check` — **308/308 tests passed** (4 new in `geography.test.mjs`: capitals on land; every port on land, on the coast, near its capital and reachable by sea; 22–45% land, coastlines far longer than a disc's, over 60 landmasses, the Morrow archipelago; deterministic); validator 0 errors. The existing sea-route tests pass on the new coasts.
- `npm run smoke` and `npm run smoke -- --dev` — 24/24 each.
- Browser (headless Chromium, 1440×900): an equirectangular preview of the whole world with every port and capital marked; the arms terminal's globe (Market tab) with true coasts, borders and the hovered country lit, opening in under 0.1 s and running at ~48 fps; Fleet Command's chart at default and zoomed in, dragged; sending a ship along the new coasts. Fixed from the runs: a wrap-around bug that smeared land in strips across the ocean, too many single-pixel islands, a stale reference left over from the dot matrix. No page errors.

## Verification record — v0.27.0 (2026-10-15)

- `npm run check` — **304/304 tests passed** (4 new in `boarding.test.mjs`: on every stock ship and every hull fully fitted, from either side's gangway the way below and every fitting are reachable; below decks every interactive fitting is reachable and the way up exists; mooring, the gangway, the wheel and logbook, casting off with you aboard; aboard through a save, and hiding a ship you're on); validator 0 errors.
- `npm run smoke` and `npm run smoke -- --dev` — 24/24 each.
- Browser (headless Chromium, 1440×900, real keyboard): five ships moored across three berths (the Gullwing Lass and the Bluecap container ship at Mill Road, the Brig at Sund, the Destroyer and the Starwake at Meridian), each life-size with its fittings; walked west off the pier, up the gangway and onto the Gullwing Lass's deck; walked north into the bridge door and arrived below decks; took the wheel ("You take the Gullwing Lass's wheel. She's alongside at Mill Road Docks…") and read the logbook. Fixed from the runs: decks split by the bridge or by fittings on narrow hulls (now a port-side walkway on every deck), a part's footprint spilling across the gap around the bridge, the skiff's gangway blocked (an open deck now), warship bridges drawn black (`shade()` on an already-shaded colour). No page errors.

## Verification record — v0.26.0 (2026-10-15)

- `npm run check` — **300/300 tests passed** (4 new in `shipbuilder.test.mjs`: layouts never change numbers and survive keel, launch and reload; broken layouts fall back; attachment points per hull; every part drawn and every stock ship's fit drawn without errors); validator 0 errors.
- `npm run smoke` and `npm run smoke -- --dev` — 24/24 each.
- Browser (headless Chromium, 1440×900, real mouse): a contact sheet of all 23 stock ships and all 35 parts; in Fleet Command → Shipyard, chose the freighter hull, dragged a diesel engine from the tray onto a point and the integrated bridge onto another, clicked container bays, a crane, a reefer and a generator into free points; the meters, requirements, performance and bill updated; Buy 7 missing parts, Lay the keel → "The Freighter No. 1 is on the slip — 4.8 days"; Slips & yards showed the build; after 8 days it launched with its layout and is drawn side-on in Fleet. Fitted a destroyer (turbine, turbo-generator, guns, missiles, radar, sonar, bridge, comms, armour — 10/10 points, 4/8 mounts) and a sailing trader (sails, topsails, hold, crow's nest). Fixed from the runs: parts too small against long hulls (proportions stylised), the sea spilling outside the frame, oversized bridges on small craft, the hull number over the point labels. No page errors.

## Verification record — v0.25.0 (2026-10-15)

- `npm run check` — **296/296 tests passed** (5 new in `fleetcommand.test.mjs`); validator 0 errors.
- `npm run smoke` and `npm run smoke -- --dev` — 24/24 each.
- Browser (headless Chromium, 1440×900, real mouse): bought the company from the full-screen sale view; the home drawer's "Best jobs" sent the Gullwing Lass with one click; ⏭ Next event ran the clock to its departure; wheel zoom; opened on Mill Road Docks — contracts with the protection fold-out (guards, insurance, suggested escort, other ships), a mission sent with its pre-picked three-ship team; Fleet, Buy (cargo, warships, ports), Shipyard and Ledger sheets; Esc leaves a sheet, then closes; the tablet's Ships app opens it and closing returns to the tablet; "Send to…" then hovering Sund Harbour showed the dashed route and "7 h · costs 29", clicking sent the ship. Fixed from the runs: blocky land (now sampled at 0.5° and smoothed), the paper theme's white hover on dark buttons, "null" printed by an optional line, a misleading "no ship can take it" (now the real reason). No page errors.

## Verification record — v0.24.0 (2026-10-15)

- `npm run check` — **291/291 tests passed** (8 new in `shipyard.test.mjs`); validator 0 errors (now proving every hull can be fitted out).
- `npm run smoke` and `npm run smoke -- --dev` — 24/24 each.
- Saves tested across the expansion (logistics, naval and shipyard tests): a ship docked, under way, loading and on a contract; a convoy at sea; a stored pirate encounter pending; a warship on a mission; the shipyard under construction; a ship on the slip — each reloaded and resolved exactly once.
- Browser (headless Chromium, real mouse): commissioned the Mill Road shipyard — scaffolding on the quay and daily progress reports; when ready, the slipway; the Shipyard page's designer (freighter hull, six parts, maroon and gold paint; incompatible parts greyed with reasons; "✔ Seaworthy"); "Buy missing parts" then "Lay the keel" → "The Freighter No. 1 is on the slip — 4.5 days"; the hull drawn on the slipway at 22%; launched to berth 1 with its parts on deck. Fixed from the runs: a bollard and lamp stood on the slipway. No page errors.

## Verification record — v0.23.0 (2026-10-15)

- `npm run check` — **283/283 tests passed** (10 new in `naval.test.mjs`); validator 0 errors (now including the logistics registries).
- `npm run smoke` and `npm run smoke -- --dev` — 24/24 each.
- Simulated (node): unescorted risk from Mill Road — Sund and Lirre 0.8% (worst: a delay), Coup Cove 18% through the Pallas blockade and Reach (worst: captured), Varn 10% through its war zone; a frigate escort cut Coup Cove to 13% (worst: cargo) and added Fleet communications; mission estimates spread by ship type (a distress call ~95% for a frigate; a deterrence sweep ~20% for a frigate, ~70% for a battleship).
- Browser (headless Chromium): the Warships page with sail ships drawn under canvas; a contract's assign box with guards, insurance and escort choices and the risk line ("risk high (13%) · worst case: the cargo seized · through the Free State of Pallas blockade, the Pallas Reach"); the chart with pirate waters, war zones and the convoy; the Missions page with an estimate ("even odds (about 41%) · fitness 27/100"); the schooner and galleon at their Yards berth. Fixed from the runs: contract rows showed a fixed "risk low" label regardless of route (now the route's actual risk). No page errors.

## Verification record — v0.22.0 (2026-10-15)

- `npm run check` — **273/273 tests passed** (4 new own-fleet export tests in `logistics.test.mjs`); validator 0 errors.
- `npm run smoke` and `npm run smoke -- --dev` — 24/24 each.
- Browser (headless Chromium): with a licence, Yard 1 Works and Ober & Sons, an order of 12 crates for Lirre showed "⚓ Gullwing Lass — 2.2d · costs 143" in the FILL form (Morrow Blue Line would have charged ~1,320); SHIP 12 CRATES loaded and sailed it; the contact list read "⚓ GULLWING LASS · ETA 44H" and the globe drew the voyage along its sea lane. No page errors.

## Verification record — v0.21.0 (2026-10-15)

- `npm run check` — **269/269 tests passed** (13 in `logistics.test.mjs`, 5 in `character_ober.test.mjs`); validator 0 errors.
- `npm run smoke` and `npm run smoke -- --dev` — 24/24 each.
- Browser (headless Chromium, real keyboard and mouse): the Yards docks (Quay Road, cranes, bollards, three berths, the Salty Ober); Captain Ober on the quay in his peaked cap with his portrait in dialogue; "I hear the company's for sale" → the sale sheet (price, ports, ship, access) → Buy (120,000 → 80,000) → the Overview; Chart, Fleet, Contracts, Brokerage and Ports pages; after buying a Bluecap, both ships drawn at berth 1 with name boards; the tablet's Ships app with a contract under way, hovering the ship on the chart showed its route, progress, ETA and cargo; attacking Captain Ober played the kraken Wrath to his last line. Fixed from the runs: the dialogue box covered the sale sheet (now hidden while a panel it opened is up, and its topics are rebuilt after); the kraken's eye covered the banner (it now opens in the whirlpool); the chart's land looked tiled. No page errors.

## Verification record — v0.20.0 (2026-10-15)

- `npm run check` — **251/251 tests passed** (11 new in `streets.test.mjs`; transit, world, Halvermouth and quest tests updated for the widened coordinates); validator 0 errors.
- `npm run smoke` and `npm run smoke -- --dev` — 24/24 each.
- Browser (headless Chromium, real keyboard): at Bank Row × Precinct Row the four-tile roads, crossings and four traffic lights cycled; a westbound car waited at red and moved off on green; a pedestrian crossed on the green man. Driving east and steering hard, the wheel turned in, the handbrake let the tail out (slip 0.26 rad at 268 px/s) and laid tyre marks. Wellhead Circle, Lamplighter Circle, the Yards gate on Mill Road, the East Gate and the city's turning circles render as places, not dead ends. Over ~20 s among traffic the only sounds were the engine and a door — no horn. Fixed from the runs: the city ambience's synthetic horn beeps (removed) and the siren on cruisers driving away (off); new statues all read "FOUNDER" (now labelled). No page errors.

## Verification record — v0.19.0 (2026-10-14)

- `npm run check` — **240/240 tests passed** (market and arms tests rewritten for crates; new: crate content and order limits, the workbench, `crates`); validator 0 errors.
- `npm run smoke` and `npm run smoke -- --dev` — 24/24 each.
- Browser (headless Chromium, real mouse): the Market tab listed open orders (e.g. Varnistan 21× Crate of 9mm Pistols at 1,297 per crate, expiring Day 4); FILL opened the shipper form; SHIP 21 CRATES booked it ("Morrow Blue Line will deliver 21 crates to Varnistan in 2 days: 27,237 obols on arrival"). E at the armourer's workbench opened it; Make on the 9mm Pistol used the dock's parts, passed 30 minutes and put one pistol in the pack. Fixed from the runs: stray "null" lines in the Market tab. No page errors.

## Verification record — v0.18.0 (2026-10-13)

- `npm run check` — **237/237 tests passed** (7 new in `pursuit.test.mjs`); validator 0 errors.
- `npm run smoke` and `npm run smoke -- --dev` — 24/24 each.
- Simulated chases (node): at ★★★ two cruisers converged and rammed, and sitting still got you pulled over; floored east in a Corsair at ★, the Halvermouth cruiser was left behind at the gate and a fresh one picked you up in Westbrook. Browser (headless Chromium): in a stolen Pipit at ★★ by Civic Plaza a cruiser arrived with its light bar flashing, rammed, and the HUD showed "🚓 ×1 in pursuit" and "PULLED OVER — drive!", then jail. Fixed from the runs: a cruiser could turn into a tree and stay wedged (turning is now collision-checked and wedged cars can move free); cruisers cut across Civic Plaza (roads now much cheaper than plazas); a cruiser stuck behind traffic stopped for the player (cruisers pass through traffic; stuck = not moving, not low speed); pinned against the canal with the throttle down counted as "moving" (real ground speed); new cruisers kept spawning after you'd lost them. No page errors.

## Verification record — v0.17.0 (2026-10-13)

- `npm run check` — **230/230 tests passed** (7 new in `transit.test.mjs`); validator 0 errors.
- `npm run smoke` and `npm run smoke -- --dev` — 24/24 each.
- Browser (headless Chromium, real keyboard and mouse): at the Gullwing Road stop, E showed the bus times; "Wait for the bus" brought the No. 1 in three minutes later; E boarded it (12 → 10 obols); the HUD showed the direction and next stop; the bus drove west through Westbrook, through the gate into Halvermouth and stopped at the East End by the Grand Hotel, with city traffic on the streets; the world map showed stops and buses. Fixed from the runs: buses crept and lurched when something stood in the road (a steady look-ahead plus braking distance, and a short hold). No page errors.

## Verification record — v0.16.0 (2026-10-13)

- `npm run check` — **223/223 tests passed** (12 new in `vehicles.test.mjs`); validator 0 errors.
- `npm run smoke` and `npm run smoke -- --dev` — 24/24 each.
- Browser (headless Chromium, real keyboard and mouse): Fender's lot with Marty and three display cars; E on Marty, "I'm looking for a car" opened the dealership panel; Buy put a Pipit on the forecourt; E got in; W drove onto Westbrook Row, the car reached 26 mph, and driving west through the gate arrived in Halvermouth with the car; night driving showed headlights; the Beaumont showroom and panel rendered. E on Marty's Dray → Hotwire → the bar filled while standing still → driving it, with "Marty saw that!". Fixed from the runs: cars were too small beside people (scaled up 35%); the car couldn't reach a region gate (its nose hit the map edge first); rust patches drawn off the body; walking into doors was blocked by the car check. No page errors.

## Verification record — v0.15.1 (2026-10-13)

- `npm run check` — **211/211 tests passed** (3 new in `worldmap.test.mjs`); validator 0 errors.
- `npm run smoke` and `npm run smoke -- --dev` — 24/24 each.
- Browser (headless Chromium, real mouse): the terminal in Yard 1 Works with three shipments (sea, air, sea) showed the monitor frame, CONTACTS with progress bars and the globe with routes, ambient traffic and wars; sweeping the mouse found a shipment and showed its tooltip (operator, destination, 8× 9mm Pistol, value, 14%, ETA 62h, insured); hovering land showed Varnistan with its inbound rifles; dragging and the wheel turned and zoomed it; F6 opened the market. The tablet's Business app showed the same console. The world map fitted the whole world (Yards, Halvermouth, coast, joined by roads), zoomed to Halvermouth street level with icons and names, and hovering showed "🛡️ Ironclad Securities — Security firm". Fixed from the runs: a crash when the first animation frame's timestamp preceded the start time; the prompt read "root@undefined"; the active command tab lost its text on hover. No page errors.

## Verification record — v0.15.0 (2026-10-13)

- `npm run check` — **208/208 tests passed** (7 new in `tablet.test.mjs`); validator 0 errors.
- `npm run smoke` and `npm run smoke -- --dev` — 24/24 each (the J check now expects the OberPad).
- Browser (headless Chromium, real mouse): J on a new game opened the OberPad with no Business app and an empty feed. After buying a works, ordering parts, shipping pistols to Teshvar, buying Ober's Oil shares and skipping days, the HUD showed "📱 9 new"; clicking it opened Home with the delivery, shipment, news, dividend and share-move notifications. Business showed the Yard 1 Works globe and tabs; ordering ×10 steel from Parts worked remotely. Stocks showed the price chart, and Buy 5 took the shares from 10 to 15. Fixed from the run: the status bar vanished after a trade; the chart drew too small; the Overview still said the market "opens soon". No page errors.

## Verification record — v0.14.0 (2026-10-13)

- `npm run check` — **201/201 tests passed** (12 new in `market.test.mjs`); validator 0 errors.
- `npm run smoke` and `npm run smoke -- --dev` — 24/24 each.
- Browser (headless Chromium, real mouse): the Market tab listed news, buyers (Varnistan and Caldera at war, Pallas embargoed) and prices; choosing Teshvar, Stork Air Charter and insurance and clicking All on two items quoted 9,720 obols value / 2,916 fees, and "Ship it" booked it (the globe shows the route). In Mill Road Yards an RPG (after a reload) hit Al Gebra and Max Imum with Mason Nails standing beside them: Al and Max hurt, Mason untouched, no Wrath; a Hornet dove at Dee Nominator; a Longbow's reticle counted down and struck. Scorch marks and camera shake visible. Fixed from the run: one explosion produced a stack of identical police-call toasts (calls now merge per scene). No page errors or game warnings.
- Audio rendered offline: `sfx_explosion` 0.89; `sfx_rocket` and `sfx_drone` were too quiet (0.15, 0.06) and were raised (0.47, 0.28). Not listened to by ear.

## Verification record — v0.13.0 (2026-10-13)

- `npm run check` — **189/189 tests passed** (14 new in `arms.test.mjs`); validator 0 errors.
- `npm run smoke` and `npm run smoke -- --dev` — 24/24 each.
- Browser (headless Chromium, real keyboard and mouse): Pipecreek Armory with Lucas at the counter; E at the counter opened his shop and buying a pistol set the pitch flag; his dialogue opened with portrait. Mill Road Yards rendered. In Yard 1 Works, B placed six workstations, an arm and belts by clicking; three hired staff were auto-assigned and walked to their stations; a barrel was made in the first minutes. The terminal: rotating globe with countries, borders and routes; Staff, Research, Parts and Market tabs. F on Lucas played the arms Wrath (crates, missile, drones, SOLD tag). Fixed from the run: a stray "null" line on the terminal. No page errors or game warnings.
- Audio: `sfx_wrath` (arms) and `sfx_crate` rendered offline; peaks 0.37–0.93. Not listened to by ear.

## Verification record — v0.12.0 (2026-10-13)

- `npm run check` — **175/175 tests passed** (13 new in `factory.test.mjs`); validator 0 errors.
- `npm run smoke` and `npm run smoke -- --dev` — 24/24 each.
- Browser (headless Chromium, real keyboard and mouse): bought Warehouse 7 at its FOR SALE sign through the choices panel; pressed B; picked tools from the build bar; placed an arm (rotated with R), a soldering station, a second arm and a 12-belt line ending in the output crate by clicking tiles; right-clicked a belt away and placed it back; Esc left build mode. In real time the arm fed parts from the input bay, the station soldered cores, they rode the belt (sliding between tiles) into the output crate. The workbench menu listed what could be hand-crafted. Fixed from the run: the build bar's buttons were unclickable (the HUD layer ignores the mouse; the bar now takes it); item names were lowercased in the workbench menu. No page errors or game warnings.
- Performance: 382 fully loaded belts across two warehouses — a whole skipped day (sleeping) in ~0.4 s; belts are simulated in one downstream-first pass.

## Verification record — v0.11.0 (2026-10-13)

- `npm run check` — **162/162 tests passed** (21 new in `gang.test.mjs`); validator 0 errors.
- `npm run smoke` and `npm run smoke -- --dev` — 24/24 each.
- Browser (headless Chromium, real keys): the Abacus with Arthur at his desk and Minnie at the bar; E at the counter opened Minnie's shop with all six calculators; talking to Ray in the Sumps and choosing "Try this — on the house" won him as a customer (anger 12); a calculator high showed on the HUD; Journal → Customers listed everyone with Ray's paged order; at anger 60 Al Gebra jumped the player in the Sumps; F on Arthur played the maths Wrath (frames checked through to UNDEFINED). Fixed from the screenshots: the counter blocked talking to Minnie (now the counter serves you); "Likes the The Brick" wording; falling digits lingering over the finale. No page errors or game warnings.
- Audio: `sfx_wrath` (maths) and `sfx_digit` rendered offline; peaks 0.53–0.88. Not listened to by ear.

## Verification record — v0.10.0 (2026-10-13)

- `npm run check` — **141/141 tests passed** (20 new in `police.test.mjs`); validator 0 errors.
- `npm run smoke` and `npm run smoke -- --dev` — 24/24 each.
- Browser (headless Chromium, real F key): standing at Chief Order's visitor chair and attacking triggered the LAW Wrath; frames checked across the timeline (banner and orbiting badges/cuffs/stamps, squad cars, the gavel, paperwork stamped GUILTY behind dropping bars); the struck-down card's *Wake up (in a cell)* put the player in the cell block with the HUD showing time left. Outdoors at ★★, Sgt. Case gave chase, the cuffing bar filled and the player was arrested. Fixed from the screenshots: the cuffing label overlapped name tags (moved under the player); the long banner touched the screen edges (narrower). No page errors or game warnings.
- Audio: `sfx_wrath` (law), `sfx_ram` (car and gavel) rendered offline; peaks 0.43–0.92. The render caught `sfx_ram` scheduling its squeal before time zero (a crash at a fresh audio clock) — fixed. Not listened to by ear.

## Verification record — v0.9.0 (2026-10-13)

- Bug report from the owner: attacking Sir Moneybucks showed nothing. Reproduced in Chromium by walking up to him at his real haunts and pressing F: in the dining room the closest the player can stand is 63 px (the table is in the way) while a fist reaches 46 px — the swing silently missed. Earlier tests always stood the player adjacent. Fixed and covered by two regression tests (across-the-table swing; a near-miss bullet).
- `npm run check` — **121/121 tests passed**; validator 0 errors.
- `npm run smoke` and `npm run smoke -- --dev` — 24/24 each.
- Browser: real F-key attacks on Sir Moneybucks (dining room, study) and Mason (excavator cab) all triggered their themed Wrath; frames captured across the timeline for both themes (aura, first strikes, finale). No page errors or warnings.
- Audio: all three `sfx_wrath` themes, `sfx_gusher` and `sfx_beam` rendered offline in Chromium; peaks 0.71–0.89 (no clipping). Not listened to by ear.

## Verification record — v0.8.0 (2026-10-13)

- `npm run check` — **118/118 tests passed** (5 new in `debug.test.mjs`); validator 0 errors.
- `npm run smoke` and `npm run smoke -- --dev` — 24/24 each.
- Browser (headless Chromium, real keyboard): ` opened the menu with the console focused; typed `money 777`, `give pistol`, `health 35` (all applied); Up recalled the last command; clicked *All weapons*; searched "feather", set qty 3 and clicked Give; teleported to Halvermouth from the map list; Esc closed the menu; letters typed into the console did not move the player or trigger attacks; the Pause menu shows the Debug entry. No page errors or game warnings.

## Verification record — v0.7.0 (2026-10-13)

- `npm run check` — **113/113 tests passed** (5 new in `wrath.test.mjs`); validator 0 errors.
- `npm run smoke` and `npm run smoke -- --dev` — 24/24 each.
- Browser (headless Chromium), with a real F-key attack: on Mason at the construction site (orange) and on Sir Moneybucks at the Quay (gold), frames captured across the timeline — runes and banner (1.9 s), first lightning strike (3.45 s), the strike storm (3.9 s), the pillar and embers (5.15–5.9 s), the last word on black (8.5 s), the *struck down* card; clicking *Rise again* woke the player at home at 08:00 the next day with half their money and the HUD restored. No page errors, no game warnings, no audio failures.
- Audio: `sfx_wrath`, `sfx_thunder` and `sfx_gunshot` rendered through an `OfflineAudioContext` in Chromium; the score sounds for ~7 s and peaked at 1.34 (clipping) — lowered to 0.91 before release. Not listened to by ear.

## Verification record — v0.6.0 (2026-10-13)

- `npm run check` — **108/108 tests passed** (10 new in `combat.test.mjs`), stable across three runs; validator 0 errors (2 intentional warnings).
- `npm run smoke` — 24/24; `npm run smoke -- --dev` — 24/24.
- Browser playtest with real input (headless Chromium): pressed F next to Mags → she took 9 damage, her health bar appeared and she fought back (player 100 → 74 over 2.5 s); bought a pistol, 9mm rounds, a shotgun and shells through the gun-counter shop panel by clicking; equipped from the inventory; R reloaded (12/12 · 8); two mouse-aimed clicks across the Civic Office hit Osric (100 → 39) who fled; a knock-out shows him lying down with "KNOCKED OUT" under his bar. No page errors, no game warnings.
- Not verified: feel/balance over long play, phones/touch (no touch controls for combat), audio by ear.

## Verification record — v0.5.0 (2026-10-13)

- `npm run check` — **98/98 tests passed** (6 new in `world_halvermouth.test.mjs`); validator 0 errors (2 intentional warnings).
- `npm run smoke` — 24/24; `npm run smoke -- --dev` — 24/24. (The smoke test caught a regression during this build — a roof variable moved out of scope broke the chimneys on ordinary houses — fixed before release.)
- Browser walkthrough (headless Chromium): walking west from Westbrook's gate loads Halvermouth at the East Gate; screenshots of the plaza (day and night), Bank Row and Ober's Oil Tower, the Financial District at night, Precinct Row, Iron Row, the Sumps (day and night), the Docks, all three interiors, the city map tab and the coast map's gateway arrow. No page errors, no game warnings. 60 fps measured in the plaza and on Bank Row.
- Not verified: phones/tablets (large ground layer), Firefox/Safari, audio by ear.

## Verification record — v0.4.0 (2026-10-13)

- `npm run check` — **92/92 tests passed** (13 new in `character_mason.test.mjs`); validator 0 errors (2 intentional warnings).
- `npm run smoke` (standalone `file://`) — 24/24 passed; `npm run smoke -- --dev` — 24/24 passed.
- Property lifecycle verified headlessly on a **test-only plot** (contract → Osric permit → 3-day build at 18:00 → building + door on the map → interior furniture by blueprint → survives save/load; rental pays 8/day). No real plots exist, so the finished-building path has not been seen in a browser; `Game.rebuildMaps()` was exercised in Chromium with no errors.
- Browser screenshots (headless Chromium): Mason in the excavator cab at 11:00 with Dee and Barnaby on site; Westbrook Row and the canal basin; Mason's portrait in dialogue; the site office and the contracts board ("No plots surveyed yet"); the crew at home in the Plumb Line at 20:00; the stitched region map. No page errors.
- Not verified: Firefox/Safari; GitHub Pages (deploys automatically on push); audio by ear (songs compile-tested only).

## Verification record — v0.3.0 (2026-10-13)

- `npm run check` — **79/79 tests passed** (3 new seam tests); validator 0 errors.
- `npm run smoke` (standalone `file://`) — 24/24 passed.
- Browser walkthrough: holding D from x 57.8 in Lanternside crossed into the Ober Fields at x 0.9 with no fade or jump (positions logged every 250 ms); the region map and minimap draw both maps stitched. No page errors.
- Not verified: Firefox/Safari; GitHub Pages (deploys automatically on push).

## Verification record — v0.2.0 (2026-10-13)

- `npm run check` — **76/76 tests passed** (incl. 14 in `character_moneybucks.test.mjs`); **validator 0 errors** (2 intentional warnings).
- `npm run smoke` (standalone `index.html` via `file://`) and `npm run smoke -- --dev` — **24/24 each**, no page errors or engine warnings.
- Scripted browser walkthrough of the new content, no errors: walking east into the Ober Fields through the road exit; the estate and fields by day; Sir Moneybucks's study, dialogue with the supplied portrait, the share register opened from dialogue, a full Ledger match; the relit lighthouse and canal slick at night.
- Ledger balance (simulation, 4–6k matches): naive play wins ~45%; reading tells wins ~50–53%, rising with Wits.
- Frame rate with 14 residents: ~57–60 fps at 1600×900 in headless software rendering.
- Not verified: audio by ear; Firefox/Safari; GitHub Pages hosting.

## Verification record — v0.1.1 (2026-10-13)

- `npm run check` — **62/62 tests passed; validator 0 errors.**
- `npm run smoke` against `file://…/index.html` with no server running — **24/24 passed**, including saves persisting across a page reload and Continue resuming the game.
- `npm run smoke -- --dev` against `dev.html` — passed.
- Not verified: GitHub Pages hosting itself (Pages must be enabled in the repository settings; the page uses only relative, self-contained content, so no differences are expected), Firefox/Safari `file://` behaviour.

## Verification record — v0.1.0 (2026-10-13)

Actually run in the development container (Node 22, Chromium via Playwright 1.56):

- `npm run check` — **59/59 tests passed; validator 0 errors** (2 intentional warnings: the Vane house and Collective Hall doors have no obtainable key).
- `npm run smoke` — **21/21 checks passed, no page errors, no engine warnings** (run 3× consecutively): title + version, new game, reading the letter, leaving the flat on foot, inventory/journal/map panels, dialogue with Mags and topic list, dialogue → shop hand-off and purchase, returning to the conversation, Ask-about box, wardrobe container, sleeping until morning, quick save/quick load restoring state, night lighting, pause menu version.
- Frame rate: steady ~60 fps at 1600×900, day and night, in headless software-rendered Chromium (rAF measured over 2 s each).
- ESLint (no-undef, unreachable code, duplicate keys): 0 errors.
- Screenshots reviewed by eye: title backdrop, flat, outdoors (day and night), café dialogue, shop, map with fog.

Bugs found and fixed by this verification: double-started vibrato oscillators (audio exception on every note), Esc closing a conversation instead of the shop opened from it, `notifyKind` logged as an unknown effect.

Not verified in this session:
- Audible quality of music/SFX (headless browser; synthesis code ran without errors, but no human listened).
- Firefox and Safari.
- Very long play sessions (multi-day real-time memory/performance).
- Touch devices (not supported yet).
