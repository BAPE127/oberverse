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

**Transfers** move real things, never money: no wallet, no company account, no Aerospace or Arms book changes (a test snapshots all of them). Stored military aircraft and strategic missile products leave Aerospace (the record itself moves, and returns to Aerospace's storage unchanged); only weapons, rounds, rockets, missiles and drones leave an Arms works' export cage, by the item and by the works, and go back to the same works. Everything is checked before anything changes. What is assigned, in use or destroyed cannot return, and what was bought or built here has nowhere to go back to. Each move is a line in `world.military.transfers` (capped at 80), never a money entry. **Housing is real:** a vehicle needs a bay in the motor pool, an aircraft or a helicopter a bay in the hangars, and goods a place in the stores.

**What suppliers sell.** Twenty-three vehicles of eras 1 and 2 bought outright (carriers, recon, artillery, anti-air, logistics, medical and engineers), plus uniforms, radios, medicine, rations, spares, fuel and the parts the works consume. Tanks and helicopters are never for sale.

**Manufacturing.** The company builds **tanks and helicopters and nothing else** (a test reads the catalogue). A model's price is its whole cost: the parts, bought and held in the stores, plus the works' fee paid when a unit starts. A works has two lines (one when damaged, none for a ruin); a line builds one unit at a time at the model's days for one shift; more shifts (up to three) finish sooner and need more technicians. A line that cannot start or finish says why (parts, crew, the fee, a free bay, a damaged works) and the reason is saved. The works wear with use and slow down; mending costs by the point of wear; two upgrades build 15% faster each. Prices are calibrated to the Aerospace ladder (210,000 to 2,600,000).

**Contracts.** Offers turn up by hash (no dice), at most three open at once (more with a good name), and lapse with a reason. A job asks for guards, a pistol each and a radio, and nothing heavy: a firm of four guards can work the whole game. The pay arrives only when the job ends well and goes to the company's account; a failure costs a share of the pay (owed, never taken from you), reputation, and the client for a month. A win raises the name, and a good name brings more offers and bigger jobs.

## People, base life and generals (v0.100.0)

Release 3 of the war update, "War: People, Base Life and Generals".

| Piece | Where |
| --- | --- |
| Ten troop classes plus guard and technician, weapon tiers 1 and 2, armour eras 1 and 2, squad looks | `src/content/troops.js` |
| Hiring, training, uniforms, wages | `src/war/people.js` |
| What a soldier carries (weapon, gadget, plate carrier), taken from the stores | `src/war/loadout.js` |
| Squads: leader, members, vehicles, look | `src/war/squads.js` |
| The living base: rations, meals, beds, treatment, morale, fatigue, readiness | `src/content/base.js`, `src/war/base.js` |
| Soldiers drawn as bodies on Hollowmoor Lot | `src/war/bodies.js`, `src/content/dialogue/soldier.js` |
| Eight generals with real differences | `src/content/generals.js`, `src/war/generals.js` |
| Engagements (heavy contracts) and the one pure combat function | `src/war/engagements.js`, `src/war/combat.js` |
| The Military app: People, Squads, Armoury, Base, Generals and engagement screens (reached from the Company page) | `src/ui/militaryPeople.js`, `src/ui/militaryGenerals.js` |

**Strategic missile storage.** A secure integration hall can be told to build a strategic missile product for storage like an aircraft: it stops in the secure store (never on a convoy, never sold). A contract for a strategic product is still delivered by its own convoy, and the manager agrees. The war company takes a stored missile into its stores (twenty places each) for free and can return it as the same record.

**People.** A recruit of a troop class trains for the class's days (a place at the range or training ground for each), is issued a uniform from the stores, and then works; guards and technicians start at once. Squads are for troops only (guards stand contract posts, technicians crew lines): a leader must be an officer, a squad holds twelve, and every person and vehicle is in one squad or none. **A weapon is in one pair of hands:** equipping takes an item from the stores, a tier change swaps the old one back and takes the new one, a dismissal returns everything, and a guard on a contract carries their own pistol (no second one is drawn). Tier 1 and 2 weapons are items the Arms works makes; plate carriers are bought. Looks (colour, pattern, insignia, crest, band) are free and change nothing.

**The base.** Each day everyone eats a ration from the stores (a mess hall gives a hot meal to as many as it seats, which lifts morale; without rations they go hungry), beds and treatment places are real (people beyond the beds lose morale; the wounded heal only within the treatment places and the medicine available, a medic on the books helps, the untreated heal a point every fourth day). Morale and fatigue are per person; readiness is worked out from five parts (at work, morale, armed, fed, housed) and shown with them, with the shortages in words. A crew's morale reaches a contract's chance of success. The base runs the same whether you are there or not. **The bodies** you see on Hollowmoor Lot are derived from the records, at most 40 at once, officers and squad leaders always, none for anyone away or dead; they sleep in the barracks, eat outside the mess and spend the day at their duty, and the company's people use its doors.

**Generals.** Eight generals, each with offence, defence, logistics, air and intelligence, a readiness to accept losses, and ground they know. The command post has a desk for one general per five desks. An **engagement** is a heavy contract (hold a crossing, defend a depot, retake a post, escort a convoy) in a real atlas state, from a client country; it needs soldiers, tanks, helicopters and medics **you really own**, in squads you choose (nothing is spawned; the screen says what is missing). You see an **estimate** from the same function that will decide it (`src/war/combat.js`): the odds, the chance of each result, the expected losses and what the odds are made of. The one state field moves only forward: `open → delegated (or the overhead battle, in a later release) → resolved`. When the days are up the result is worked out once from the real forces (a hash of the engagement's key stands in for chance, so a reload cannot re-roll it) and **applied once** to the records: the dead leave their squads, the wounded are hurt, lost vehicles are destroyed, fuel and rockets are used, pay arrives in the company's account (a share of it if only some objectives were met; a failure is a fine owed and a client lost). The after-action report is built from what was applied.

## The new look and battles (v0.101.0)

Release 4 of the war update, "War: The New Look and Battles": the look renderer (9b) and the first tactical engine (10a).

| Piece | Where |
| --- | --- |
| The one combat function behind both ways of fighting | `src/war/combat.js` (aggregate), `src/battle/sim.js` (played) |
| Battle maps: City and Fields-and-villages, from a seed | `src/battle/map.js`, `src/content/battle.js` |
| Sight, moving, A* | `src/battle/nav.js` |
| A battle's setup, made once from the real forces and the engagement | `src/battle/setup.js` |
| The pixel fire and smoke layer; war vehicles; roofs and one-floor plans; the helmet | `src/engine/drawBattleFx.js`, `drawWarVehicles.js`, `drawBattle.js`, `drawPeople.js` |
| The battle panel (camera tiers, selection, orders, floors) | `src/ui/battle.js` |
| Leading an engagement yourself; the apply-once path | `src/war/engagements.js` (`play`, `applyOutcome`) |

**Decisions made first** (the design the code follows):
- **Chance is a hash.** The battle runs at ten steps a second, and every roll is a hash of (the engagement's key, the tick, the unit); nothing reads a clock or a draw (a test reads the sources for `Math.random`, `Date.now`, `performance.now` and `.rng`).
- **A save is a setup, an order log and a tick.** A battle in progress is stored on its engagement (small) and a reload replays it to where it was and on to the same end: it can never be re-rolled. A test replays a battle with orders and compares every unit.
- **Playing it is not a shortcut to the money.** Like a delegated engagement, a played one keeps your forces away for its days; the result is filed when the battle ends and **applied once, on the last day**, through the same `applyOutcome` a general's result uses (the dead leave their squads, the wounded are hurt, lost vehicles are destroyed, stock is used, the pay arrives). A battle nobody fought by then is fought by the aggregate function, with no general.
- **One state field, forward only:** `open → delegated | tactical → resolved`. Taking it to the field and giving it to a general close each other.
- **Vehicles are units with hit points** (a tank can be destroyed and is reported lost; small arms barely scratch it): no module damage yet.
- **The aggregate and the played battle agree.** Their tables are shared (armour eras, class power, cover), and a calibration test runs about 100 headless battles (AI against AI, both ways a fight can go, four odds) and holds the chance of success and the losses to the aggregate estimate's. Losses in the aggregate were raised to match.
- **Where an engagement is:** a real place in an atlas state; a city or a town makes a **City** map, anywhere else **Fields and villages** (forest, mountain and desert use Fields with the biome's ground colour for now).
- **The owner's answer on floors:** when a force is upstairs the building opens to one floor's plan, and a switch per building shows the ground floor instead.

**The battle.** A map is a grid made from the engagement's key: roads, hedges, crops, trees, a river with a ford, buildings with a wall all round, windows, a door and a stair, in the style of the place's country (five styles as data). Every building is reachable on foot from where you start (a test checks it on every seed of both recipes and every style). **Sight** is a line that walls and trees stop, unless you are above them (a building of f floors blocks a look from any floor below f); each floor adds three tiles of sight and a tile of reach; **cover** takes a share of shots (a hedge or crop a quarter, a building three quarters, a window most); **suppression** builds from shots and moves a soldier through steady, shaken, pinned and broken (a broken soldier runs, a rallied one stops; higher morale resists longer); a soldier put out of action is dead with a chance (less with plate armour) or badly wounded. **Orders:** move, attack-move, hold, garrison (a building and a floor: the soldiers go in by the door, change floor only on the stair, and take a window) and retreat. **Objectives** are three, as in the aggregate result: the ground held (or taken, or a convoy through), the enemy put out of action, your own losses kept under a third.

**The look.** The pixel fire and smoke layer draws every particle as hard art pixels on a seven-colour fire ramp, five greys and five browns, with an ordered dither and a dark rim, capped at 600; war vehicles are painted on the game's pixel idiom (outline, light from the upper left) and turned by sixteenths; people are the game's own sprites with a new additive `helmet` hat style (the company's soldiers on Hollowmoor now wear it). **Three camera tiers:** far (a banner per group), command (everything at the game's own scale) and close (the same sprites, enlarged by whole numbers). Buildings are seen from above with a roof and a row of windows per floor; an occupied building opens to one floor's plan with its label.

## Honest limits (v0.101.0)

- **Orders:** the rest of the order list (flank, suppress, regroup, escort, recon, smoke) and formations are not here; neither are support from real stock (air strikes, missiles, mortars), smoke screens, fog of war from strategic intel, engineers and evacuation, or module damage and armour facing (v0.102.0).
- **Maps:** only City and Fields (the other recipes, the trench line, compound, forest and the industrial, port and airfield maps, come later). Forest, mountain and desert engagements use Fields with a biome tint; the ground has no destructible walls, rubble or craters yet (v0.104.0).
- **Look:** the four extra car models (van, ambulance, box truck, jeep) are not added; battle maps carry no civilian traffic. The car painter and the world's traffic are untouched. Vehicles are one sprite each (no separate turret). Wrecks are drawn but do not block movement.
- **The enemy** is a strength turned into units, not a drawn force; its AI is simple (attackers go for the objective and then for the nearest enemy; defenders take a nearby building or hold round the objective).
- **Cover** is read from the tile and its neighbours; there is no cover from vehicles or rubble. Sight and fire between floors of a building use the height rule above, not individual floors' walls.

## Honest limits (v0.100.0)

- Bodies are the existing person sprite in a cap (the helmet and the overhead look come with the look release); vehicles and aircraft are not drawn on the lot yet.
- Armour eras 3 and 4 and weapon tiers 3 to 5 are future research. A soldier's ammunition is not tracked person by person: anti-tank rockets and fuel are used at the engagement.
- Vehicle upkeep (spares, wear) is not in the base yet; only people are.
- The engagement is fought by a general at the aggregate level; playing it yourself arrives with the tactical engine. Its enemy is a strength, not a drawn force, and the clients are the atlas's countries, not yet wars in the geopolitics record.
- A general is a record with a body at the command post; no dialogue beyond the soldiers' generic lines.

## Honest limits (v0.99.0)

- **Ships are not moved**: they stay with the shipping company (moving a ship would need its upkeep, its voyages and every place that lists vessels to follow it).
- Bought vehicles and supplies arrive at once (no supplier lead time). The armoury's perks and abilities do nothing yet; the four bars are data.
- Taking an aircraft out of Aerospace's storage leaves a standing order free to build another toward its storage goal: that is real Aerospace spending, and is left as it is.
- Contracts are resolved by a hash against a chance, with no scene: guards cannot be hurt yet.

## Honest limits (v0.98.0)

- Nothing is hired or produced yet: people, squads and equipment have their record shapes and are checked, but arrive in v0.99.0–v0.100.0.
- The licence and the permit are granted on payment; there is no inspection.
- The interiors of the facilities are generated rooms, not made ones.
- Fort Gullcrest has its garrison of six and nothing else yet (no tanks or aircraft); its structures are not under the damage gate.
