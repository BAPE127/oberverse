# Shipbuilding (v0.24.0; builder v0.26.0)

Your own shipyard and the custom shipbuilder. Code: `src/systems/shipyard.js` (simulation), the shipbuilder in Fleet Command's Shipyard sheet (`src/ui/shipBuilder.js`), the drawings (`src/engine/drawShipProfile.js`), content `SHIPYARD`, `TECH`, `HULLS`, `COMPONENTS`, `SHIP_COLOURS` in `src/content/logistics.js`.

## 1. The yard (Mason's Os)

Ask Mason ("Could your crew build me a shipyard?") or use Fleet Command → Shipyard → Slips & yards. Mason's Os build one at any port of yours that's a **commercial port or bigger**: 60,000 (commercial), 85,000 (heavy terminal), 80,000 (naval base), 140,000 (advanced port), less the crew's goodwill discount (up to 25%), in 5 days (one or two fewer with goodwill). Paid once; not instant; the crew post progress every morning; it's ready when the days are up. At **Mill Road Docks** you can watch it: scaffolding on the west end of the quay, then the Ober & Sons slipway (where ships you build there are drawn as they take shape).

## 2. Designing

Pick a yard, cargo ship or warship, and a **hull**. The hull sets the class and the limits:

| Hull | Kind | Tech | Class | Price | Size | Slots | Max weight | Power | Mounts | Must have |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Coaster | cargo | modern | Low End | 3,000 | 1 | 5 | 40 | 2 | 0 | propulsion, navigation, cargo |
| Sailing trader | cargo | sail | Low End | 2,500 | 1 | 4 | 35 | 0 | 0 | sail propulsion, cargo |
| Freighter | cargo | modern | Medium End | 12,000 | 2 | 7 | 90 | 4 | 0 | propulsion, navigation, cargo |
| Carrier | cargo | modern | High End | 30,000 | 3 | 9 | 150 | 6 | 0 | propulsion, navigation, 2× cargo |
| Megaship | cargo | modern | Super High End | 80,000 | 4 | 12 | 260 | 8 | 0 | 2× propulsion, navigation, 3× cargo, power |
| Hydrofoil | cargo | advanced | Futuristic | 140,000 | 3 | 10 | 120 | 4 | 0 | advanced propulsion, advanced power, navigation, cargo |
| Revenue cutter | warship | sail | Sail | 6,000 | 1 | 5 | 40 | 0 | 4 | sail propulsion, weapons |
| Ship-of-the-line | warship | sail | Sail | 40,000 | 3 | 9 | 160 | 0 | 40 | sail propulsion, 2× weapons |
| Patrol | warship | modern | Modern | 15,000 | 2 | 7 | 80 | 4 | 4 | propulsion, navigation, weapons |
| Destroyer | warship | modern | Modern | 50,000 | 3 | 10 | 140 | 8 | 8 | propulsion, navigation, 2× weapons, sensors |
| Capital | warship | modern | Historic | 110,000 | 4 | 12 | 280 | 10 | 14 | 2× propulsion, navigation, 3× weapons, defence |
| Stealth | warship | advanced | Futuristic | 220,000 | 3 | 10 | 120 | 6 | 6 | advanced propulsion, advanced power, navigation, weapons, sensors |

Then add **parts** (35 of them, in eight families: propulsion, power, cargo, navigation, defence, weapons, sensors, support). Compatibility:

- **technology** — sail hulls take sail and general parts; modern hulls modern and general; advanced hulls everything but sail;
- **kind** — weapons are for warships (cargo ships get a deck guard post instead); container bays, bulk holds, reefers and heavy cranes are for cargo ships;
- **limits** — each part has a maximum per ship; topsails need sails; command centres and Aegis nodes need a size-3+ hull.

The simulation checks, and the page lists every problem: slots, **weight** (parts' tonnes against the hull's rating; a heavy ship is slower — speed × (1 − 0.35 × load)), **power** (generators and cores make it; engines, reefers, radars, weapons use it), **weapon mounts**, the hull's **required parts**, the **licence**, and the **yard** (futuristic hulls are built only at an advanced port's yard — warships also at a naval base — and need the **Meridian Advanced Marine Licence**, 150,000, from the Parts page).

The ship's numbers come only from its hull and parts: cargo, speed, range, reliability, running costs, combat numbers, abilities (reefer, heavy, container, bulk, transport, advanced/express; warships with weapons can escort and patrol, with sensors scout) and fleet bonuses (fleet communications, command centre, quantum sensors, Aegis network).

**Looks**: the hull's silhouette, your hull and trim paint (14 colours each), and each part drawn **where you put it**. Paint and placement never change the rules.

## The builder (v0.26.0)

Fleet Command → **Shipyard** → **Design & build**:

- **Hulls** along the top (Cargo / Warship); 🔒 marks a futuristic hull you hold no licence for. Switching hull keeps the parts that still fit.
- **The stage**: your hull, big and side-on, on a blueprint floor, with one glowing **attachment point** per slot, numbered stern to bow (they keep clear of the bridge). Hover a point for what's there.
- **The tray** of part cards, by family (propulsion, power, cargo, navigation, defence, weapons, sensors, fleet support), each drawn, with price, tonnes, power and mounts; parts that can't go on this hull are greyed with the reason, parts at their limit say so. **Drag** a card onto a point (the nearest point lights gold and the part snaps on; dropping on a fitted point replaces it), or **click** it to fit it in the next free point. Drag a fitted part to another point to swap, or off the ship to take it off; double-click or Delete removes the selected part.
- **The panel**: the selected part; meters for points, weight, power and mounts (gold near the limit, red over it); the class's requirements ticking off; performance bars (cargo, speed, range, reliability, attack, defence, detection, stealth), running costs, abilities and fleet bonuses; anything else the simulation objects to; name and paint; the yard; the bill (hull, labour, parts — and what's still to buy, days on the slip); **Buy missing parts** and **Lay the keel**.

Every part has its own drawing (`PROFILE_PART`): diesel funnels with smoke, twin gas turbines, a slim eco funnel, a fusion drive's glowing ring, generators with louvres and hazard stripes, a fusion core, hatch covers, bulk holds heaped with ore, stacked containers, reefers with spinning fans, a slewing crane, passenger cabins with lit portholes, a specialist pod, a navigation mast, turning radar, antenna arrays, a command centre, plating and armour (which also mark the hull), countermeasure launchers, stealth coating (darkens the hull), a broadside of gun-ports, deck guns, missile launchers, railguns, a sandbagged guard post, sonar under the keel, a crow's nest, quantum and Aegis domes, masts with square or fore-and-aft sails. Stock ships get a standard fit (`fitFor`), so every ship in Fleet Command is drawn this way.

A design's **layout** (`design.layout`: the point each part is in, gaps allowed) is kept with the build and the launched design. Only the look uses it (`Shipyard.fitOf` → `look.fit`); a missing or broken layout means "in order".

## 3. Parts, building and launching

Parts are bought into the **parts store** (Shipyard → Parts store, at most 20 of each; advanced parts need the licence). The builder offers "Buy missing parts" for the design in hand.

**Lay the keel**: the hull price and labour (12% of hull + parts) are charged once; the design's parts leave the store (reserved for this build — a part can't be in two builds); the build takes 1 day + 1 per size + ¼ per part (× 1.5 for advanced technology). One build per yard at a time.

**Cancel** a build at any time before launch: its parts go back to the store and half the hull and labour are refunded.

**Launch**: on the day, the ship joins your fleet at that port (if the port's berths are full, it waits on the slip until one frees). It's an ordinary vessel from then on: contracts, arms exports, escorts, missions, repairs.

## Saves

`world.logistics` keeps `stock`, `tech`, `designs` (each launched ship's design: hull, parts, layout, name, paint — its inputs only), `builds` and each port's `shipyard` record. A custom ship's `model` is its design id (`d1`, …); `Logistics.model()` computes its numbers and look from content every time, so a loaded ship matches the launched one exactly.
