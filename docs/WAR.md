# The War update (v0.98.0 –)

Plan: `docs/PROPOSAL_WAR.md` and its companions. Release list: `docs/ROADMAP.md`. This file is the reference for what exists. The first release, **v0.98.0 "War: Base and Company"**, builds the ground the rest stands on: the protection rule, two places, a company with its own money, and the buildings it can put up. Nothing here fights yet.

## The one rule

**Before a coup, nothing the company owns at its base can be damaged.** One flag decides it: `world.military.coup.state` (`none` → `staged` → `ended`). `baseProtected(game)` reads that and nothing else. `setCoupState` is the only writer of the state; `settle(how)` is the only way protection returns. `damage.apply` and `damage.repair` (`src/war/damage.js`) are the only writers of `damage.structures`: a hit on a core structure owned by the company is refused while the base is protected, and a source that is not on the list (`DAMAGE_SOURCES`) is refused outright. Tests scan the source so no later release can write around the gate (`tests/war_gate.test.mjs`).

## What exists

| Piece | Where |
| --- | --- |
| The record `world.military` (made on first use; an older save gains it) | `src/war/state.js` |
| The protection flag and the damage gate | `src/war/protection.js`, `src/war/damage.js` |
| The consistency checker: every soldier, vehicle, aircraft and building exists once, in one place, with one status | `src/war/check.js` (`game.war.check()`) |
| The service `game.war`, a thin facade | `src/war/api.js` |
| Fort Gullcrest: the government's base on FM 38 north of Lariat, with a garrison of six | `src/content/maps/fortGullcrest.js`, `src/content/fort.js` |
| Hollowmoor Lot: the company's fenced ground on the shore road west of Mill Road Yards | `src/content/maps/hollowmoor.js` |
| The nineteen facilities in three stages, with real capacity | `src/content/facilities.js`, `src/war/facilities.js` |
| The company: its name, its licence, its lot and its own money | `src/war/company.js` |
| The Military app on the tablet (Businesses group) | `src/ui/militaryApp.js` |
| The debug command `mil` | `src/ui/debugCommands.js` |

## The company

- **Registering** costs nothing and takes a name through the same rules as every company's (`validateName`, checked against every company and party). No business may take the name afterwards.
- **Its money is its own.** It has an account in the corporate ledger (`game.corp`, id `security`) so its cash reconciles like a business's. It is **not** one of the four businesses (not in `COMPANY_IDS`), so groups, valuation and rankings never see it. You **pay in** (out of your wallet) and **take out** (into it); those are the only two acts that cross. Everything the company buys — the licence (5,000), Hollowmoor Lot (60,000), every building and every repair — is paid from its account alone; short of money, a purchase is refused and nothing changes.
- **The licence first, then the lot.** The Civic Office's licence is needed for the lot and for a building permit. Buying the lot puts the fence and gate under the damage gate as core structures.
- **The government is another thing.** `world.military.gov` (units, inventory, bases) belongs to the state; the company's code never reads or writes it, and a test checks that.

## Building

Mason's Os builds in stages, on the existing contract model: the permit waits a day, then foundation, frame and fitting-out take their days. Stage 1 (a security firm: site office, bunkhouse, range, armoury cage) is open from the start; a later stage opens when every building of the stage before is built. A facility has a real capacity (beds, meals, treatment places, stores, lines, hangar bays); a damaged one gives half, a ruin none, and repair or rebuilding goes through the gate and is paid by the company. A built facility is registered as `fac_<id>`; its state is read from the gate, never stored twice.

## Supplies, factories and contracts (v0.99.0)

Release 2 of the war update, "War: Supplies, Factories and Contracts": how things get into the company, how tanks and helicopters get made, and what a company with only guards can do.

| Piece | Where |
| --- | --- |
| What the company holds: vehicles, helicopters and aircraft are records with ids; guns, rounds and supplies are counts | `src/war/equipment.js` |
| Free, atomic, audited transfers from Aerospace and the Arms works | `src/war/transfers.js` |
| Buying from suppliers (carriers, recon, artillery, anti-air, logistics, medical and engineer vehicles; supplies and parts) | `src/war/purchase.js`, `src/content/procurement.js` |
| The tank factory and helicopter works: orders, lines, shifts, crew, parts, wear, upgrades | `src/war/production.js`, `src/content/production.js` |
| People: a recruit is a record with a wage and a bed (guards and technicians) | `src/war/people.js` |
| Early security contracts, reputation, clients | `src/war/contracts.js`, `src/content/contracts.js` |
| The company's day (construction, wages, the works, contracts), each part once a day | `src/war/day.js` |
| The Military app's pages: Company, Transfers, Production, Contracts | `src/ui/militaryApp.js`, `militaryTransfers.js`, `militaryProduction.js`, `militaryContracts.js` |

**Transfers** move real things, never money: no wallet, no company account, no Aerospace or Arms book changes (a test snapshots all of them). Only stored military aircraft leave Aerospace (the record itself moves, and returns to Aerospace's storage unchanged); only weapons, rounds, rockets, missiles and drones leave an Arms works' export cage, by the item and by the works, and go back to the same works. Everything is checked before anything changes. What is assigned, in use or destroyed cannot return, and what was bought or built here has nowhere to go back to. Each move is a line in `world.military.transfers` (capped at 80), never a money entry. **Housing is real:** a vehicle needs a bay in the motor pool, an aircraft or a helicopter a bay in the hangars, and goods a place in the stores.

**What suppliers sell.** Thirty-one vehicles of eras 1 and 2 bought outright (carriers, recon, artillery, anti-air, logistics, medical and engineers), plus uniforms, radios, medicine, rations, spares, fuel and the parts the works consume. Tanks and helicopters are never for sale.

**Manufacturing.** The company builds **tanks and helicopters and nothing else** (a test reads the catalogue). A model's price is its whole cost: the parts, bought and held in the stores, plus the works' fee paid when a unit starts. A works has two lines (one when damaged, none for a ruin); a line builds one unit at a time at the model's days for one shift; more shifts (up to three) finish sooner and need more technicians. A line that cannot start or finish says why (parts, crew, the fee, a free bay, a damaged works) and the reason is saved. The works wear with use and slow down; mending costs by the point of wear; two upgrades build 15% faster each. Prices are calibrated to the Aerospace ladder (210,000 to 2,600,000).

**Contracts.** Offers turn up by hash (no dice), at most three open at once (more with a good name), and lapse with a reason. A job asks for guards, a pistol each and a radio, and nothing heavy: a firm of four guards can work the whole game. The pay arrives only when the job ends well and goes to the company's account; a failure costs a share of the pay (owed, never taken from you), reputation, and the client for a month. A win raises the name, and a good name brings more offers and bigger jobs.

## Honest limits (v0.99.0)

- **Ships are not moved** this release: they stay with the shipping company (moving a ship would need its upkeep, its voyages and every place that lists vessels to follow it). The strategic missiles are built to contract and never stored, so there is nothing to move.
- Bought vehicles and supplies arrive at once (no supplier lead time). The armoury's perks and abilities do nothing yet; the four bars are data.
- A recruit is a name, a wage and a bed. Roles with training, squads and the people on the map arrive in v0.100.0; a guard on a post is not drawn anywhere.
- Taking an aircraft out of Aerospace's storage leaves a standing order free to build another toward its storage goal: that is real Aerospace spending, and is left as it is.
- Contracts are resolved by a hash against a chance, with no scene: guards cannot be hurt yet.

## Honest limits (v0.98.0)

- Nothing is hired or produced yet: people, squads and equipment have their record shapes and are checked, but arrive in v0.99.0–v0.100.0.
- The licence and the permit are granted on payment; there is no inspection.
- The interiors of the facilities are generated rooms, not made ones.
- Fort Gullcrest has its garrison of six and nothing else yet (no tanks or aircraft); its structures are not under the damage gate.
