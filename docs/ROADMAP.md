# Roadmap: the Atlas, the Presidency and the War, stage by stage

Status: **the code is at v0.101.0** (the World Atlas, v0.92.0, Politics: Foundations, v0.93.0, and Politics: The Capital, v0.93.1, and Politics: People and Government, v0.94.0, and Politics: The Mansions, v0.94.1, and Politics: Elections and Influence, v0.95.0, and Politics: The Economy and Diplomacy, v0.96.0, and Politics: Unrest, Your Party and What Turns Up, v0.97.0, are released — **the Politics update is complete** — and War: Base and Company, v0.98.0, and War: Supplies, Factories and Contracts, v0.99.0, and War: People, Base Life and Generals, v0.100.0, and War: The New Look and Battles, v0.101.0, are the first four releases of the War update; __TESTS__ tests pass, smoke __SMOKE__); the rest of the War update and the Post-War update below are **planned only**. This file is the **single master list of releases**. Where an older plan document gives a different release number for the same thing, **this file wins** (the older rows were reconciled on 2026-11-01, see section 5).

Rules for every release (from the standing instructions): ask before guessing; accuracy over speed; `node tools/build.mjs`, `npm run check` and `npm run smoke` before each code release; every edited existing test is listed; commits end with the two attribution lines; push to `claude/funny-mayer-52dll8`; no money from nothing; the casino tasks (#33, #35) stay paused.

## 0. The batched schedule (decided 2026-11-03: smaller stages are combined into full releases)

**This section is the current schedule and wins over every release number in sections 2 to 6**, which still describe the *stages* (what each contains); their old one-stage-per-release numbers are superseded. A batched release still builds its stages in order, each tested before the next, but ships, runs the full suite, rebuilds `index.html` and updates the release files **once**. 23 releases instead of about 53.

Order (yours): Atlas, then Politics, then War, then the Post-War Expansion. Between them small fix releases (0.91.x style) are still allowed.

| Release | Name | Stages it contains |
| --- | --- | --- |
| **v0.92.0** ✅ | World Atlas | **Released 2026-11-03.** The redrawn world, 11 countries, 77 states, 131 places, rivers and roads as data, the Atlas page on both maps. *Not done: the Sund bond merge (see section 6). The Post-War city layer stays in v0.106.0.* |
| **v0.93.0** ✅ | Politics: Foundations | **Released 2026-11-03.** 1 Baseline (`docs/POLITICS_AUDIT.md`), 2 Data model (parties, Vegas and Susan, term, read-only overview). *The Crown Quarter was split out:* |
| **v0.93.1** ✅ | Politics: The Capital | **Released 2026-11-03.** 3 Capital: the Crown Quarter, Halver House, the Crown Gate, zones. *Guards move to v0.94.0 with the people.* |
| **v0.94.0** ✅ | Politics: People and Government | **Released 2026-11-03.** 4 People (ambassadors, party staff, household, ministers; *the two mansions and custom party-office interiors move to v0.94.1*), 5 Government (policies, Assembly vote, budget), 6 Opinion (blocs × states, polls) |
| **v0.94.1** ✅ | Politics: Mansions and Party Offices | **Released 2026-11-04.** Ironcrest Hall (Vegas), Willowmere (Susan), the two headquarters as real offices with desks and a war room |
| **v0.95.0** ✅ | Politics: Elections and Influence | **Released 2026-11-04.** 7 Elections (calendar, campaigns, results, election night), 8 Influence (relationships, donations, lobbying, promises) |
| **v0.96.0** ✅ | Politics: Economy and Diplomacy | **Released 2026-11-05.** 9 Economy (policies reach farms, arms, aerospace, shipping, exchange, bonds), 10 Diplomacy (relations, disputes, the one writer for wars and embargoes) |
| **v0.97.0** ✅ | Politics: Unrest, Your Party and Release | **Released 2026-11-05.** 11 Unrest, 12 Your party, 13 Emergence (optional quests and ambient events), 14 Release (balance, migrations, regression) |
| **v0.98.0** ✅ | War: Base and Company | **Released 2026-11-05.** 1 Audit and skeleton (damage gate and base-protection flag first), 2 Places and construction (Fort Gullcrest, Hollowmoor Lot), 3 Company and state |
| **v0.99.0** ✅ | War: Supplies, Factories and Contracts | **Released 2026-11-05.** 4 Procurement, 5 Manufacturing (tank and helicopter works), 6 Early contracts |
| **v0.100.0** ✅ | War: People, Base Life and Generals | **Released 2026-11-05.** 7 People, squads and armoury (troop classes, UAV class), 8 Living base, 9 Generals |
| **v0.101.0** ✅ | War: The New Look and Battles | **Released 2026-11-05.** 9b Look renderer (fire and smoke layer, car models, roofed multi-floor buildings), 10a Tactical engine (camera tiers, squad orders, City and Fields recipes) |
| **v0.102.0** | War: Battle Depth | 10b Vehicles, air, missiles, artillery, breaches, 10c More maps, medics, UAV and FPV drones |
| **v0.103.0** | War: Strategic Command | 11a Strategic war (command map, fronts, battalions), 11b Air, sea and international contracts |
| **v0.104.0** | War: Destruction, Government Response and Coup | 12a Destruction, 12b Government response and the coup (needs Politics, done by here) |
| **v0.105.0** | War: Migration and Release | 13 Migration and regression, 14 Polish |
| **v0.106.0** | Post-War: Audit and the Atlas Layer | PW-1 Audit document, PW-2 city layer (unless folded into v0.92.0) |
| **v0.107.0** | Post-War: Living Sund I | PW-3 populated buildings, named NPCs with stories and schedules |
| **v0.108.0** | Post-War: Quests and Events | PW-4 quest framework and journal, PW-5 dynamic events |
| **v0.109.0** | Post-War: The Agency and Mission Instances | PW-6 agency and contracts, PW-7 template and instance architecture |
| **v0.110.0** | Post-War: Neumina City | PW-8 part 1: the class-divided map (skyline terraces, Glass Mile, under-levels), people, factions, implants |
| **v0.111.0** | Post-War: Neumina Operations | PW-8 part 2: hacking with limits, the intelligence contracts |
| **v0.112.0** | Post-War: Saint Halloran City | PW-9 part 1: the map, the three mobs, disguises, recognition |
| **v0.113.0** | Post-War: Mob War and Contracts | PW-9 part 2: the five escalation stages, the contracts |
| **v0.114.0** | Post-War: Content, Polish and Release | PW-10 content, PW-11 test and polish, PW-12 documentation and release |

**Rough size (tokens processed, an estimate to within 2x):** Atlas 2 to 4M; Politics 5 releases at 2 to 4M (10 to 20M); War 8 at 3 to 6M (24 to 48M); Post-War 9 at 3 to 6M (27 to 54M). About **63 to 126M** in all, 15 to 20% under the unbatched schedule, mainly from fewer full-suite runs and fewer release rounds.

**Cost of batching:** a bigger release is a bigger thing to review and to roll back, and a failure late in a batch holds up everything in it. Where a stage touches the payment layer or saves (Politics 9, War 1), its tests still gate it **inside** the batch before the next stage starts.

## 1. The three updates

| Update | Releases | Needs | Plan documents |
| --- | --- | --- | --- |
| **World Atlas** (shared) | v0.92.0 | nothing | `WORLD_ATLAS_PROPOSAL.md` |
| **Presidency / Politics** | v0.93.0 – v0.106.0 | the Atlas | `PROPOSAL_POLITICS.md` |
| **War / Mercenary company** | v0.107.0 – v0.120.0 (plus three art sub-releases) | the Atlas; the government military, the 4th star and the coup also need Politics | `PROPOSAL_WAR.md` and its five companions below |

War companions: `PROPOSAL_WAR_TACTICAL.md` (overhead battles, destruction), `PROPOSAL_WAR_STRATEGIC.md` (provinces, battalions, supply), `PROPOSAL_WAR_ARMOURY.md` (vehicles, troop classes, weapon tiers, looks), `PROPOSAL_WAR_DETAIL.md` (UAV team, artillery missions, the command map), `PROPOSAL_WAR_MAPS.md` (mission maps, roofed buildings with floors, cars, pixel effects).

## 2. Master release list

Ordering decision (yours): **Atlas first, then Politics (v0.93–v0.106), then War (v0.107–v0.120).** War releases that do not need politics could run earlier if you ask; only v0.118.1 (government response and coup) truly depends on it.

### 2a. Atlas

| Release | Stage | After it exists | Main tests |
| --- | --- | --- | --- |
| **v0.92.0** | Atlas | the redrawn world (Sund down to the home island, the added chain of land, lone islands and noise archipelagos removed), 11 countries (Westreach, Sunmouth Compact and Dunmere promoted), 76 states and regions, about 130 places, military sites, theatres, biomes; **rivers and roads stored as data and drawn on the Atlas page**; Sund's two bonds merged into one; three new country records in the arms content | every place on land; every state has land and a capital; no duplicate names; ports on their state's coast; lists that counted eight countries now count eleven (**tests edited, listed**); old saves load |

### 2b. Presidency / Politics (14 stages)

| Release | Stage | After it exists | Main tests |
| --- | --- | --- | --- |
| v0.93.0 | 1 Baseline | audit result, baseline of all tests and warnings, dependency map; no gameplay | the baseline |
| v0.94.0 | 2 Data model | `world.politics`, the two parties (the Order Party, the Liberty League), Vegas and Susan as persistent NPCs, staff, term (120 game days) and election date, migrations, a read-only overview app | persistence; defaults; no RNG on read |
| v0.95.0 | 3 Capital | the Crown Quarter map (gate off Grand Avenue), Halver House, checkpoints, interiors, zones | map validation; paths; guard rules |
| v0.96.0 | 4 People | ten embassies plus the Free Ports Mission, ambassadors, staff, two mansions, party offices | every country has an embassy; no blocked paths |
| v0.97.0 | 5 Government | policies with seven states, the Assembly vote, a budget, the administration AI, a decisions history | state transitions; budget limits |
| v0.98.0 | 6 Opinion | bloc × region model, drivers, polls with margins, the Polls app | bounds; poll persistence |
| v0.99.0 | 7 Elections | calendar, campaigns and funding, results, transitions, election night | both parties win in simulation; reload cannot re-roll |
| v0.100.0 | 8 Influence | relationships, donations, lobbying, the offer screen, ledger and heat, promises | outcomes reachable; charged once |
| v0.101.0 | 9 Economy | policies reach farms, arms, aerospace, shipping, exchange and bonds through bounded hooks; the single deficit and bond | per-system effect tests; no duplicated money; parity with politics "off" |
| v0.102.0 | 10 Diplomacy | relations, disputes, the one writer for wars and embargoes, embassy quests | embargo effects; geo and arms market still behave |
| v0.103.0 | 11 Unrest | demonstrations, police response, your involvement | not every protest a riot |
| v0.104.0 | 12 Your party | party record, tower office, staff, platform; candidacy foundations | name validation; one party |
| v0.105.0 | 13 Emergence | optional quests and ambient events; nothing mandatory | a 200-day run never visiting politics |
| v0.106.0 | 14 Release | balance over many cycles, migrations, regression, docs | full suite; parity |

### 2c. War / Mercenary company

Art and engine sub-releases are placed where they are first needed; **none changes a rule.**

| Release | Stage | After it exists | Main tests |
| --- | --- | --- | --- |
| v0.107.0 | 1 Audit + skeleton | `world.military` with the consistency checker; **the damage gate and the base-protection flag, with tests, first**; a debug view | gate refuses every source before a coup |
| v0.108.0 | 2 Places + construction | Fort Gullcrest (north of Lariat, in the Hald Reach), Hollowmoor Lot (south of the Yards), staged facility blueprints in Mason's Os, permits, cost, repair | map validation; paths; construction persistence |
| v0.109.0 | 3 Company + state | company identity (name, badge, colours), personnel records, inventories, facilities as state; the Military app | persistence; government separate from the company |
| v0.110.0 | 4 Procurement | the transfer screen from Aerospace, the Arms works and shipping; **free, atomic, audited**; the vehicle catalog's *buy / transfer* classes (carriers, recon, artillery, anti-air, logistics, medical) enter here | no duplication; no money entry; reserved items blocked |
| v0.111.0 | 5 Manufacturing | tank and helicopter works (the only things the company builds), lines, queues, shifts, upgrades, maintenance; the **vehicle catalog's works classes** (7 battle tanks, 7 helicopters) | output scales with shifts; nothing else buildable |
| v0.112.0 | 6 Early contracts | security contracts, costs, reputation, consequences; a new company works with only guards; **contracts never require a type, look or loadout** | completes a contract with no heavy kit |
| v0.113.0 | 7 People + squads + armoury | recruitment, roles, training, squads; **ten troop classes with weapon tiers 1–3** (Arms works stock and a new recipe), per-class and per-person loadouts, the **UAV class**, looks eras 1–2 (needs the `helmet` hat style in `drawPeople.js`) | no duplicate assignment; roles need training and kit; a weapon is in one hand |
| v0.114.0 | 8 Living base | facilities in use, routines, capacities, morale, supply, medical, the base running while you are away; **profile and set caps** | capacities constrain; performance bounds |
| v0.115.0 | 9 Generals | hireable generals, assessments, autoresolution, after-action reports | a resolution changes real units; results explainable |
| **v0.115.1** | **9b Look renderer** | **the new overhead look, on the game's own renderer**: the **pixel fire/smoke layer**, the **ten car models**, the **roofed multi-floor building painter and the one-floor view**, the national style data, original-size people; **looks eras 3–4 and the customiser** (player only) | no rule changes; suite unedited |
| v0.116.0 | 10a Tactical engine | battle mode: camera tiers, sprite caches and caps, squad orders, line of sight, cover, suppression, objectives, HUD; **City and Fields-and-villages recipes**, floors, stairs, the height bonus | deterministic by seed; results written once |
| v0.116.1 | 10b Vehicles, air, missiles, artillery | vehicle module damage, helicopters, passes, close air support, bombing, missiles from real stock, **artillery and MLRS fire missions**, **ram and blast breaches**, smoke, fire | consumes real stock; ranges and eligibility |
| v0.116.2 | 10c Maps, medics, UAV | **Trench, Compound and Forest recipes**, biome grades, the other nations' building styles, fog of war from intel, engineers, medics, evacuation, **scout and FPV drones and designation** | every recipe generates a playable map |
| v0.117.0 | 11a Strategic war | provinces on the atlas, the command map with modes, **counters and miniatures**, ordering tools, plans, **fronts and army groups**, the template designer, raising a battalion from real items, supply and hubs, the combat window, AI nations' weekly battles; **atlas places pick the recipe, biome, style and seed** | no double resolution; formations draw from real items |
| v0.117.1 | 11b Air, sea, contracts | air wings, fleets and convoys, landings, intel levels and satellites, international contracts | requirements checked against what you own |
| v0.118.0 | 12a Destruction | building segments, rubble, collapse, saved state, navigation updates, repair contracts | reload keeps state; no stuck units |
| v0.118.1 | 12b Government response + coup | the government military's finite stock, the 4th star (finite real units), the coup state, settlement events | the base cannot be destroyed before a coup and can be after |
| v0.119.0 | 13 Migration + regression | migrations, a large-scale sim, parity with the military "off", old saves | the full suite |
| v0.120.0 | 14 Polish | docs, version records, final report | the full suite |
| after research | future tech | tier 4–5 energy weapons and the future-era vehicles on the research tree | per-item tests |

**Total: 1 + 14 + 15 = 30 releases** (v0.92.0, v0.93.0–v0.106.0, v0.107.0–v0.120.0 with 0.115.1, 0.116.1, 0.116.2, 0.117.1, 0.118.1 as sub-releases).

## 3. Mock-ups and plan documents, by update

All pictures are in `docs/mockups/` (about 270 PNG files); sources are in `docs/mockups/src/` and `docs/mockups/atlas-src/`; `docs/mockups/README.md` lists every file. **They are target art and plans, not the game.**

### Atlas
`proposal-war-atlas-world.png`, `-east`, `-west`, `-south`, `-morrow`, `-sund`, `-biomes`, `-theatres` (the redrawn world, states, places, biomes, theatres). Doc: `WORLD_ATLAS_PROPOSAL.md`. Generator: `atlas-src/` (grid, biomes, provinces, rivers and roads).

### Presidency
`proposal-pol-crown-quarter`, `-embassies`, `-mansions`, `-presidency`, `-oberpad-overview`, `-influence`, `-diplomacy`. Doc: `PROPOSAL_POLITICS.md`.

### War, in the order you asked for it
| Topic | Pictures | Doc |
| --- | --- | --- |
| Base, company, OberPad | `proposal-war-national-base`, `-merc-hq`, `-oberpad-command`, `-oberpad-company`, `-flow` | `PROPOSAL_WAR.md` |
| Strategic war (command map) | `-strategic-map`, `-supply`, `-designer`, `-combat`, `-oob`; **`-hoi-command`, `-hoi-orders`, `-hoi-army`** | `PROPOSAL_WAR_STRATEGIC.md`, `PROPOSAL_WAR_DETAIL.md` |
| Vehicles and helicopters | `-vehicles-1/2/3` | `PROPOSAL_WAR_ARMOURY.md` |
| Troops, eras, loadouts, customiser | `-troop-eras`, `-troop-loadouts-1/2`, `-troop-customizer` | `PROPOSAL_WAR_ARMOURY.md` |
| Overhead battle, **current look** | **`-city-battle`, `-city-battle-clean`, `-city-map`, `-city-far`, `-city-breach`, `-city-states`** | `PROPOSAL_WAR_DETAIL.md` (revision note), `PROPOSAL_WAR_TACTICAL.md` |
| Overhead battle, **withdrawn look** | `proposal-war3d-*` (too large, off the game's style) | kept for the UAV and fire-mission designs only |
| UAV team, artillery missions | `proposal-war3d-uav` (redraw on the current look still to do) | `PROPOSAL_WAR_DETAIL.md` |
| Mission maps, buildings with floors, cars, effects | `proposal-war-mission-maps`, `-map-trench/-compound/-city-ostmark/-village/-forest`, `-buildings-floors`, `-cars`, `-fx-pixel` | `PROPOSAL_WAR_MAPS.md` |
| Older tactical and storyboard pictures | `-battle`, `-closeup-*`, `-destruction`, `-models`, `-triptych`, `-panels` | `PROPOSAL_WAR_TACTICAL.md` |

## 4. Decisions on record

Sund redrawn to the home island (shape approved); government district is a new **Crown Quarter** map; a boy king (11) is ceremonial and a President is elected; missiles from Aerospace (Sentinel, Bastion) and the Arms works (Skylance, Longbow, drones, rockets) by real owner; a term is **120 game days** (election in the last 30); Politics before War; Sund's two bonds merge; 11 countries (Westreach, Sunmouth Compact, Free Harbour of Dunmere promoted), ten embassies plus a Free Ports Mission; rivers and roads in the game's map; party names the Order Party and the Liberty League; Fort Gullcrest and Hollowmoor Lot; no general tax on the player (named levies only); soldiers are saved records with about 40 drawn as NPCs at once; tactical and strategic use the same renderer and one combat function; base protection by one damage gate and one coup flag; the 4th star dispatches finite real units; the company builds only tanks and helicopters; internal transfers free; destruction persists; core base facilities indestructible before a coup; **era-4 armour may be larger; only the player has eras 3–4; contracts never require a type or look; the battle must look like the rest of the game (roofless-style pixel look, original-size people), on a much bigger map; buildings show roof and floors until your force enters, then only its floor**.

## 5. Reconciliations made on 2026-11-01

1. `PROPOSAL_WAR_ARMOURY.md` section 5 placed vehicles and troops at v0.108–v0.110, which collide with Places, Company and Procurement. **Replaced** by the placement above (vehicles at v0.110–v0.111; troop classes, UAV and looks 1–2 at v0.113; looks 3–4 and the customiser at v0.115.1).
2. `PROPOSAL_WAR.md` v0.115.1 described the withdrawn art ("oblique buildings with states"). **Replaced** by the look renderer on the game's own renderer.
3. The detail and map documents each had their own release tables; both now point here.

## 6. Open questions (small; none blocks v0.92.0)

1. Collapse of a destroyed building: a short animation or straight to rubble with dust? (`PROPOSAL_WAR_DETAIL.md`)
2. One UAV class carrying both drone types, or separate scout and FPV teams?
3. Blind artillery fire (about 40% accuracy) allowed, or must guns also have a designated target?
4. With a force on an upper floor, should the ground floor stay visible for the street fight, or show only the player's floor?
5. Trenches destructible per tile, or decals with craters?
6. Which other countries get their own architecture first?
7. Small atlas names and extra states (one data file, `atlas.mjs`); an island for the Marrow Strait port.

## 6b. The Post-War Expansion (planned, not placed)

`POST_WAR_EXPANSION_PLAN.md` (twelve stages PW-1 to PW-12, mock-ups `proposal-postwar-*.png`, prompt `prompt-bank/21-post-war-expansion.md`). **You decided it comes after the War update**; with the batched schedule (section 0) its nine releases are v0.106.0 to v0.114.0. Its Atlas part builds on v0.92.0 as a v0.92.1 city layer.

## 7. Still to do before the war art is final

- Redraw the UAV and fire-mission pictures on the current (game-style) look.
- Redraw the strategic **miniatures** with the original-size people and the new car and vehicle sprites.
- A compound wall piece, more interior room types, and the roof-lift animation (all labelled limits).
- Profile the ground paint time, the sprite caches and the particle cap on a modest machine **before** v0.115.1.
