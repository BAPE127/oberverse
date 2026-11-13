# System Registry

Which system lives where, what documents it, and which tests cover it. Paths are relative to the repository root. Layering rules: `ARCHITECTURE.md`.

Pattern for most domains: pure rules in a domain folder → a thin system in `src/systems/` attaching them to `Game` → data in `src/content/` → screens in `src/ui/` → drawing in `src/engine/`.

Status is taken from `ROADMAP.md`, `KNOWN_ISSUES.md` and the passing test suite at v0.103.11; systems were not re-verified one by one in play during the 2026-11-12 audit.

## Foundation

| System | Code | Doc | Tests (`tests/…`) | Status |
| --- | --- | --- | --- | --- |
| Game state, loop, effects | `src/game/`, `src/main.js` | `ARCHITECTURE.md` | `simulation`, `debug`, `transaction` | Released |
| Core (version, RNG, bus, input, release notes) | `src/core/` | `ARCHITECTURE.md` | `version` | Released |
| Saves and migrations | `src/save/` | `SAVE_FORMAT.md` | `save*`, fixtures in `tests/fixtures/` | Released (schema 1) |
| Content registry and validator | `src/content/index.js`, `tools/validate-content.mjs` | `CONTENT_FORMAT.md` | `content` | Released |
| Build | `tools/build.mjs` → `index.html` | `ARCHITECTURE.md` | `build` | Released |
| Rendering (3D view) | `src/engine3d/` (three.js scene: world, ground, buildings, people, light, props, vehicles, machines), `src/vendor/three.module.min.js`, `src/engine/renderer.js` (modes, 2D overlays), `src/engine/iso.js` (the one projection) | `RENDERING.md`, `RENDERING_PROPS.md`, `WRATH.md` | `engine3d`, `props3d`, `vehicles3d`, `iso`, `iso_battle`; smoke test | Unreleased, in progress |
| Rendering (2D fallback) | `src/engine/` — `renderIso`, `isoBuildings.js`, `isoVehicles.js`, and the old top-down painters | `RENDERING.md` sections 2–6 | `iso`, `pixelart`, `seamless`, `streets` | Fallback when WebGL is missing |
| Audio | `src/audio/`, `src/content/audio.js` | `AUDIO_GUIDE.md` | — | Released |
| UI shell, HUD, panels | `src/ui/ui.js`, `panels.js`, `hotbar.js`, `dialogueUI.js`, `styles.css` | — | smoke test | Released |
| OberPad tablet | `src/ui/tablet*.js`, `src/systems/tablet.js`, `todo.js` | `TABLET.md` | `tablet*`, `todo` | Released; untried on touch |

## World and people

| System | Code | Doc | Tests | Status |
| --- | --- | --- | --- | --- |
| Clock, tiles, maps, regions, pathfinding | `src/world/` | `ARCHITECTURE.md`, `GEOGRAPHY.md` | `clock`, `world*`, `geography`, `towers` | Released |
| Maps (content) | `src/content/maps/`, `world.js`, `towers.js` | `WORLD_BIBLE.md`, `CROWN_QUARTER.md` | `crown`, `hollowmoor`, `capital`, `estates` | Released; Halvermouth thinly populated |
| World atlas, provinces, globe | `src/world/atlas.js`, `provinces.js`, `globe.js`, `src/content/atlas.js`, `geo.js` | `ATLAS.md` | `atlas`, `geo*`, `worldmap` | Released (city layer planned v0.106.0) |
| NPC simulation (brain, tiers, schedules, knowledge, memory, relationships, errands) | `src/sim/` | `WORLD_SIMULATION.md`, `ARCHITECTURE.md` | `simulation`, `worldsim`, `livingworld3`, `character*` | Released; NPC driving not built |
| Characters | `src/content/characters/`, `portraits.js` | `CHARACTER_REGISTRY.md`, `characters/`, `CHARACTER_IMPORT.md` | `character*`, `morganius` | Released |
| Homes, break-ins | `src/systems/homes.js`, `src/content/homes.js` | `WORLD_SIMULATION.md` | `homes` | Released |
| Police, pursuit, gangs | `src/systems/police.js`, `pursuit.js`, `gang.js`, `src/world/patrols.js` | `WORLD_SIMULATION.md` | `police`, `pursuit`, `gang` | Released |
| Transit and vehicles | `src/systems/transit.js`, `vehicles.js`, `src/sim/npcTransit.js` | `VEHICLES.md` | `transit`, `vehicles`, `signatureCars` | Released |
| Dialogue | `src/dialogue/`, `src/content/dialogue/` | `CONTENT_FORMAT.md` | `dialogue` | Released |
| Quests and emergent events | `src/systems/quests.js`, `eventDirector.js` | `ARCHITECTURE.md` | `quests`, `events`, `emergence` | Released; quest framework/journal planned v0.108.0 |

## Play

| System | Code | Doc | Tests | Status |
| --- | --- | --- | --- | --- |
| Inventory, shops, items | `src/systems/inventory.js`, `src/content/items.js`, `shops.js` | `CONTENT_FORMAT.md` | `specials` (unique weapons) | Released |
| Combat, weapons, the Wrath | `src/systems/combat.js`, `src/engine/wrath.js` | `ARCHITECTURE.md` | `combat`, `gunplay`, `wrath` | Released |
| Robbery | `src/systems/robbery.js`, `src/corp/robbery.js` | `CORPORATE.md` | `robbery*` | Released |
| Casino | `src/casino/`, `src/systems/casino.js` | `CASINO.md` | `casino*` | Released |
| Lariat ranch | `src/content/characters/lariat.js`, maps | `LARIAT.md` | `lariat` | Released |
| Properties and construction | `src/systems/properties.js`, `construction.js`, `src/world/plots.js` | `PROPERTIES.md` | `character_mason`, `hollowmoor` | Released |

## Business and economy

| System | Code | Doc | Tests | Status |
| --- | --- | --- | --- | --- |
| Companies, ledger, group, consolidation | `src/corp/`, `src/systems/corporate.js`, `group.js` | `CORPORATE.md`, `CORPORATE_ACCEPTANCE.md`, `CORPORATE_AUDIT.md` | `corporate*`, `business`, `transaction` | Released; gaps listed in `CORPORATE_ACCEPTANCE.md` |
| Managers and personnel | `src/systems/management.js`, `personnel.js` | `CORPORATE.md` | `managers` | Released |
| Headquarters | `src/systems/hq.js`, `src/content/hq*.js` | `PROPOSAL_OBERPAD_HQ_INCOME.md` | `hq*` | Released |
| Banking, lending, bonds, central bank | `src/corp/bank.js`, `lending.js`, `bonds.js`, `credit.js`, `sovereign.js` + systems | `CORPORATE.md` | `bank*`, `first_bank`, `lending`, `business_loans`, `bonds`, `credit`, `sovereign` | Released |
| Exchange and market | `src/corp/exchange.js`, `src/systems/exchange.js`, `market.js` | `CORPORATE.md` | `exchange`, `market` | Released |
| Milestones | `src/corp/milestones.js` | `CORPORATE.md` | `milestones` | Released |
| Shipping, ports, fleet, piracy, shipyard | `src/systems/logistics.js`, `docks.js`, `piracy.js`, `shipyard.js`, `src/world/seaRoutes.js` | `LOGISTICS.md`, `SHIPS.md`, `PORTS.md`, `SHIPBUILDING.md`, `FLEET_COMMAND.md`, `BOARDING.md` | `logistics`, `free_delivery`, `fleetcommand`, `naval`, `boarding`, `shipyard`, `shipbuilder` | Released |
| Arms works (factory) | `src/systems/factory.js`, `arms.js` | `ARMS.md`, `FACTORY.md` | `arms*`, `factory`, `factorio` | Released |
| Aerospace | `src/aero/`, `src/systems/aerospace.js` | `AEROSPACE.md` | `aero*`, `aerospace*`, `storage` | Released |
| Farming and dairy | `src/systems/farm.js`, `dairy.js` | `FARMING.md` | `farming` | Released; no seasons or weather |
| Oil company | `src/systems/oilCompany.js`, `ledgerGame.js` | `characters/npc_moneybucks.md` | `character*` | Released |
| Income balance | `src/content/income.js`, `tools/econ-audit*.mjs`, `econ-max.mjs` | `KNOWN_ISSUES.md` | `income`, `rebalance` | First-pass tuning |

## Politics

| System | Code | Doc | Tests | Status |
| --- | --- | --- | --- | --- |
| Model, parties, government, assembly, budget, policies | `src/politics/`, `src/systems/politics*.js` | `POLITICS.md`, `POLITICS_AUDIT.md` | `politics*`, `government`, `party`, `opinion` | Released (update complete at v0.97.0) |
| Elections, influence | `src/politics/election.js`, `influence.js` | `POLITICS.md` | `elections`, `influence` | Released |
| Diplomacy (sole writer of wars and embargoes), unrest | `src/politics/diplomacy.js`, `unrest.js` | `POLITICS.md` | `diplomacy`, `unrest` | Released |

## War (mercenary company)

| System | Code | Doc | Tests | Status |
| --- | --- | --- | --- | --- |
| Company, base, people, squads, procurement, production, research, supply | `src/war/`, `src/content/` (troops, base, facilities, procurement, warResearch…) | `WAR.md` | `war*` | Released through v0.103.11 |
| Tactical battles | `src/battle/`, `src/ui/battle.js`, `src/engine/drawBattle*.js` | `WAR.md`, `PROPOSAL_WAR_TACTICAL.md` | `battle*`, `drones` | Released |
| Strategic command, air power, fleets, international contracts | `src/war/strategic*.js`, `airpower.js`, `navy.js`, `intl.js` | `WAR.md`, `PROPOSAL_WAR_STRATEGIC.md` | `strategic*`, `war*` | Released; air superiority and bombing of structures not done |
| Command terminal | `src/ui/terminal.js`, `military*.js`, `strategic.js` | `WAR.md` | smoke test | Released |
| Destruction, government response, coup | — | `ROADMAP.md` | — | **Planned: v0.104.0** |

## Relationships worth knowing

- Every business posts to the **ledger**; the **group** consolidates them; the **exchange**, **bank ratings** and **milestones** read the results.
- **Politics** policies reach farms, arms, aerospace, shipping, the exchange and bonds; **diplomacy** decides wars and embargoes, which the **arms market**, **shipping** and the **war company** read.
- The **war company** is supplied by the **arms works**, borrows ships from the **shipping company** and missiles from **aerospace**.
- **NPCs** work at businesses, live in **homes**, ride **transit**; the **event director** reads all of it.
- `oberverse-manifest.json` also carries a system map, but it stops at about v0.20 (no war, politics, aerospace); this file is the current one.
