# Proposal: the Military and Mercenary Company (the War update)

Status: **proposal only. Nothing in the game has changed.** Written after reading the code at v0.91.0.
As you asked, the plan **starts with the world map**: `docs/WORLD_ATLAS_PROPOSAL.md` (countries, states, biomes, cities, military sites, theatres) and the pictures `proposal-war-atlas-*.png`. The strategic war below runs on that atlas.

Answers you have already given. Round 1: Sund runs down to the home island (so the map is redrawn); missiles come from **both** Aerospace (strategic) and the Arms works (battlefield), as free transfers of real stock. Round 2: **Politics is built first, then War**; **three free territories become small countries** (Westreach League, Sunmouth Isthmus Compact, Free Harbour of Dunmere), so the world has **eleven countries**.

## 1. What the code already has (and what is missing)

| Need | Today | Consequence |
| --- | --- | --- |
| Any military | **None.** No soldiers, no tanks, no helicopters. "tank" in the code is a storage tank prop. The only armed forces are the **police** (3 wanted stars, `police.js`) and the Sums of Anarchy gang. | Everything is new: a government military, the player's company, units, a tactical mode. |
| Planes | Aerospace has **5 fighters, 4 bombers**, airliners, private jets and a VTOL (`src/content/aerospace.js`; `military` flag; real aircraft entities in `src/aero/fleet.js` with apron, runway, take-off). **No helicopters.** | Planes are transferred from Aerospace as they are. Bombers and fighters give bombing and close air support. Helicopters are the one new aircraft type, built by the company. |
| Missiles | Aerospace: two strategic missiles (Sentinel 1.7M, Bastion 3.1M each; secure convoy, "never launched from the Park"). Arms works: Skylance (guided, 2,800), Longbow (cruise, 9,500), drones (Hornet, Kestrel), RPG rockets, all as inventory items. | Both transfer free, by real owner. Strategic missiles hit buildings and bases; the Arms works' missiles and drones are the battlefield ones. |
| Guns | Arms works: pistol to assault rifle, sniper, LMG, RPG; weapons are `item_*` with real stats (`src/content/arms.js`); `combat.js` handles person-scale fighting. | Squads draw their weapons from the cages, and the tactical combat model reads the same weapon stats. |
| Ships | Shipping fleet incl. warships and naval missions (v0.23, `logistics.js`, `piracy.js`, `missions.js`). | Ships are acquired through the shipping company, as you said. |
| Construction | Mason's Os (`construction.js`, `properties.js`): plots, three blueprints (home, rental, shopfront), permit, build days, crew goodwill. **No staged facilities, no repair.** | Needs staged facility blueprints with progress, damage and repair, **built on the existing contracts**, not a second construction business. |
| Destruction | **None.** Buildings are footprints with interiors; maps are rebuilt from content (`GameMap`). The v0.88 HQ styling shows the pattern to repaint a map from saved state. | Needs a saved destruction layer, with collision and path recalculation. |
| Politics | Does not exist yet (see `PROPOSAL_POLITICS.md`). Wars and embargoes exist as geo events driven by the arms market. | The coup, the government military and the unrest hooks depend on the politics update. See the order of work. |
| NPCs | 80 characters; schedules, homes, off-screen travel; HQ officers are real NPCs. | **146 soldiers cannot all be NPCs.** See §5. |
| Tablet | OberPad pattern; a Business app already shows a company in one hero, three tiles, a "Do next". | A **Military** group (same pattern). Mock-ups. |
| Money | `game.corp` accounts; transfers between your companies already exist and are logged; free internal transfers of *items* do not (aircraft and arms are separate stores). | A transfer service that moves a real item between stores in one step with no money entry. |
| Saves | Schema 1, each system migrates itself idempotently. | `world.military` with defaults; old saves load untouched. |
| Wanted | 3 stars. Bank robbery gives 3 at once (`severityOf` 12). | The 4th star is new. See §9. |

## 2. One authoritative state

One saved record, `world.military`, and one rule: **every soldier, vehicle, aircraft, missile and building exists once**, in one place, with one status. The base screen, the tablet, a tactical battle and a strategic battle all read and write that record.

```
world.military = {
  v,
  coup: { state: 'none' | 'staged' | 'ended', since, outcome },        // the ONE flag base protection reads
  protection: { baseProtected: true/false, reason, since },           // derived from coup.state by one function
  gov:  { id:'sund', units, inventory, bases, readiness, orders },    // the national military, separate from the company
  company: { identity, finances → game.corp, facilities[], personnel[], squads[], formations[], equipment{ id → item }, production[], contracts[], generals[] },
  transfers: [ { id, day, from, to, item, qty, status } ],            // an audit trail, never money
  war: { theatres, provinces: { stateId → { controller, garrison, supply } }, battles[], orders[], reports[] },
  damage: { structures: { id → 'intact'|'damaged'|'destroyed', since } },
  log: [ ... ]                                                         // capped
}
```

Items are **records with ids**: each tank, helicopter, squad member, aircraft (the Aerospace entity itself, not a copy) and each missile lot has one `location` and one `status` (`stored`, `assigned`, `deployed`, `damaged`, `destroyed`, `captured`). A transfer changes `location` and removes it from the source's free count in the same step; any code that wants to use an item asks "is it free?". A consistency checker (`tests/` and a debug command) looks for duplicates, negative counts, missing references, double assignments and a destroyed item still deployable.

## 3. The pieces, in the order a player meets them

### 3.1 Early game: a security firm
- **Start**: a licence from the Civic Office (paperwork, as ever) and a small lot, **Hollowmoor Lot**. **Ironclad Securities** is already in the world (the 12-storey tower on Precinct Row, which also lets the offices at Vantage Point); it has no staff or business yet and is the natural first rival and subcontractor. You hire a few guards (they are people with records), buy a few pistols and a radio from the Arms works, and take **ordinary contracts**: watch a warehouse, protect a site, escort a cargo, secure an event, patrol, recover stolen goods. Clients are businesses already in the world (the Fish Co-op, Ober's Oil, Mason's Os, Ostmark Turbine Works, ...).
- A **contract** has a client, a place, objectives, a deadline, people and kit needed, costs, a payment, and a persistent status. Many are solved by deterrence or escort, not combat. Failure costs reputation and money.
- You do not need tanks, helicopters or an army to play any of this. The whole company can stay a guard firm.

### 3.2 The headquarters and the construction company
- Mock-up: `proposal-war-merc-hq.png` (three stages on one lot).
- You **buy the lot** through the property system and **commission each facility from Mason's Os** (cost, materials, labour, build days, permit). Facilities have functions, not labels: barracks (beds), mess hall (meals), medical (treats the wounded), armoury (stores weapons), motor pool (maintenance), **tank factory** and **helicopter works** (production), hangars (house transferred aircraft), depot (supplies), range and training ground (training), guard posts and a fence (security).
- Construction progress is visible (scaffolding, then the building). Damaged buildings are **repaired through the same contracts**.
- **Capacity is real**: beds limit people, kitchens limit meals, a clinic limits recovery, the depot limits supplies. A base that is too small loses morale and readiness; it does not magically hold more.

### 3.3 People: records first, bodies where you can see them
- **Soldiers are records** (id, name, role, skills, experience, morale, fatigue, wounds, assignment, history). Officers, generals and squad leaders are always real NPCs; a **bounded number of rank and file (about 40)** are drawn as physical NPCs near you, chosen from the records and following the real schedule (sleep, eat, train, patrol, maintain, rest). The rest follow the same schedule as counts, the way far-off NPCs already do. Walk away and come back: the same people are in the same state.
- **Roles with real effects**: riflemen, squad leaders, machine gunners, medics, combat engineers, anti-tank, anti-air, marksmen, recon, communications, logistics. A role needs its kit and training; a medic keeps the wounded alive, an engineer repairs and clears, a signaller raises how well you see the map. A soldier without the right training cannot perform the role.
- **Squads** have a leader, members, weapons, experience, morale, a name and a badge, a deployment status and a casualty record. Assigning someone removes them from their last place.
- **Identity**: colours, camouflage by environment, helmets, vests, insignia, vehicle and aircraft markings, base signs. A clone-trooper look is available as a **uniform preset using original art**, not any franchise design. Government troops and mercenaries are visibly different (different palette, helmet shape, badge).

### 3.4 Equipment and the transfer screen
- Mock-up: `proposal-war-oberpad-company.png` (Transfers).
- **Tanks and helicopters**: made at the company's own works. **Planes** and **strategic missiles**: transferred from Aerospace. **Guns, ammunition, drones and battlefield missiles**: transferred from the Arms works. **Ships**: through the shipping company. **Uniforms, medicine, spares**: bought from suppliers (a small procurement list).
- A transfer moves **real stock**, is **free**, creates **no money entry** and **no intercompany revenue**, and is atomic. Returns are allowed for anything unassigned. Items in use, reserved or destroyed cannot move.
- The company **cannot** build planes, missiles, guns or ships. The production screen does not list them. A test looks for it.

### 3.5 Production
- Mock-up: `proposal-war-oberpad-company.png` (Production).
- Orders go into **lines**; each line has a capacity, shifts, crew and inputs. More shifts or lines really produce more units per day; an order that lacks parts or crew **stops and says why**. Progress, queues and blocked orders are saved. Tank and helicopter models are a short ladder (light and main battle tank; scout, transport and attack helicopter) that is calibrated against the Aerospace price ladder, not invented.

### 3.6 Generals and delegated command
- Mock-up: `proposal-war-oberpad-command.png`.
- Generals are persistent NPCs with real differences (offence, defence, logistics, air coordination, intelligence, risk, casualty aversion, terrain). You assign one to an eligible engagement; before you commit you see an **estimate** (not a promise) and the cost. The result is resolved from the actual forces, supplies and terrain with a seeded uncertainty term, then written to the shared state with an **after-action report**.
- Once an engagement is **assigned or played**, it is closed to the other way (a single state field: `open → delegated|tactical → resolved`).

### 3.7 Tactical battles (the overhead command view)
- Mock-up: `proposal-war-tactical.png`.
- **A mode of the same renderer**, with a higher camera and squad-level units, not a second game. The battle map is **generated from the engagement's place and biome** (urban, industrial, port, airfield, rural, forest, desert, military site) with real buildings, cover, roads and water, so it matches the atlas and is never a flat arena.
- You deploy in a **zone**, give **squad orders** (move, hold, attack, defend, advance, withdraw, flank, suppress, regroup, escort, recon), call **air support** and **missile strikes** from real stock, and extract. There is a fog of war: you see what your units and recon see, and the planning screen shows **estimates**, not the truth.
- The combat model is **one deterministic function** (weapon range, line of sight, cover, suppression, morale, armour, ammo, crew), seeded by the engagement id. The same model, run at aggregate, resolves the engagements you do not play. This is how the tactical and the background result stay consistent (§3.8).
- A finished battle writes its result once (`resolved`), and the strategic layer will not resolve it again.

### 3.8 The strategic war
- Mock-up: `proposal-war-strategic.png`.
- The map is the atlas: **states are provinces**, grouped into **seven theatres** (the Halden Front, the Northern Sea, the Kestrel Theatre, the Rift, the Grey Ocean, the Oil Belt, the Free Marches). Each province has a controller, a garrison, supply and a road/sea link. Armies are **formations** made of real squads, vehicles and aircraft; orders (move, defend, advance, hold, recon, resupply, withdraw, reinforce) take time and use supply.
- **Where wars come from**: the geopolitics already records wars as events (`geo.js`). The politics update makes diplomacy the writer of those events. The war update adds **battles inside them**: AI nations fight on border provinces with force pools drawn from their budget and income, weekly and coarsely, so the map changes over time. The player is never required to take part, and AI wars do not always end the same way. Province control feeds back into geo (severity) and the arms market (demand).
- **International contracts** (Part XII of your list) come from embassies and clients: defend a port, escort a convoy, hold a crossing, support an offensive. Their requirements are checked against what you actually own. **Nothing is spawned to satisfy a contract.**

### 3.9 The government military and the 4th star
- A separate organisation: **Fort Gullcrest** (`proposal-war-national-base.png`), its soldiers, armour, aircraft and stores, with its own readiness and orders. It trains, eats, patrols and guards like your company (the same schedule rules), and **its stock is finite and funded by the defence budget** (so politics decides how strong it is).
- **A 4th wanted star**: reached when a 3-star pursuit continues and you do one of: kill officers repeatedly, attack a government building, or stage a coup. It dispatches **real units from the base**, in the order the command decides (patrols, then road blocks, then armour), not an infinite supply.
- It does **not** make your base destructible (§4).

### 3.10 Destruction
- Buildings and other structures have a saved state (`intact`, `damaged`, `destroyed`). Destroyed buildings stop blocking or covering, collision and the pathfinding grid are recomputed, and the map is repainted from state (the v0.88 pattern). Roads and bridges can be damaged where the engagement says so. Reloading restores the same state.
- Repair and rebuild are contracts with the same construction company.

## 4. Base protection, the invariant

You asked for one rule that cannot be bypassed. Design:

- **One function**, `baseProtected(game)`, reads **one flag** (`world.military.coup.state === 'none'`). It lives in `src/war/protection.js` and is the only place that answers the question.
- **One damage gate**: every way a structure can be damaged (open-world gunfire, explosions, vehicle hits, missiles, bombing, artillery, tactical result application, strategic result application, scripted events, environmental damage, a debug command) goes through `damage.apply(structure, amount, source)`. The gate refuses a core facility of your base when `baseProtected` is true. **No other code may change a structure's state.** A source scan in the tests fails the build if anything else writes it.
- **Tests** run every source against your base before a coup (must not change) and after one is staged (must be able to).
- **Staging a coup** sets `coup.state = 'staged'`, which makes the base vulnerable by that one flag. It does not damage anything. **Ending** it sets `coup.state = 'ended'` and **does not restore protection by itself and does not undo damage**; protection is only restored by an explicit settlement event (you win and become the government, or you surrender and are granted terms), and destroyed buildings stay destroyed until rebuilt.
- Equipment and people **away from the base** are never protected.
- Because this is the hardest rule, **the gate and the flag are built in the first war release**, before there is anything to destroy.

## 5. Performance and the NPC problem
- Soldiers, squads and formations are **records**; only the ones near you are drawn as NPCs (a cap, about 40). Production and supply tick hourly or daily, not per frame. Strategic battles resolve weekly. The tactical battle is a short, isolated sim with its own cap (e.g., about 200 units on screen).
- A **profiling stage** (in the base-life release) measures 150, 400 and 800 personnel and sets the caps from data.

## 6. Balance (method, not numbers)
Everything is a content figure in one file, calibrated by measurement: tank and helicopter prices against the Aerospace ladder (fighters 210k to 2.6M obols), wages against the shift and contract tables in `income.js`, contract payments against what a guard shift earns and what a business earns, upkeep so that a 12-person firm profits and a 150-person company needs real contracts. Losses are permanent; replacements cost; there is no free regeneration.

## 7. The OberPad
A **Military** group in the standard pattern: Company (hero, readiness, Do next), Squads, Base, Production, Transfers, Generals, Contracts, War, Reports. Mock-ups: `proposal-war-oberpad-company.png` (company, transfers, production) and `-command.png` (generals, contracts, an after-action report). The tablet is administration; the base, the battlefield and the strategic map are where you act.

## 8. Release plan (stage by stage; each is tested, pushed and playable)

v0.92.0 is the shared World Atlas (see the politics plan). The war update's 14 stages then become releases, **with the protection gate moved to the front** because it is the hardest rule.

| Release | Stage | What exists after it | Main new tests |
| --- | --- | --- | --- |
| **v0.92.0** | Atlas (shared) | The redrawn world, 76 states and regions, 130 places, biomes, theatres as data; an Atlas page. | atlas validation; places on land; old saves load |
| v0.107.0 | 1 Audit + skeleton | `world.military` with the consistency checker, **the damage gate and the base-protection flag with their tests**, a debug view. Nothing visible to play yet. | gate refuses every source before a coup; checker finds each kind of corruption |
| v0.108.0 | 2 Places + construction | Fort Gullcrest (shell, gate, guards on patrol), Hollowmoor Lot, the staged facility blueprints in Mason's Os with progress, permits, cost, and repair. | map validation; paths; construction persistence |
| v0.109.0 | 3 Company + state | Company identity (name, badge, colours), personnel records, inventories, facilities as state; the Military app. | persistence; government separate from the company |
| v0.110.0 | 4 Procurement | The transfer screen from Aerospace, the Arms works and shipping; free, atomic, audited. | no duplication; no money entry; reserved items blocked |
| v0.111.0 | 5 Manufacturing | Tank and helicopter works, lines, queues, shifts, blocked orders, upgrades, maintenance. | output scales with shifts; nothing else is buildable |
| v0.112.0 | 6 Early contracts | Security contracts, costs, reputation, consequences; the firm works with only guards. | a new company completes a contract with no heavy kit |
| v0.113.0 | 7 People and squads | Recruitment, roles, training, squads, equipment, appearance, assignments. | no duplicate assignment; roles need training and kit |
| v0.114.0 | 8 Living base | Facilities in use, routines, capacities, morale, supply, medical, the base running while you are away; **profile and set caps**. | capacities constrain; performance bounds |
| v0.115.0 | 9 Generals | Hireable generals with differences, assessments, autoresolution, after-action reports. | a resolution changes real units; results are explainable |
| v0.116.0 | 10a Tactical engine | The battle mode, deployment, orders, fog, combat model, objectives, extraction. | deterministic by seed; results written once |
| v0.116.1 | 10b Air and missiles | Close air support, bombing runs, missile strikes from real stock. | consumes real stock; ranges and eligibility |
| v0.117.0 | 11a Strategic war | Provinces, formations, orders, supply, AI nations' weekly battles, province control feeding geo. | no double resolution; formations draw from real items |
| v0.117.1 | 11b International contracts | Embassy and client contracts at war scale. | requirements checked against what you own |
| v0.118.0 | 12a Destruction | Persistent structure state, collision and path updates, repair. | reload keeps state; no stuck units |
| v0.118.1 | 12b Government response + coup | The government military's finite stock, the 4th star, the coup state and its consequences, settlement events. | the base cannot be destroyed before a coup and can be after |
| v0.119.0 | 13 Migration + regression | Migrations, a large-scale sim, parity with the military "off", old saves. | the full suite |
| v0.120.0 | 14 Polish | Docs, version records, final report. | the full suite |

Order against politics: **the Presidency update comes first** (v0.93 to v0.106), because the government military, the budget, the unrest hooks and the coup need it. If you want war earlier, releases v0.107 to v0.117 do not need politics and could go first; the government military, the 4th star and the coup would wait.

## 9. The 4th star and the coup, in plain terms
- The 4th star is "the state is after you": real soldiers leave Fort Gullcrest and come. You can hide, bribe nothing, run, fight, or surrender (you are arrested; your company is not seized).
- A coup is an **optional act**. It needs a credible force, a supplied company, control of what matters, and a government with an exposed flank (politics' stability and legitimacy hooks). It is resolved by the **same strategic and tactical rules**, not a dice roll, and has persistent consequences (who governs, what is damaged, what other countries do).

## 10. What I will not do
- No second inventory for anything. No unit exists in two places.
- No free regeneration of forces; no spawning kit to satisfy a contract.
- No factory for planes, missiles, guns or ships in your company.
- No path that bypasses the damage gate, and no hidden restoration of protection.
- No claim that something works when it is only a screen.

## 11. Decisions I will take unless you say otherwise
1. **The politics update goes first** (settled).
2. **Sites**: the national base *Fort Gullcrest* on the Hald Reach north of Lariat; your lot *Hollowmoor Lot* south of the Yards. Both are their own region maps entered through a gate. (You may prefer other places.)
3. **The free territories that stay free** (30 of the 76 regions) hold small contracts and the mercenary frontier; the three promoted countries are small and can be sides in wars and clients for contracts.
4. **Soldiers are records; about 40 are drawn at once.**
5. **Tactical battles use the same renderer with a higher camera.**
6. **After a coup ends, protection is only restored by an explicit settlement; damage stays.**
7. **The 4th star dispatches finite real units; the base is never made vulnerable by it.**

## Mock-ups
`proposal-war-atlas-world.png`, `-biomes.png`, `-theatres.png`, `-sund.png`, `-east.png`, `-south.png`, `-west.png`, `-morrow.png`; `proposal-war-merc-hq.png`, `proposal-war-national-base.png`, `proposal-war-tactical.png`, `proposal-war-strategic.png`; `proposal-war-oberpad-company.png`, `proposal-war-oberpad-command.png`.
