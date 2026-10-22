# Aerospace — Starling Flats Aerospace Park (v0.55.0)

The aerospace industry, built in stages (owner's brief, "OBERVERSE MASTER DEVELOPMENT PROMPT — Aerospace Manufacturing, Defense Contracts, Rocket Launches, Satellite Networks, and Integrated Shipping"). Owner's answers to the questions asked before building: a **new region east** of the Ober Fields; the player gets in by **buying a failing firm**; **staged releases**; and every NPC — new ones and everybody who used to share a dorm, bunk room, staff corridor or shack — gets **a home of their own**.

| Stage | Version | What |
| --- | --- | --- |
| I | **v0.55.0** | Homes; the region, campus, runway and launch complex; the people; the shared engine (catalogue, tenders and bids, contracts, pipelines, materials and purchase orders, books); Meridian (operating and listed as MRDN); Roost Aeroworks for sale; the aerospace terminal |
| II | v0.56.0 | Facility upgrades on the map (new halls and bays drawn where they're built), workforce and quality management, product configuration, reputation events |
| III | v0.57.0 | Procurement through **Ober & Sons Maritime**: internal shipping jobs on the existing voyage system, internal rates (0–5% of the market freight), intercompany accounting, the supply-chain savings view |
| IV | v0.58.0 | Finished aircraft taxi and take off on the runway (scripted, from the persistent aircraft entities); launches on the pad with the countdown and the ascent; the secure convoy |
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
- **Books** (`src/aero/books.js`): revenue on delivery (deposits deferred), materials an asset until consumed and delivered, wages/upkeep/overhead each morning, research, rework, launch costs, penalties, interest; an intercompany account ready for internal shipping (excluded from consolidated figures).
- **Meridian's management** (`src/aero/rival.js`): crews its bays, bids what it can deliver at cost plus a markup that rises with load, orders materials for everything in hand from the cheapest supplier, researches out of profits, builds a bay of its busiest type when cash-rich.
- **MRDN** (`src/aero/valuation.js`): fair value = equity + P/E × normalised daily earnings (before research; half trailing month, half order book) + half the backlog's margin, per share; the price moves 12% of the way to fair value each day, ±2% mood. Buy and sell on the tablet's Stocks app (1% fee, at most 5% of the company); dividends on Moondays from the week's positive earnings.

## The terminal

`src/ui/aerospace.js`: Dashboard · Tenders (quote, cost breakdown, earliest delivery, sealed bid) · Contracts · Production (bays and every unit's stage, progress, blockers, work and materials still to come) · Supply (stores, reservations, on order, shortfalls, purchase orders, manual orders with every supplier's landed cost) · Facilities (workforce, bays, test cell, inspection, pad, research) · Books · Meridian (and MRDN). Roost office terminal, the tablet's Aerospace app, Billie, and (read-only) Meridian's share board.

## What the world shows

Assembly bays (`bay_slot`) draw whatever unit is in them, from the simulation (`Aerospace.propView`): an airframe in primer growing stage by stage (fuselage, wings, engines, paint), a rocket on cradles, a satellite on its stand with panels folded or out, a strategic product under a tarpaulin; a lamp per stage. The VIB shows the next rocket stacked; the pad shows the rocket standing and venting during propellant loading. Art: `src/engine/drawAero.js`.

## State

`world.aero`: `{ v, rng, seq, lastDay, owned, boughtDay, companies: { meridian, roost? }, tenders, contracts, units, pos, satellites, aircraft, customers, suppliers, market, news, reports }`. Created on first use; a save from before v0.55.0 gets Meridian as at a new game and no firm. Finished units, received orders and old contracts are pruned after a while.

## For the flyable-aircraft update

Every finished aircraft is a persistent entity in `world.aero.aircraft` (`registerAircraft`): id, registration, model (→ the product's full flight `spec`: dimensions, mass, payload, propulsion, fuel and burn, range, cruise and top speed, climb, handling, take-off and landing runs, runway type, crew seats, VTOL), manufacturer, owner (passes to the customer on handover), state (`awaiting_delivery` → `departed`; the state machine's other states — taxiing, take-off, in flight, landing, parked, maintenance, stored, retired — are for v0.58 and the flight update), location, condition, fuel, hours, configuration and `flight: { flyable: false }`. A future flight controller reads the entity and its spec; manufacturing, ownership, money and saves don't change.
