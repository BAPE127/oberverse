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

## Honest limits (v0.98.0)

- Nothing is hired or produced yet: people, squads and equipment have their record shapes and are checked, but arrive in v0.99.0–v0.100.0.
- The licence and the permit are granted on payment; there is no inspection.
- The interiors of the facilities are generated rooms, not made ones.
- Fort Gullcrest has its garrison of six and nothing else yet (no tanks or aircraft); its structures are not under the damage gate.
