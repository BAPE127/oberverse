# Aerospace — Starling Flats Aerospace Park (v0.55.0–v0.58.0)

The aerospace industry, built in stages (owner's brief, "OBERVERSE MASTER DEVELOPMENT PROMPT — Aerospace Manufacturing, Defense Contracts, Rocket Launches, Satellite Networks, and Integrated Shipping"). Owner's answers to the questions asked before building: a **new region east** of the Ober Fields; the player gets in by **buying a failing firm**; **staged releases**; and every NPC — new ones and everybody who used to share a dorm, bunk room, staff corridor or shack — gets **a home of their own**.

| Stage | Version | What |
| --- | --- | --- |
| I | **v0.55.0** | Homes; the region, campus, runway and launch complex; the people; the shared engine (catalogue, tenders and bids, contracts, pipelines, materials and purchase orders, books); Meridian (operating and listed as MRDN); Roost Aeroworks for sale; the aerospace terminal |
| II | **v0.56.0** | Procurement through **Ober & Sons Maritime**: internal shipping jobs on the existing voyage system, internal rates (0–5% of the market freight), intercompany accounting, the supply-chain savings view |
| III | **v0.57.0** | **Room to grow**: halls you build on the Park (sites that become walkable buildings, bays fitted into their slots), technicians, engineers and inspectors with experience and training, product configuration, a reputation you can read, and events with causes |
| IV | **v0.58.0** | **Wheels up**: the field in motion — aircraft pushed back, taxiing, rolling and climbing away (and Meridian's own coming home), rockets rolling out on the crawler, counting down, lifting off or lost, the secure convoy on the road, and the sound of it |
| V | v0.59.0 | Satellite services: roles, networks, recurring revenue, lifecycles; research tree polish; events and achievements; full financial reports |

## Where

**Starling Flats** (`starling_flats`, 180 × 120 tiles, its own region `starling`): up the **Cut** — the county road now runs on from Wellhead Circle through a notch in the escarpment (gateway doors on the Ober Fields' east edge ↔ Starling's west edge). Map: `src/content/maps/starling.js`.

- **Starling** (north of Mesa Road): eleven houses on Mesa Road — the first five are **Derrick Row**, the Ober's Oil crew's own houses (a short walk down the Cut to the refinery) — and the **Contrail Café**.
- **The Park**: the freight depot (where materials arrive), the security gate on Campus Drive, **Roost Aeroworks** (office with the terminal, Hangar 1 with its light bay, a three-slot apron, expansion land), **Meridian Aerospace** (the HQ tower with the MRDN board, the final assembly hall, the flight-line hall with the secure bay, space systems with the rocket bay and two clean rooms, the engine test stand, the paint shop, its apron with the company jet and the test Kestrel).
- **The airfield**: runway 09/27 (139 tiles) with edge, threshold and approach lights, designators, centreline and aiming points; taxiway A with hold bars; both aprons with numbered stands (tile `a`, markings from `map.airfield` in `src/engine/drawPixelGround.js`); flight operations, the control tower, the approach radar, windsocks.
- **The launch complex** (south-east, behind a razor-wire fence): the vertical integration building, Meridian's pad with its service tower and flame trench, the propellant farm (the kerosene comes from Ober's Oil), pad 2 (a surveyed site for the player), launch control and the ground station outside the fence.
- **The boneyard** (south-west): old aircraft nobody has the heart to scrap.

## The people (`src/content/characters/aerospace.js`)

| Who | Role | Home |
| --- | --- | --- |
| Wilhelmina "Billie" Roost | Founder of Roost Aeroworks; sells it to you | 6 Mesa Road |
| Dr. Imogen Hale | Chief executive, Meridian | 7 Mesa Road |
| Ailie Ronn | Meridian's chief test pilot | 8 Mesa Road |
| Rudy Durr | Meridian's head of production | 9 Mesa Road |
| Tina Minus | Launch director | 10 Mesa Road |
| Wrenna Torq | Roost's chief mechanic (stays on) | 11 Mesa Road |

## The engine (one for both companies)

Rules are pure modules in `src/aero/` (`catalog.js`, `pipeline.js`, `tenders.js`, `books.js`, `valuation.js`, `rival.js`); the simulation is `src/systems/aerospace.js` (`game.aero`); every number is in `src/content/aerospace.js`. Meridian and Roost run on the same code: the same tenders, suppliers, stock at suppliers, pipelines, inspections and books — the rival gets nothing free.

- **Catalogue**: 18 aircraft (private, passenger, fighters, bombers — fictional defence products), 6 launch vehicles, 2 fictional strategic missile products, 13 satellites. Each: price, work days, bay type, bill of materials, research, minimum quality; aircraft carry a full flight `spec` and `look`; rockets `lift`; satellites `mass`, `role`, service life and running costs.
- **Tenders** (06:00): customers (airlines, charter firms, agencies, defence buyers…) post tenders from finite, slowly replenished budgets. **An aircraft tender or contract is for 1–5 aircraft, never more** (`quantityError`, enforced at tender generation, bid, and `makeContract` itself). Defence buyers under an arms-market embargo get no lawful bids. Bids are sealed, one per company; at the close the customer ranks valid bids by its own weights (price, delivery, quality, reputation) and awards a contract with a deposit (20–30%).
- **Contracts and units**: one persistent unit per item, linked to its contract. Late delivery costs 4% a day (up to 40%) and reputation; cancelling forfeits the deposit and costs 10%.
- **Pipelines** (`PIPELINES`): aircraft 13 stages, rockets 15, strategic products 9 (secure convoy — never the pad), satellites 15. A unit takes a bay only when the next stage's materials are in hand (nobody holds a bay waiting for parts); materials are reserved per unit and consumed per stage; inspections fail by quality (rolled once at creation and kept), costing rework days; aircraft go to the apron (limited slots) and leave when the customer's crew arrives; rockets go to the pad (one at a time, two days to refurbish), launch (outcome rolled once), deploy; satellites ride a launcher the company builds at cost (bin-packed by mass and lift), integrate on the pad, launch, commission, then join the satellite registry.
- **Materials and suppliers**: 20 materials (Ober's Oil sells fuel, propellant and chemicals — every lot is barrels the refinery sells); 11 suppliers, local or overseas, with finite stock shared by both companies. Landed cost = goods + duty + freight + handling; foreign goods come by an independent carrier (rates by value and distance over the real sea lanes) to Mill Road Docks, then up the Cut by truck; a supplier's reliability decides a late shipment once, at order time. Materials are usable only once received.
- **Books** (`src/aero/books.js`): revenue on delivery (deposits deferred), materials an asset until consumed and delivered, wages/upkeep/overhead each morning, research, rework, launch costs, penalties, interest; internal freight (`cogs_freight_internal`) and the intercompany account, both excluded from consolidated figures; losses at sea (`losses`).
- **Meridian's management** (`src/aero/rival.js`): crews its bays, bids what it can deliver at cost plus a markup that rises with load, orders materials for everything in hand from the cheapest supplier, researches out of profits, builds a bay of its busiest type when cash-rich.
- **MRDN** (`src/aero/valuation.js`): fair value = equity + P/E × normalised daily earnings (before research; half trailing month, half order book) + half the backlog's margin, per share; the price moves 12% of the way to fair value each day, ±2% mood. Buy and sell on the tablet's Stocks app (1% fee, at most 5% of the company); dividends on Moondays from the week's positive earnings.

## Materials in your own ships (v0.56.0)

Own **Ober & Sons Maritime** as well as Roost Aeroworks and your foreign materials can come in your own ships instead of by Dunmere Parcel Post. Meridian never can (it's not your shipping line); local suppliers still truck. Numbers: `INTERNAL` in `src/content/aerospace.js`.

- **Modes** (Supply tab): *in your own ships* (default once you own both) or *by carrier*; and when no ship is free, *fall back to a carrier after 24 h* (default) or *wait for a ship*. A manual order shows both landed costs and offers **Order (carrier)** / **Order (own ship)**; automatic ordering compares suppliers on the cost and time your own ship would actually give (`bestSupplier`).
- **Consignments** (`state.jobs`, `SJn`): every internal purchase order joins the open consignment from its supplier's port to Mill Road Docks (up to the biggest hold you own). Materials are paid for (goods and duty, at full price) when ordered — the freight is what changes.
- **Dispatch** (every 15 game minutes): a docked cargo ship that is free (no contract, no cargo, not in a convoy) and big enough is reserved for the consignment (its hold gets a reserved aerospace cargo, so the logistics terminal can't offer it a contract). If it's elsewhere it **sails there empty** — a real voyage, running costs and port fees paid by the line. When every order in the consignment is ready at the supplier's port, it **loads and sails** (`logistics.loadAero`): a real voyage on the sea lanes, with its pre-rolled delays and its piracy risk (aerospace cargo is attractive: ×1.25). No ship ever teleports and nothing arrives before the ship docks; then the trucks up the Cut (3 h) and it's in stores.
- **The internal charge**: when it loads, the aerospace division pays the shipping line **1%** of what the carrier would have charged on a route your fleet sailed in the last 30 days, **2.5%** otherwise, **5%** if the ship had to sail there empty. The voyage's real running costs and port fees are the shipping line's, paid once. The charge leaves your wallet and comes straight back (net zero); the shipping line books it as internal revenue (`ledger.internal`), the aerospace books carry it with the materials into cost of sales (`cogs_freight_internal`), and the group view cancels it.
- **Delays** (a gale, a slow port) move the consignment's ETA, every purchase order in it, and each unit waiting on it — the report names them. **Lost cargo** (piracy, a seizure): the orders are lost, nothing arrives, the goods and charge are booked to `losses`, and a shortfall is ordered again.
- **Make it urgent / Send by carrier instead** on each consignment; the fallback policy does the latter by itself after a day without a ship. A switched order pays the carrier's normal market rate.
- **Savings**: the dashboard and Supply tab show what a carrier would have charged, the internal charges paid, the saving on the aerospace books, the group saving after the voyages' real costs, and what's expected on work in hand. The Books tab's **group** table shows aerospace and shipping line operating profit with internal charges eliminated (buying ships and the line itself is capital, not an operating cost).

## Halls and the West Works (v0.57.0)

Roost's bays stand in **halls**, and the halls are on the map. `HALLS` in `src/content/aerospace.js` is the table (where, how big, which slots, cost, days, upkeep); `src/content/maps/starling.js` builds each hall's building and room from it.

| Hall | Where | Slots | Build |
| --- | --- | --- | --- |
| Hangar 1 | the firm's own | 1 light | — |
| Hangar 2 — light assembly annex | north of the office | 2 light | 150k · 5 d |
| Research laboratory | beside Hangar 1 | — (research 25% faster; better odds of a breakthrough) | 320k · 7 d |
| Assembly hall | West Works, across Campus Drive | 2 heavy (or light) | 450k · 8 d |
| Widebody & secure hall | West Works | 1 wide (or heavy, light) + 1 secure | 700k · 10 d |
| Space systems annex | West Works | 1 rocket + 2 clean rooms | 650k · 10 d |

- **A site becomes a building.** Until you build it, a hall is a building site on the map (`hall_site` prop: gravel, stakes and a string line, an excavator and a site cabin); once paid for, it grows over its build days — slab, steel frame, wall panels, roof, a tower crane — and then it's the hall, with a walkable room (a `bay_slot` prop per slot, a bench, racks, a board). Its door stays shut ("Still a building site") until it opens; NPCs can't path through it either (`lock.aeroHall`).
- **Bays go into slots.** `buildBay` needs a free slot that suits the bay in an open hall (or a chosen one) and, with none, says which hall to build. A bay's `slot` ties it to the `bay_slot` prop (`aero.slot`), which draws it vacant (bare floor and anchor plates), being fitted (scaffold poles), idle or working. A larger slot takes smaller bays.
- **Meridian's halls are fixed** on the map (its bays keep the ids they were drawn for). A bay beyond them goes up at another of its sites — unseen, and half as much again.
- **The apron side** has sites for the engine test cell and the inspection gantry (`aero_facility`), drawn the same way.
- **Old saves** (`migrateHalls`): each Roost bay with no slot goes into the first free slot that suits it, opening the hall it needs; nothing is charged again and nothing is taken away. A bay with no slot to be had keeps working, unseen.

## People and quality (v0.57.0)

`STAFF` in `src/content/aerospace.js`; the same rules for Roost and Meridian (`rival.js` hires to a little over what its bays call for and trains when it can afford to).

- **Technicians** crew the bays (the old headcount; wages 70). **Engineers** (140; 8% of the technicians the bays call for) run the drawing office and research: short of them, engineering stages and research take longer (never below 40%). **Inspectors** (100; 4%) are the testing and inspection capacity: short of them, inspections take longer (never below 30%) and quality falls; more than the work needs raise it, up to +8 at double.
- **Experience** (0–100, the company's own) sets pace (80–120%) and quality (±0.12 a point from 50). New hires arrive at 20 and dilute it; training raises it — none (the crew learn slowly), standard (6 obols per technician a day) or intensive (14) — with diminishing returns. A big hiring round hurts; it takes months to recover.
- **Quality** is one visible sum: the firm's standing + research + inspection equipment + experience + inspectors (`qualityBreakdown`); the Hangar page shows each part, the chance an inspection fails for the work in hand, and the last inspections (`qaLog`).

## Product configuration (v0.57.0)

`OPTIONS` in `src/content/aerospace.js`; the pure rules in `src/aero/config.js`. A customer's tender names the configuration it wants (by its kind's habits and a hash of the tender's id — never the dice, so nothing else about the market moved); bounded groups per product: cabin layout, VIP interior, range, flight deck, sensors, endurance, heavy stores, spray gear, dual controls, fairing, upper stage, satellite payload, design life, hardened bus.

- `configure(C, product, config)` gives the product as it would really be built — bill of materials (whole extra lots of materials the line really consumes), days, price (the extra cost × the option's markup, so every option is worth ~1.4–1.7× what it costs and margins hold), quality required, flight spec (seats, range, payload…), effects (launch risk, commissioning risk, design life, service income) — and `Aerospace.pOf(x)` is the one accessor every calculation about a tender, a contract or a unit reads.
- The configuration travels: tender → contract → units → the aircraft entity (`config`, and its configured `spec`, for the flight update). The five-aircraft cap is untouched (`quantityError`, `makeContract`).
- An option that needs research can't be bid on without it, and the answer names the research.

## Reputation and events (v0.57.0)

`EVENTS` in `src/content/aerospace.js`; the logic in `src/aero/events.js`.

- **Reputation** is changed in one place (`repChange`), clamped to 0–100 and logged with its reason (`repLog`, shown on the Standing page and adding up to the number). Late deliveries in a row cost 4, 6, 8… (capped at 3×); failed inspections in a fortnight cost 1, 1.5, 2…; on-time runs of three or more and builds that passed first time earn a little extra; a lost launch costs 6; a cancelled contract 8. A lost bid's report says what the winner beat you on, by that customer's own weights.
- **Events come from conditions**, gated by a stable hash of the day (a reload can't change them) and with cool-downs: a **government order** (reputation 50+ and something you could build: a real tender, 3–5 aircraft, a bigger deposit, closed below the standing it names; delivered in full and on time it earns reputation and a milestone); a **constellation contract** (only if you can build, launch and commission satellites; up to 12); a **research breakthrough** (rolled when the research starts, kept with it; better odds with a laboratory and a surplus of engineers; +2 quality for good); an **expansion offer** (a bay has been the bottleneck for days: a quarter off the hall that would relieve it, for a week); a **regulator's audit** (three failed inspections in a fortnight: fund a corrective programme, pay the fine, or ignore it and be fined harder); and **the firsts** — milestones, once each, with their reward.

## The terminal — Roost Aeroworks · Operations (v0.57.0)

`src/ui/aerospace.js`, full screen like Fleet Command (`#modal-panel.aerocmd`, styles `.ao-*`). Opened from the Roost office terminal, the tablet's Aerospace app and Billie; Meridian's share board opens it read-only on the Meridian page.

- **Top bar**: clock, ⏩ 1 h / 6 h / ⏭ next morning (06:00, when tenders are posted and decided) — real time passing (`game.skipTime`), drawn as it goes; money and today's result.
- **Rail** (keys 1–8): Floor · Tenders · Contracts · Supply · Hangar · Standing · Books · Meridian, with badges (tenders you can bid on, late contracts, shortages, decisions and offers). Esc returns to the floor.
- **Floor** (canvas): every bay draws its unit from `Aerospace.unitLook(u)` — the same view the bays in the world use (`computeView`) — with the stage lamp board, stage progress, time left, blocker and welders; the header names the hall (on wide cards); idle bays name what's next for them; bays being fitted are hatched. Below: queue & drawing office, apron stands, launch pad, stores, inbound. Click anything for its card on the right; with nothing selected the card is the overview (KPIs, alerts that link to the fix — including engineers and inspectors short, an audit to decide, a hall on offer — tenders you could win, next deliveries, shipping savings).
- **Tenders**: filterable cards (product art, the configuration the customer wants and what each option costs and does, the customer's priorities, your cost and earliest delivery, event badges and the reputation a major order asks for) with a sealed-bid composer. **Contracts**: units as stage strips, with their configuration. **Supply**: stores with one-click orders for shortages, your own ships, purchase orders, supplier cards. **Hangar**: **People** (three roles, wages, experience, training), **Quality** (the breakdown, failure chances, the last inspections), apron-side facilities, **Halls** (state, slots, fit a bay, build the hall), research with what it unlocks. **Standing**: reputation and its ledger, decisions and offers, the firsts. **Books**: day-by-day chart, statement, group table, reports. **Meridian**: its numbers, order book and MRDN.

## The field in motion (v0.58.0)

Everything that moves on Starling Field is **scripted from the clock and the saved entities** — nothing is simulated frame to frame and nothing is stored but a start time. Pure rules: `src/aero/flight.js` (aircraft), `src/aero/launch.js` (rockets); the glue to the simulation: `src/aero/field.js`; every number: `FLIGHT` in `src/content/aerospace.js`; the geometry (`airfield`, `launch`, `convoy`) is in `src/content/maps/starling.js`; drawing: `drawField`, `drawLaunches` and `drawConvoys` in `src/engine/renderer.js` and `src/engine/drawLaunch.js`. A game minute is a second of play at the usual speed, so a departure — pushback, taxi, hold, line-up, roll, climb out — takes about a minute to watch (25 to 60, by how far it has to taxi).

### Aircraft (`flight.js`, `field.js`)

- **States** of an aircraft entity: `awaiting_delivery` → `taxiing` → `takeoff` → `airborne` → `departed` (delivered aircraft), and `parked`, `landing`, `maintenance`, `stored`, `retired` for the flight update. `NEXT` lists which may follow which; nothing leaves `retired` or `departed`.
- **Stands**: a finished aircraft is given the first free run of stands that fits it (`stand` = { apron, slot, size }), drawn parked nose to the stop bar. Meridian's company jet and test aircraft keep their own stands, beyond the six it builds on.
- **A departure** starts when the customer's crew collects the aircraft: the price is paid and ownership passes then (as before), and the aircraft is *cleared* — the earliest time the runway is free for its roll and the taxiway for its start (`scheduleDeparture`). It is pushed back along the lead-in, taxies (Roost's apron by its own connector, Meridian's straight onto taxiway A) to the threshold of the runway in use — **09** on most days (wind from the west, `windRunway(day)`, a fixed function of the day: the windsocks follow it), **27** on the rest — holds short, lines up, rolls and climbs away off the map. The roll is its own take-off run in metres (`spec.takeoff`), compressed to the runway it has; the climb speeds up from the speed it left the ground at; a VTOL (the Aurora) lifts off its stand. At the end it is `departed`.
- **An arrival** is the mirror (a straight-in final, touchdown, braking, off at the far connector, taxi in, nose-in on its stand). Meridian's own aircraft use it: each morning `scheduleAmbient` decides from the day alone who goes out (the test Kestrel: most days, one or two sorties between 09:00 and 15:00, 22–45 minutes; the company jet: about one day in two, 90–420 minutes) and `scheduleArrival` clears their landings, sharing the one runway with deliveries (`state.field.reserved`). While they're out their props on the apron are hidden.
- A plan is rebuilt from saved facts — `move` = { kind, t0, rwy } and the aircraft's `stand` — so a reload or a night's sleep puts every aircraft exactly where it belongs; `tickField` gives it the state its plan says each minute.

### Launches (`launch.js`)

- **Rollout**: when a rocket takes the pad (`to_pad`), it leaves the integration building (Roost's arrives by the gate) **standing on the crawler** and takes half an hour to the pad; the pad is taken from then and its deck is bare until it arrives (`pad.roll`, `unit.rollout`).
- **The launch step is a sequence**, fixed when it starts from the unit's own roll (`unit.seq`; the show *is* the outcome): **T-20** countdown (the board by the pad shows it in "seconds" — a game minute each), **T-5** ignition (flame, smoke across the deck, the ground shaking, the glare at night), lift-off and ascent with its trail and the spent stage falling away at T+5 — or, for a vehicle that was always going to be lost, the moment it goes wrong (1.5–6.5 minutes after lift-off: a flash, a fireball, burning pieces, an ABORT on the board). The outcome is booked when the sequence ends (`launch()`): success when the ascent is over, loss three minutes after the moment it is lost. The smoke is drawn for a while afterwards. Everything on the screen is a function of the time since lift-off (`puffs`, `debris`, `phaseAt`), so there are no particles to save.
- **The pad** (`co.pad.seq`) keeps the last sequence so the sky clears by itself; `Aerospace.launches()` gives the renderer what to draw and `launchStatus(co)` the terminal what to say.

### The secure convoy (`field.js`)

When a strategic product reaches its convoy stage the convoy leaves at once (`unit.convoy` = { t0, t1 }): an escort, the transporter and an escort, along the service road, up Meridian Way and away down the Cut (`convoy` waypoints in the map), then off the map; the stage itself still takes its days.

### Sound (`AudioEngine.setField`)

`soundAt` gives how loud the field is where the player stands: aircraft (a roll or a climb is loud, a taxi a murmur, pitch with speed) and launches (the ignition builds, the ascent thunders and fades with height, a loss is one hard crack), both by distance. Procedural, like the rest.

### The terminal

The Floor's pad tile shows the crawler's minutes, the T-minus clock, the climb or the loss; the overview raises an alert for it; the Apron page has a **Starling Field** section (the runway in use and what each of your aircraft is doing: *being pushed back*, *taxiing to runway 09*, *cleared for take-off*, *climbing away*) and the pad page says what the pad is doing and where to stand.

## What the world shows

Assembly bays (`bay_slot`) draw whatever unit is in them, from the simulation (`Aerospace.propView`): an airframe in primer growing stage by stage (fuselage, wings, engines, paint), a rocket on cradles, a satellite on its stand with panels folded or out, a strategic product under a tarpaulin; a lamp per stage. The VIB shows the next rocket stacked; the pad shows the rocket standing and venting during propellant loading. Art: `src/engine/drawAero.js`.

## State

`world.aero`: `{ v, rng, seq, lastDay, owned, boughtDay, companies: { meridian, roost? }, tenders, contracts, units, pos, jobs, satellites, aircraft, customers, suppliers, market, news, reports }`. The world also keeps `field` ({ reserved: runway windows, starts, active: the aircraft on the field, ambientDay }); an aircraft entity carries `stand`, `move` (a movement under way), `livery`, `ambient` and `sorties` (Meridian's own) and its `flight` record gets `movements` and `lastMovement`; a rocket unit carries `rollout` and `seq`, the pad `roll` and `seq`, a strategic unit `convoy`. A company carries `shipping`, `internalPolicy` and its `freight` tallies (v0.56.0), and (v0.57.0) `halls` (hall id → the time it opens; Hangar 1 always), each bay's `slot`, `engineers`, `inspectors`, `experience`, `training`, `qaLog`, `repLog`, `streaks`, `events`, `offers`, `cool` (cool-downs by kind), `milestones`, `pressure`; tenders, contracts and units may carry a `config` (and tenders and contracts an `event`, tenders a `minReputation`); a consignment (`jobs`) carries its orders, origin, status, ship, rate, charge, the carrier's equivalent, the voyage's cost, ETA and its log; the ship it's in carries `cargo: { type: 'aero', job }` and its voyage `job`. Created on first use; a save from before v0.55.0 gets Meridian as at a new game and no firm. Finished units, received orders and old contracts are pruned after a while.

## For the flyable-aircraft update

Every finished aircraft is a persistent entity in `world.aero.aircraft` (`registerAircraft`): id, registration, model (→ the product's full flight `spec`: dimensions, mass, payload, propulsion, fuel and burn, range, cruise and top speed, climb, handling, take-off and landing runs, runway type, crew seats, VTOL), manufacturer, owner (passes to the customer on handover), configuration (`config`, and a copy of the configured `spec`: more seats, a longer range), state (v0.58.0 drives `awaiting_delivery` → `taxiing` → `takeoff` → `airborne` → `departed`, and for Meridian's own `parked` ⇄ the same ⇄ `landing`; `maintenance`, `stored` and `retired` are for the flight update — `NEXT` in `src/aero/flight.js` says which may follow which), location, condition, fuel, hours, a `stand`, and `flight: { flyable: false, movements, lastMovement }`. A future flight controller reads the entity and its spec and can use `departurePlan` / `arrivalPlan` / `poseAt` as the autopilot of the ground and take-off phases; manufacturing, ownership, money and saves don't change.
