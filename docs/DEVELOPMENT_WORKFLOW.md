# Development Workflow

## Start of every session

1. Read `README.md`, `docs/PROJECT_OVERVIEW.md` and this file.
2. Check `VERSION`, `oberverse-manifest.json`, the top of `CHANGELOG.md` and `docs/KNOWN_ISSUES.md`.
3. Pick the prompt for your task from `docs/prompt-bank/INDEX.md`.
4. Inspect the actual files involved. Do not trust memory or older documentation over the code.
5. Run `npm run check` **before** changing anything, so you know what was already passing.
6. Plan the smallest safe change.

## Making changes

- Prefer targeted edits over rewrites. Never replace a working system with an incomplete one.
- Keep simulation code DOM-free (see `docs/ARCHITECTURE.md`).
- Express consequences as content effects/conditions when possible, not one-off code.
- New IDs are permanent: never rename an ID that may exist in a player's save. Deprecate instead.
- Update documentation in the same change as the code it describes.

## Verification before committing

```bash
npm run check   # content validator + all tests
npm run smoke   # browser smoke test (Playwright + Chromium) — screenshots in tools/out/
```

Then `npm run build` and commit the regenerated `index.html` (a test fails if it is stale). Also play the changed feature in a browser — `npm run dev` for live source, and open `index.html` directly to check the shipped build. Record what was actually verified in `docs/TESTING.md` when it changes, and never claim a check you did not run.

## Versioning (semantic)

`MAJOR.MINOR.PATCH`:
- **MAJOR** — incompatible changes to core architecture, save format (without migration) or established systems.
- **MINOR** — new backward-compatible features, systems or significant content (a new character, district, quest line).
- **PATCH** — bug fixes, balance and small corrections.

The version must agree in **five** places (enforced by `tests/version.test.mjs`): `VERSION`, `package.json`, `oberverse-manifest.json`, `src/core/version.js` (`GAME_VERSION`), and the newest entries of `CHANGELOG.md`, `VERSION_HISTORY.md` and `src/core/releaseNotes.js`.

`BUILD_CHANNEL` is `development` until a release passes the full procedure below; only then set it to `stable` (manifest `buildChannel` too).

## Release procedure

1. `npm run check` passes.
2. `npm run build`, then `npm run smoke` (standalone file) and `npm run smoke -- --dev` pass; review the screenshots.
3. Manually play: new game → leave flat → talk to all three residents → buy something → complete at least one quest → sleep → save → reload → continue.
4. Save/load across schema versions using fixtures in `tests/fixtures/`.
5. Validator reports no missing assets or broken references.
6. Version display agrees with the manifest (title, pause, About).
7. Update `CHANGELOG.md`, `VERSION_HISTORY.md`, `src/core/releaseNotes.js`.
8. Record known issues in `docs/KNOWN_ISSUES.md`.
9. Commit and tag (`git tag v0.x.y`). This is the recoverable checkpoint.

## Git

- Work on a feature branch; commit in small, described steps.
- Never force-push over someone else's history.
- Don't commit `tools/out/` (screenshots) or `node_modules/`.

## Handoff notes

If a session ends mid-task, append a dated entry to the "Current state" section below: what changed, what is half-done, what to do next, known risks.

## Current state

- **2026-10-15 — v0.25.0.** Fleet Command (`src/ui/fleetCommand.js`, `docs/FLEET_COMMAND.md`) replaces the tabbed logistics terminal with a full-screen ops-room chart and one-click orders. Owner chose three releases: **next** v0.26 the side-profile shipbuilder (parts snap to glowing attachment points; detailed parts), then v0.27 life-size ships at the Yards berths you can walk aboard.
- **2026-10-15 — v0.24.0.** The shipyard (Mason's Os) and the custom shipbuilder (`src/systems/shipyard.js`, `docs/SHIPBUILDING.md`). The shipping expansion's planned stages are done; playable naval combat is the documented future path (`docs/LOGISTICS.md#towards-playable-naval-combat-future`).
- **2026-10-15 — v0.23.0.** Piracy (`src/systems/piracy.js`), warships, convoys, guards, insurance, missions (`src/systems/missions.js`), fleet bonuses. **Next:** v0.24 Mason's Os shipyard and the custom shipbuilder.
- **2026-10-15 — v0.22.0.** Own-fleet arms exports (`Market.shipOwn`/`settleOwn` ↔ `Logistics.armsQuote`/`carryArms`), the fleet on the arms globe, richer voyage logs. **Next:** v0.23 piracy, warships, missions.
- **2026-10-15 — v0.21.0.** Stage 1 of the shipping expansion (owner's master brief): Captain Ober (imported; interview in `docs/characters/npc_ober.md`), the Yards docks, `src/systems/logistics.js` (company, ports, cargo ships, contracts, voyages on sea routes), the logistics terminal and the tablet's Ships app. **Next (owner chose several releases):** v0.22 own-fleet arms exports + the fleet on the arms globe; v0.23 piracy, warships and missions; v0.24 Mason's Os shipyard and the custom shipbuilder. See `docs/prompt-bank/18-shipping-extension.md`.
- **2026-10-15 — v0.20.0.** Streets: four-tile roads (widened at load from 2-tile authored maps by `src/world/widen.js` — author in the OLD coordinates and list new roads in `ROADS`), a closed road network, traffic lights (`src/world/lights.js`), pavement-keeping pedestrians, through traffic, car handling, the beeping fixed. Owner's answers recorded in the CHANGELOG.
- **2026-10-14 — v0.19.0.** The arms trade by the crate: crate recipes, country orders of 5–50 crates, the armourer's workbench for singles and ammo. Owner's answers recorded in the CHANGELOG.
- **2026-10-13 — v0.18.0.** Police chases (`src/systems/pursuit.js`) on the shared car physics. Decisions (owner asked only for "police chases"): one cruiser per star, ramming at ★★★, pulled over when stopped, line-of-sight escape, no pursuit through region gates, police never hurt pedestrians.
- **2026-10-13 — v0.17.0.** Transportation, part 2: the No. 1 bus and NPC traffic (`src/systems/transit.js`), moving in world space (`src/world/layout.js`). The Transportation update is complete. New routes and loops are data in `src/content/transit.js` (world tiles; keep to the left).
- **2026-10-13 — v0.16.0.** Transportation, part 1: cars (`src/systems/vehicles.js`), dealerships, driving, hitting people, car theft. Owner's answers: drive cars yourself; ride the bus for real; new original dealer NPCs; extras: hitting people, car theft, NPC traffic (not fuel/repairs). Bus fare is 2 obols (my call, as asked). **Next: v0.17.0 — the bus (a real route through every region, stops, ride it as time passes) and NPC traffic.**
- **2026-10-13 — v0.15.1.** Owner's follow-up: the terminal should feel like OSINT software seen on a monitor, with moving shipments and hover details on countries and ships; the map should be a true world map with zoom and building icons. New outdoor buildings need an entry in `src/content/mapIcons.js` (a test enforces it).
- **2026-10-13 — v0.15.0.** The journal becomes the OberPad tablet (`src/ui/tablet.js`, `src/systems/tablet.js`): Business (remote arms-works terminal), Stocks (Ober's Oil register) and a business notification feed. Owner's request: "manage all your business (currently only gun running) and buy stock (currently only Ober's Oil)" and "notify you when things are occurring with your business". New businesses should post through `game.tablet.post(app, …)` and add an app to `TABLET_APPS`.
- **2026-10-13 — v0.14.0.** Guns and Gun Running, part 2: the market (`src/systems/market.js`), shipping, insurance, heat, and heavy weapons (`src/systems/heavy.js`). The update is complete. Planned next by the owner: a politics update (bribery and corruption with countries), your own shipping company, linked companies.
- **2026-10-13 — v0.13.0.** Guns and Gun Running, part 1: Lucas Eastrise (imported), Pipecreek Armory, Mill Road Yards, arms works (`src/systems/arms.js` extends `Factory`), staff, research, terminal globe. Owner's answers: store Lucas, draw the globe; mixed real-world-style takes; Lucas protected; employees AND belts; cargo lost + insurance + heat; grey market; everything usable — drones never target and blasts never harm imported characters, only a direct attack triggers the Wrath; wages, skills/traits, morale, research staff; living world map; new industrial yards; two releases. **Next: v0.14.0 — the globe market (8 countries, wars over weeks, budgets, wants, embargoes), shipping companies with reliability, insurance, heat (police/hostile countries), usable RPGs, missiles (area blasts) and drones (companion attackers).**
- **2026-10-13 — v0.12.0.** The gang update, part 2: warehouses, Sal's Surplus, hand-crafting and the factory builder (`src/systems/factory.js`, `docs/FACTORY.md`). The gang update is complete.
- **2026-10-13 — v0.11.0.** The gang update, part 1: Arthur Anderson (imported, protected, maths Wrath), six crew, calculators (`src/systems/calculators.js`), customers/orders/gang anger/truce (`src/systems/gang.js`). Owner's answers: temporary boosts; Arthur protected, gang killable; supplier + deliveries; grid with machines and belts; threats, ambushes and a truce; Schedule I customers; six calculators; warehouses at the Halvermouth docks; bribes cover dealing. **Next: v0.12.0 — warehouses (2–3 at the docks incl. Warehouse 7), parts supplier and deliveries, manual crafting then a grid factory builder with machines, belts, inserters and power.**
- **2026-10-13 — v0.10.0.** The police: Chief Lawrence Order (imported, protected, LAW & ORDER Wrath), five officers, Wanted/record, bribes and fines, jail and four breakouts (`src/systems/police.js`). Owner's rules: Lawrence stays in the station; officers patrol every area, including future ones — give new areas' officers beats in `src/content/characters/police.js`.
- **2026-10-13 — v0.9.0.** Fixed out-of-reach attacks on protected characters; per-character Wrath themes (oil, construction). Lesson: tests must place the player where a real player can stand.
- **2026-10-13 — v0.8.0.** Debug menu and console (` key) for testing. New commands go in `src/game/debugCommands.js` (add a test).
- **2026-10-13 — v0.7.0.** Imported characters protected; the Wrath cutscene. Owner's rule: imported characters can't be killed unless they say so.
- **2026-10-13 — v0.6.0.** Combat system (melee + guns, NPC health bars, knock-outs, death, reactions). Next candidates: police response in Halvermouth, arrests/bounties, armour, touch controls, death-aware dialogue.
- **2026-10-13 — v0.5.0.** Halvermouth city map (separate region via gateways; map-only by request: "start by only building the map"). Next: the city's people and systems, as directed by the project owner (Mayor, police, gun-shop owner, Sumps residents, etc. — none designed yet).
- **2026-10-13 — v0.4.0.** Second imported character (Mason Nails) + crew, Westbrook Lots west of Lanternside, construction shifts, property groundwork. **No plots exist yet: the project owner will say where to create them** (docs/PROPERTIES.md explains the one-entry change). Next candidates: first plots when asked; tenants/businesses as real simulation; optional combat.
- **2026-10-13 — v0.3.0.** Lanternside and the Ober Fields joined into one continuous region (seams).
- **2026-10-13 — v0.2.0.** First imported character (Sir Moneybucks), the Ober Fields district, Ober's Oil economy. Next candidates: optional combat; a second imported character; Moneybucks's upstairs; the blocked lighthouse stair.
- **2026-10-13 — v0.1.1.** Players now open the generated `index.html` directly; development uses `dev.html`.
- **2026-10-13 — v0.1.0.** Foundation complete and verified (see `docs/TESTING.md`). Next recommended steps, in order:
  1. Import the first player-supplied character (Stage 5) using `docs/prompt-bank/03-character-import.md` when the player provides one.
  2. Optional combat + a nonviolent alternative (Stage 3), equipment slots.
  3. Progression (stat growth through activities).
  4. A second district map and more interiors (Stage 7).
