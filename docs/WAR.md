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
| The pixel fire and smoke layer; war vehicles; roofs and one-floor plans; the helmet | `src/engine/drawBattleFx.js`, `drawBattle.js`, `drawPeople.js` (the simplified vehicle painter, `drawWarVehicles.js`, was replaced in v0.102.0 by `drawFleet.js`) |
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

## Battle depth (v0.102.0)

Release 5 of the war update, "War: Battle Depth": vehicles with modules and facing, support from the real stock, smoke, breaches and suppress, **and the battle look brought up to the approved mock-ups**.

**A correction.** v0.101.0 was described as a port of the mock-up look; what it shipped was a simplified renderer (flat tiles, grey roofs, plain vehicle shapes). The mock-ups are painted with the game's own painters plus four war pieces, and this release uses all of them:

| Piece | Where |
| --- | --- |
| The ground: the game's own ground painter over the map's glyph grid, graded to the biome | `src/engine/battleGround.js` (`gameMapOf`, `bakeGround`, `grade`) |
| Roofed buildings (roofs, chimneys, dormers, facades, signs, awnings, five styles) | `src/engine/drawRoofed.js` |
| Ten car models | `src/engine/drawBattleCars.js` |
| Tanks, carriers, scouts, guns, helicopters (a spec each; hull, turret, rotors) | `src/engine/drawFleet.js` |
| Soldiers by role (packs, helmets, markings) | `src/engine/drawSoldiers.js` |
| Aircraft passes, smoke screens, flames | `src/engine/drawBattleFx.js` |
| The scene: ground, props, cars and buildings baked once, drawn back to front with the people between | `src/engine/drawBattle.js` (`bakeScene`) |

**Decisions made first:**
- **One glyph grid is the truth.** `src/battle/map.js` writes the ground as the characters the game's painter reads, plus props and cars, and the sim's tiles are *derived* from them (a road or a bridge glyph is road, water is water, a field is crop, a tree prop is a tree tile, a bush prop a hedge tile). The picture and the rules cannot disagree. A test checks that every tree prop sits on a tree tile.
- **A map version.** The setup says `map.ver` (2 from this release). A setup without it (a battle saved by v0.101.0) is generated by the first generation of maps (`cityV1`, `fieldsV1`, smaller sizes) so a saved battle never changes under the player; the renderer paints those maps in the new look from their tiles.
- **Buildings are as deep as their floors need.** A front face shows one row of windows per floor (12 art pixels each), so the generator makes a building tall enough for its floors (and no more than the block allows).
- **Paint is baked.** The ground, each building (with room for its shadow) and each car are painted once to their own canvases; a frame only draws what is on screen. A map is at most 120 by 64 tiles (3,840 px), under the canvas limits of a phone.
- **Support is consumed only where records change.** The simulation holds the counts from the setup and a log of what was called; **`applyOutcome` takes the stock once, on the engagement's last day**, exactly as it does fuel and rockets. The setup is made from what the company holds at the moment the battle begins (missiles and drones in the stores, at most three of a kind; aircraft that are `stored` and unassigned, as many as the fuel allows).

**Vehicles.** A ground vehicle has four modules (tracks, gun, engine, crew; integrity 1 at the start). A hit lands on a module by a hash with the table's shares (30, 25, 20, 15 and 10 percent on the hull alone) and wears it by the damage over half the vehicle's hit points. Below 0.5 a module works badly (tracks half speed, aim less true); below 0.15 it is out: tracks, it cannot move; gun, it cannot fire the main gun; engine, it burns (5 hit points a second until it is gone); crew, it is abandoned and lost. The side that faces the shooter (its last direction of travel) multiplies the damage: front 0.6, side 1.0, rear 1.4. Helicopters have no modules (their armour is one number).

**Support.** `callSupport(B, { kind, x, y })`: a guided missile (blast 3 tiles, 420) or a cruise missile (4 tiles, 700), a drone (1.6 or 2.2 tiles), a fighter's strafing pass (a line 22 tiles long) and a bomber's run (four bombs 3 tiles apart); each lands after its delay (3 to 6 seconds) with a ring drawn on the ground, and a blast hurts **everyone in it, your own too** (half behind a building's walls). A strike that is big enough breaches the wall segments at its middle. Smoke: engineers and officers carry two grenades each (a part of their issue, not stock); a cloud blocks any look through it for thirty seconds. The panel lists what can be called (each item with its count, each aircraft not yet used) and shows the ring where the strike will fall.

**Orders added:** `smoke`, `suppress` (a point; no target needed; pins whoever stands within two and a half tiles) and `breach` (a tank or an anti-tank soldier (a rocket or the tank gun, not a rifle) opens a wall segment: two tank shells, and the wall becomes rubble that does not stop a look or a person). Orders and support are in the log, so a save replays them.

## Strategic command (v0.103.0)

Release 6a of the war update: the strategic layer's ground, units and orders. The proposal (`PROPOSAL_WAR_STRATEGIC.md`) is built in three releases (103.0, 103.1, 103.2); this is the first.

| Piece | Where |
| --- | --- |
| Provinces: lattice cut of every state, terrain, roads, railways | `src/world/provinces.js`, `tests/strategic_provinces.test.mjs` |
| The numbers (terrain, infrastructure, march, sealift, retainer, garrison, slots) | `src/content/strategic.js` |
| Templates, battalions, theatres, enlisting, sealift, orders, marches, contact | `src/war/strategic.js`, `tests/strategic_war.test.mjs` |
| A battle on the map is an engagement | `openStrategic` in `src/war/engagements.js`, `src/war/hooks.js` |
| The map, the panels, the screens | `src/ui/strategic.js`, `src/engine/drawStrategic.js` |
| Saved record | `world.military.war`: `control` (only provinces that changed hands), `templates`, `battalions`, `employer`, `hour`, `log`, `paid` |

**Decisions made first** (the owner's): staged release; strategic orders create engagements; the whole world exists with stable ids, only active theatres tick; a battalion owns its squads and vehicles; the employer provides the sealift; you enlist for a side with a retainer and a bonus.

**Provinces.** 4,115 over the land (the proposal's 1,300 was wrong; the lattice in its own mock-up gives about 100 in the Halden window and about four thousand worldwide). Ids are lattice cells and are pinned by a test: a change to the atlas that moves one will fail it.

**What a battalion is.** Squads (with their vehicles) bound to a template. The recipe's slots become needs by soldier role and vehicle class (a rifle section is a squad with a soldier in it; a tank slot needs a tank in the chosen squads); the raise screen shows each need against what the choice brings. The stats on the right of the map are derived, not stored; organisation is stored.

**The employer.** `enlist` needs the licence, a theatre with two sides that is fighting (a land theatre always is; others when the arms market has them at war), and a side. The staging province is the side's best port-and-infrastructure province in the theatre. Sealift both ways takes `max(2, distance / 700)` days; nothing is paid at sea or at home. Retainer: 170 obols a soldier a day and a vehicle rate by class (a tank 1,400). Ground taken pays 25,000 a victory point and adds reputation.

**Orders.** `move` goes through ground the employer's side holds (Dijkstra by march hours inside the theatre); `attack` goes into an adjacent enemy-held province (organisation 30 or more); `defend` digs in; `withdraw` is a move to the staging province. A leg takes `distance × 1.25 / (speed × terrain × infrastructure × railway)` hours. `advance` runs the hours since last time from the game's clock (at most 40 days at once) and is called by the hourly tick, the daily tick and the map screen.

**Contact.** The garrison is `5 + 3 fort + 2 vp + 4 (urban) + 2 infrastructure` troops with a spread of ±15 percent by the province's own hash (armour one for a fort of two, more for a capital), zero once the ground is yours. The result is the engagement's: objectives two or more take the province. Organisation falls by 12, 22, 40 or 65 for 3, 2, 1 or 0 objectives.

## Honest limits (v0.103.0)

- **The strategic exchange of the proposal is not here.** There is no hourly battle between battalions, no combat width, reserve or plan bonus: a contact is one engagement, decided by the same aggregate function or the played battle as every other. The stats shown for a battalion are derived for the player to read and are **not** used by the resolver (the engagement's forces are the real squads and vehicles, as before).
- **No supply, fuel, weather, intelligence levels or fog.** The panel says so where supply would be. The enemy is shown with a reported garrison size; there is no uncertainty yet. (103.1)
- **The enemy does nothing.** Garrisons are static: they do not counter-attack, reinforce, retake ground or move; defending and digging in therefore only builds entrenchment, which nothing yet reads. The nations' wars are 103.1.
- **No air, sea or landings.** A theatre's land is the only ground; a province on an island is reached only by the sealift to the staging province. Air wings, fleets, convoys and helicopters moving troops are 103.2.
- **Employers and money.** The retainer rates are starting figures, set from the existing engagement pay rates and not calibrated against the company's costs; reputation moves only with ground taken. Discharging is allowed only with every battalion at home; ground keeps the owners it has when you go.
- **Strategic engagements** are not the client's contracts: no pay of their own, no client reputation, no ban; if nobody decides one in three days the battalion breaks off. The ordinary contract offers (hold, retake, raid, extract, rescue) are unchanged and are not yet tied to provinces on the map.
- **Drawing.** Battalions are banners with two bars, not the mock-up's figurines; the map's modes Supply, Weather, Air, Naval, Intel and Contracts are greyed buttons; the ground is drawn from the world's shape, so coasts are the world's own and the province borders are the exact cut. A theatre draws once per session in about three seconds (a progress count shows).
- **Time.** The map moves the world's clock with `skipTime` (the same ticks as sleeping): a day at the fastest setting takes about two seconds of real time, and everything the game does by the minute goes on meanwhile (your own energy runs down, shops restock, other businesses run their days). Soldiers overseas still eat and sleep on the base's books (as soldiers on a contract post do).
- **Scale.** Only the theatre you enlisted in is baked and drawn; the whole world's provinces exist for lookups (about 1.3 seconds the first time) but nothing outside an enlisted theatre is simulated.

## Battle depth III (v0.102.2)

Release 5c of the war update: what v0.102.1's report listed as not done (except fog from strategic intel, which belongs to the strategic layer in v0.103.0).

| Piece | Where |
| --- | --- |
| Rules 4 and its pins | `src/content/battle.js` (`RULES`), `tests/battle_frozen.test.mjs` |
| Designation | `src/battle/sim.js` (`designated`, `applySupport`, the FPV and launcher branches), `src/content/battle.js` (`DESIGNATE`) |
| Rainmaker, Longbow, battery | `src/content/battle.js` (`ARTY`), `src/content/procurement.js`, `src/engine/drawFleet.js`, `src/battle/setup.js`, `src/war/engagements.js` (`enemy.battery`), `tickBattery` in the sim |
| Stances, reverse, repair, deploy, load and unload, trench collapse | `src/battle/sim.js`, `src/content/battle.js` (`STANCES`, `CARRY`, `BAIL`, `REPAIR`, `DEPLOY`, `TRENCH_COLLAPSE`) |
| Reserve | `callReserve` and `placeUnits` in the sim, `play(game, id, squads, reserves)`, the Military app's engagement screen |
| Raid, extraction, rescue | goals `raid`, `extract`, `rescue` in the sim; `VIPS`, `RAID`, `VIP_HOME`, `RESERVE` in the content file; `ENGAGEMENTS` in `src/content/generals.js`; the estimate maps them in `src/war/combat.js` |

**Designation.** A point is designated for a side when an enemy within 3.5 tiles of it is in sight of one of its units (not one riding inside a carrier), under one of its scout drones, or, for you, was spotted within the drone's two-minute memory. `callSupport` refuses a strike at a point that is not designated and spends nothing; an FPV order and a launcher's fire order that find no designation drop, with a label on the field. Guns firing shells are held to it too (the owner's answer was every strike): the check comes after the stock check, so a gun with no shells says so, and one with shells but no designated point drops the order and spends nothing. Scatter is still 0.8 tiles when someone sees the point and 3.6 when it is held only by the drone's memory.

**Launchers.** The Rainmaker takes three shells for twelve rockets (110 damage, 1.5 tiles each) spread over a 3.5-tile field, interval 14 seconds, range 50. The Longbow takes one missile a shot (guided if there is one, else cruise), interval 25 seconds, range 80, and the missile lands after the longer of its own delay and its flight. Both deploy for five seconds, and moving packs them up.

**The battery.** `enemy.battery` is 0, 1 (16 or more troops) or 2 (28 or more). Each is a fixed unit that is not counted as a fighter (`onGround`), is never ordered by the AI, and when a gun of yours fires from a place it has not answered it fires ten shells at that place (scatter 2.5) 15 seconds later, then reloads. It is marked spotted when it fires. Kill it and it says nothing.

**Reserve.** `play(game, id, squads, reserves)` marks the held squads' people and vehicles `reserve: true` in the setup; they are not units until `callReserve` (logged as a `reserve` order, replayed) puts them at your edge after 20 seconds. A headless side calls it at 30 seconds; when nothing of yours is left on the field it is called for you. `applyOutcome` only reads the units that were in the battle, so an uncalled reserve takes no losses.

**Missions.** A raid ends when you have held the marked ground for 12 seconds, whatever the enemy is doing, or when the enemy is beaten; its clock is five minutes. An extraction and a rescue put a person (`vip`, not a record and not a fighter) at the marked ground; the mission is won when they are within four tiles of your own start edge (on every recipe the way from the person to that edge is walkable, tested), lost if they die. The officer is a normal man; the pilot has 60 percent of the hit points and 65 percent of the speed. The other two objectives (enemy put out, own losses within the ceiling) are scored as in every battle.

## Honest limits (v0.102.2)

- **Designation:** it applies to every strike of yours, a gun's fire mission included, so a battery cannot be shelled blind any more; the enemy calls no strike, so it has no designation to need. The panel refuses a fire order at an undesignated point before it is given; a point held only in the drone's memory is still allowed, and lands wide.
- **Reserve and `needs`:** squads held in reserve still count toward an engagement's needs (the check is on what you commit), so a requirement can be met with squads that never come on.
- **The aggregate resolver is still not changed for any of this.** A raid is weighed as an attack, an extraction and a rescue as a convoy, and the enemy battery, a reserve and designation do not enter the estimate. The played battle is checked only to this extent: a strong force does a raid, an extraction or a rescue far more often than a weak one on every kind of ground (`tests/battle_missions.test.mjs`); a rate-for-rate calibration of the new goals against the estimate has not been made.
- **Extraction and rescue** score the same three objectives as other battles, so "put the enemy out" counts for them too; the pilot does not bleed out; nobody can be carried (the pilot walks, slowly); no helicopter picks them up.
- **The battery** answers the place a gun fired from, not a rocket launcher's or a drone's; it does not move, uses no stock, and does not answer the player's missiles.
- **A reserve** you never call still earns the engagement's experience and morale (everyone committed to the engagement does).
- **Rules 4 behaviour** applies to new battles only; a battle saved under rules 3 has none of it (no stance, no deploy time, no designation, no collapse).
- Fog of war from strategic intel is v0.103.0; there is no flown FPV window (kept automatic).

## Battle depth II (v0.102.1)

Release 5b of the war update: what v0.102.0's roadmap row promised and did not ship, plus a repair of how saved battles are kept.

| Piece | Where |
| --- | --- |
| Rules and map versions pinned; replays of the two earlier generations | `src/battle/sim.js` (`B.rules`), `src/content/battle.js` (`RULES`), `tests/battle_frozen.test.mjs` |
| Trench line, compound, forest | `src/battle/map.js` (`trenchV2`, `compoundV2`, `forestV2`), `src/engine/battleGround.js` (`paintTrench`, `paintWire`, `paintCrater`) |
| Fire missions, strategic missile, anti-air, station time | `src/battle/sim.js`, `src/content/battle.js` (`ARTY`, `SCATTER`, `FLAK`, `STATION`, `SUPPORT.strategic`) |
| Tending, evacuation, charges, scout and FPV drones | `src/battle/sim.js` (`TEND`, `CHARGE`, `UAV` in the content file) |
| Flank, regroup, escort, recon; formations | `src/battle/sim.js` (`issueFormation`, `formationSpots`) |
| What a battle is offered, held and spent | `src/war/reserve.js`, `src/war/engagements.js` (`supportOf`, `applyOutcome`) |
| Shells and breaching charges | `src/content/arms.js` (`item_artillery_shell`, `item_breach_charge`, recipes `shell` and `charge` at the Explosives Bay) |

**Decisions made first** (the owner answered the three that were his to make):
- **A saved battle replays as it was played.** A setup carries `rules` (3 from this release; absent means 1 or 2 by its map version) as well as `map.ver`. Maps of the earlier generations and replays of battles made under them are pinned by numbers that the v0.101.0 and v0.102.0 code produced themselves. Everything that happens without an order (a medic tending, a helicopter's station time, anti-air, the anti-air weapon on your own AA vehicles) is on only under rules 3; modules and facing (v0.102.0) are gated on rules 2. The existing city and fields generators are not touched.
- **Shells and charges are Arms works items** (the proposal's answer, and the owner's): two new items with recipes at the Explosives Bay, transferable like missiles and drones; at most 24 shells and 6 charges are offered to a battle.
- **Anti-air can destroy the aircraft record** (the owner's answer): a pass inside a live enemy gun's reach has a chance each tick; a shot-down aircraft is lost through `applyOutcome` with a line in the report. The panel warns when an enemy AA gun is in sight.
- **FPV is an automatic dive** (the owner's answer), not a flown window.
- **Held for the battle, spent once.** `reserve.js` now also holds shells, charges, strategic missile records, and the aircraft record; none can be offered to a second battle or handed back to the Arms works or Aerospace until the engagement is resolved.

**Maps.** The three recipes come from the mock-up generator; new tile types are appended (a trench: people walk in it and get sandbag cover 0.75; wire: people cross it at 40 percent speed, vehicles cannot). Trenches have crossings so a tank can get over a line. A compound's wall is a wall tile (a charge, a shell or a rocket breaches it). The forest's trees are tree tiles (they stop sight); reachability is checked on every seed, style and biome.

**Fire.** A shell is a pending blast with a flight time (distance over the gun's shell speed) and a scatter (3.6 tiles blind, 0.8 when a soldier of yours sees the point or a scout drone of yours is within 12 tiles). A strategic missile lands after 20 seconds with a 7-tile, 1,800-damage blast. Enemy anti-air guns (`enemy.aa`, set by offers that have helicopters) fire at helicopters only and bring a pass down by chance each tick (1.2 percent a gun).

**Team.** Medics: idle and unengaged, a medic goes to the nearest downed friend within 9 tiles and stabilises him in 6 seconds; a stabilised soldier counts as wounded, never dead. A medevac helicopter within 2.2 tiles of a downed soldier lifts him off the field. An engineer's `charge` order walks to the wall, plants (3 s), steps back, and the charge goes off after 4 s. UAV: a scout drone flies where it is sent at 7 tiles a second, spots enemies within 12 tiles, runs a 3-minute battery and then the operator waits 30 seconds; an FPV drone takes one attack or strike drone from the stores, steers onto the nearest enemy within 7 tiles of its point and goes off. Anti-air shoots both down (3 percent a tick a gun).

## Honest limits (v0.102.1)

- **The aggregate resolver is not changed.** Played battles under rules 3 are a little kinder to a force with medics than the estimate says (medics tending on their own lowers deaths); the calibration test still holds. A general's result is exactly what it was.
- **Anti-air and the count:** an enemy anti-air gun is not counted as a force on the ground (it does not hold a zone, and "the enemy is beaten" does not need it put out; a test holds a battle with guns to the result it has without them); the aggregate resolver ignores them altogether. Your own anti-air vehicles now carry an anti-air gun in new battles and cannot fire at ground targets (a battle saved earlier keeps its machine gun).
- **The Arms manager** never picks the shell or the charge for an idle Explosives Bay (they are `manual` recipes: made only when you set a station to them), or it would have stopped making the warheads the Rocket Bay needs.
- **Breaches:** a charge, a shell, a rocket or a tank gun opens a building's wall or the wall round a compound; a trench cannot be destroyed.
- **Drawing:** from the far camera tier a tree is a green blot (a forest in view is thousands of sprites); opening a forest battle bakes for about a second and a half.
- **Not here:** counter-battery fire; MLRS and the missile launcher (not in the company's vehicle list); stances (aggressive, defensive, hold fire); vehicle orders (reverse, deploy, load and unload, repair); designation of targets for strikes (the strikes shipped in v0.102.0 need none); reinforcements and the other mission types (extract an officer, rescue a pilot, raid); a flown FPV window; fog of war from strategic intel (v0.103.0); destructible trenches.
- **Drones and aircraft are small procedural sprites**, not the mock-up's detailed ones; there is no posture for a soldier in a trench; skirmish lines do not widen under fire; a medevac helicopter has to be flown over the wounded by hand.
- **Enemy:** it calls no support, uses no drones, and its medics tend under the same rules as yours. Anti-air appears only in offers that include helicopters.
- **Forest and trench battles are large (120 by 76 and 120 by 74 tiles):** crossing one takes a minute or two.

## Honest limits (v0.102.0)

- **Not here yet from the 10b/10c plan:** artillery and mortar fire missions, strategic missiles in a battle, helicopters on station for support, evacuation of the wounded, engineers' breaching charges (a gun or a rocket breaches this release), the UAV and FPV team, fog of war from strategic intel (it comes with the strategic layer in v0.103.0), and the other map recipes (trench line, compound, forest, industrial, port, airfield: the mock-up generator for trench, compound and forest exists in `docs/mockups/src/war/g_gen.js` but is not ported). The other orders (flank, regroup, escort, recon) and formations are not here.
- **Support:** the enemy calls none, and an aircraft is never shot down (no anti-air in the battle). A drone is a strike, not a unit you fly. **What a battle is offered is held for it** (`src/war/reserve.js`): while an engagement is tactical, the missiles, drones and aircraft in its setup cannot be offered to another battle and cannot be handed back to the Arms works or Aerospace. The fuel for passes is taken from what is there at the end (the stock is not locked; a short supply simply takes less). Cars on a battle map are parked or stopped, not driving.
- **Modules** apply to ground vehicles; a destroyed module is not repaired on the field (the vehicle is repaired by the motor pool after the battle only as far as the existing repair rules go: a lost vehicle is lost, a damaged one is not tracked between battles).
- **Look:** the aircraft are small procedural silhouettes, not the mock-up's detailed aircraft; building damage (burning roofs, holes) from the mock-up is not drawn on roofs; trenches, wire and craters are not in any recipe yet; a breached wall shows as a rubble tile, not as a broken wall. The ground has no weather.
- **Sizes:** the Fields map is 120 by 64 tiles and the City 88 by 56: a battle takes a little longer to cross than in v0.101.0, and the calibration test (aggregate against played) still holds.

## Honest limits (v0.101.0)

- **Orders (suppress, smoke, support, module damage and facing arrived in v0.102.0):** the rest of the order list (flank, suppress, regroup, escort, recon, smoke) and formations are not here; neither are support from real stock (air strikes, missiles, mortars), smoke screens, fog of war from strategic intel, engineers and evacuation, or module damage and armour facing (v0.102.0).
- **Maps:** only City and Fields (the other recipes, the trench line, compound, forest and the industrial, port and airfield maps, come later). Forest, mountain and desert engagements use Fields with a biome tint; the ground has no destructible walls, rubble or craters yet (v0.104.0).
- **Look (superseded: v0.102.0 added the ten car models, parked cars and the mock-up look):** the four extra car models (van, ambulance, box truck, jeep) are not added; battle maps carry no civilian traffic. The car painter and the world's traffic are untouched. Vehicles are one sprite each (no separate turret). Wrecks are drawn but do not block movement.
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
