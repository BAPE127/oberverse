# Proposal: the detailed overhead battle, the UAV team, and a command map in the manner of a grand-strategy game

Status: **proposal; nothing in the game has changed.** Every picture is **target art** painted by new mock-only modules in `docs/mockups/src/war/` (`d_*.js`, `hoi.js`); none of it is in `src/`. Numbers are starting figures to calibrate. All designs are original.

> **Revision (owner feedback):** the soldiers were too big and the buildings did not look like the rest of the game. **The first pictures in this document (`proposal-war3d-*`) are withdrawn as the direction for the overhead battle's look.** The overhead battle now uses **the game's own renderer**: the real ground painter, the real roofless buildings with their furnished interiors and tower lobbies, the real prop sprites, and the original-size people (only the helmet style is new). The map is **200 x 130 tiles** (four times the old battle map, a little bigger than Lariat), a dense city of 15 blocks, built like Halvermouth: avenues and streets with pavements, shop rows, towers, a civic plaza, a park, a car park, an industrial yard, a housing district, a building site, a river and bridge, fields and two depots. Damage (breach, burning, collapse) is drawn on the roofless building's own pieces. New pictures: `proposal-war-city-battle.png`, `-battle-clean.png`, `-map.png`, `-far.png`, `-breach.png`, `-states.png`. Source: `docs/mockups/src/war/g_*.js` and `g*.html`. The UAV and command-map pictures remain valid as designs; their battle art will be redrawn the same way. The only things that are new art are tanks, helicopters, drones, damage and effects, drawn in the same pixel idiom at the same scale (effects are drawn at half resolution and enlarged so they share the chunky pixels).

Decisions from the owner this round: era-4 armour may be larger than era-1 troops (no footprint rule); **only the player fields eras 3 and 4**; **contracts never require a type, a look or a loadout.**

Pictures (`docs/mockups/`):

| File | What it shows |
| --- | --- |
| `proposal-war3d-battle.png`, `-battle-clean.png` | the Crossing at Halden Roads at the new level of detail, with and without the screen |
| `proposal-war3d-breach.png` | the same wall opened two ways: rammed by a dozer, and blown by an engineer's charge (six moments) |
| `proposal-war3d-states.png` | one house in six states: intact, damaged, shell hit, burning, collapsed, garrisoned (roof cut away) |
| `proposal-war3d-models.png` | model sheet: ten infantry roles in three facings, five poses, vehicles, aircraft and drones, effects |
| `proposal-war3d-uav.png` | the UAV team: scout drone, fog of war, FPV window, designation, MLRS and cannon fire missions, the strike menu |
| `proposal-war-hoi-command.png` | the command map: control stripes, front line, division counters, plan arrows, combat markers, supply, air and sea |
| `proposal-war-hoi-orders.png` | giving orders: box select, queued paths, attack odds, plan arrow, front assignment, the combat window |
| `proposal-war-hoi-army.png` | army groups and fronts: assign once, the army keeps the line |

## 1. What "more detailed" means here (honest numbers)

"One hundred times" cannot be literal. What the pictures show, measured against today's overhead art (the game's tile is 32 px and a person is about 24 px tall):

| | Today | Target art | Change |
| --- | --- | --- | --- |
| Soldier | about 24 px tall, 3 colours per part | about 66 px tall, 3-tone shading per part, outline, webbing, pouches, helmet straps, face, gear per role | about 2.75× tall, about 7.5× the pixels, many more parts |
| Tank | about 60 px | about 190 px with a separate turret, tracks with links, fenders with stowage, camouflage, hatches | about 3× long, about 10× the pixels |
| Ground | flat tile painter | a height field lit from the north-west, posterised bands, cast shadows from hills, cliffs, grass tufts, stones, river banks | a new painter |
| Building | flat roof square | oblique projection: south and east walls visible, windows with glint, doors, roof tiles, chimneys, shadows, 6 states | a new painter |
| Effects | a few sprites | layered fire, smoke columns, fireballs, debris with motion streaks, shock rings, craters, tracers | a new painter |

So: roughly 7 to 10 times the pixels per sprite and many times the kinds of detail, not 100 times. It is more detail where the eye looks (units, buildings, fire), not more everywhere.

## 2. The look: 3D feel inside a 2D game

- **One oblique projection for everything tall.** A point at height *h* is drawn *h* × (−0.3, −0.86) from its base, so walls become real faces and roofs sit up and to the left. The map stays a flat grid for movement and cover.
- **One sun, north-west.** Roofs and the north side of trunks are lit, south and east faces are darker, shadows fall south-east, and the terrain is lit by its own slope. Every picture follows this.
- **Height cues:** cast shadows (vehicles, buildings, trees, flying things far off the craft), extruded side walls on vehicles, turrets lifted above hulls, rotor blur, smoke that leans downwind and rises.
- **Camera tiers stay** (far banners, command, close). At the far tier the same units become banners; at close they are these sprites.

## 3. Building the detail without a cost spiral

- **Ground** is painted once per battle from the province's relief and biome (the same functions the atlas uses) into one canvas; measured about a second in headless Chrome for 2880 × 1620 (to be profiled in the game). Larger maps paint in chunks.
- **Buildings** are painted once per state into a cached canvas; a state change repaints that one building. Roofs lift away (cutaway) when selected or garrisoned.
- **Soldiers** are cached per (role, faction, look, pose, facing); a battle shows about 40 at a time, so the cache is small (a few hundred sprites). Left is the mirrored right.
- **Vehicles** cache a hull and a turret per heading step; the budget is an LRU cache (about 64 MB) with 12 heading steps at the far tier and 24 at close. Turrets turn on their own.
- **Effects** are particle lists ticked once per frame; they cost per live particle, with a cap (about 600) and automatic thinning.
- **The existing people, aircraft and ground painters stay** for the world outside battles; the detail modules only draw battles and the strategic miniatures.

## 4. Opening a building: ram or blow it

The wall is a row of **segments** (`PROPOSAL_WAR_TACTICAL.md`); each has a state: 0 intact, 1 damaged, 2 breached, 3 rubble. A breach is written **once** and stays.

| | Ram | Blast |
| --- | --- | --- |
| Who | a **breacher dozer tank** (own works) or a heavy tank at lower effect | **combat engineers** with a breaching charge (an Arms works stock item, one per use) |
| Effect | the first push damages the segment, the second opens a vehicle-wide breach | one detonation opens a smaller breach at once |
| Time and risk | slow; the vehicle is exposed and its crew takes shock; the blade wears (repair cost) | the engineers need a few seconds at the wall; bricks and splinters hurt anyone close; the noise reveals the squad |
| After | rubble at the foot (light cover); cover and sight lost along the breach; paths open for everyone | same, plus fire inside if the room is flammable (a hazard for the garrison) |
| Costs | repair of the blade; none in stock | one charge from stock |

A shell, a rocket or an air strike can also breach (see `proposal-war3d-states.png`). All of these use the one damage gate for the national base: **its core facilities cannot be breached before a coup**, whatever the weapon.

## 5. The UAV team (new class)

A tenth troop class, **UAV operator**: a team of two operators and a signaller.

- **Scout drone** (reusable): battery about 3 minutes, flies where you point, reveals a radius of about 12 tiles; every unit it sees becomes **spotted** for about 2 minutes after it last saw it. It can be shot down by marksmen and anti-air, and jammed by an enemy signaller. Recharge at a vehicle or the base.
- **FPV strike drone** (one-way, consumed): you fly it in the FPV window and dive into a target; it kills a light vehicle or a squad. It is a real item from the Arms works.
- **Designate:** a spotted target can be marked. **Air strikes (Aerospace aircraft), missiles (Longbow, Sentinel, Bastion) and MLRS area fire need a designated target.** Guns (mortars, mobile cannon) can fire blind at about 40% of the accuracy.
- **Relay:** extends the radio range of a squad that is out of contact.
- Weapon tiers 1 to 5 in `arsenal.js`: hand controller, long-link set, sensor pack, drone controller, command uplink.
- **Strategic use:** the same drones raise **intel** of a province when sent on a recon order, which feeds the strategic estimates and the combat window (`?` markers shrink).

### Artillery vehicles and fire missions

The artillery class already has five types: **Thump** mortar carrier, **Hammer** mobile cannon, **Siege** howitzer, **Rainmaker** MLRS and **Longbow** launcher (the last two from the Arms works). What is new is how they are used:

1. **Call:** pick a designated target and a weapon; the menu shows the cost in stock, the time of flight and the accuracy.
2. **Fire:** a Rainmaker salvo is 12 rockets over an area of about 60 px; a Hammer fires up to 6 shells. They consume the Arms works' ammunition (real stock) and leave smoke and dust; **counter-battery fire** can find a battery that has fired.
3. **Impact:** area effect, craters, fire, damage to structures (wall segments and roofs change state), and casualties; the accuracy came from the drone.

## 6. The command map in the manner of a grand-strategy game

What the screens add to `PROPOSAL_WAR_STRATEGIC.md`:

- **Map reading:** provinces tinted by controller, **occupied ground striped** in the occupier's colour, province, state and country borders in three weights, a red **front line**, rivers, rails, ports, airfields, supply hubs with convoys, air zones and fleets. An event ticker lists what changed.
- **Two zoom levels:** far = **counters** (flag, symbol for infantry, armour, mechanised, artillery, recon, engineers, HQ, air, helicopter, naval; strength bar on the right, organisation bar below, stack count, a status badge). Near = **miniatures on a base** with a banner, drawn from the same figures as the battle.
- **Ordering with the mouse:** click, double-click (all of a type on screen), box select, Ctrl to add; right-click orders; **right-drag draws a path through waypoints**; Shift queues; a tooltip shows ETA, supply, terrain and **odds** before you commit.
- **Order types:** move, attack, defend (dig in), hold, withdraw, reinforce, resupply, recon, prepare assault, garrison, air mission, naval/landing.
- **Plans:** draw an arrow for a group; it needs **planning time**; once ready it gives a **planning bonus** (about +12% to +20%) that decays after about 3 days; execute now or hold until supply is full.
- **Fronts:** give an army a front, a stance (hold, elastic, advance) and an **aggression** slider; it fills the slots, rotates tired units, reinforces battles, digs in and counter-attacks a breakthrough with a named reserve. A front never invents troops: an empty slot is shown in red.
- **The combat window:** attackers and defenders, front line slots and combat width, reserve, modifiers (terrain, river, weather, planning, air, supply, entrenchment, width), a graph of organisation by day, a log, and three buttons: **Play this battle** (the overhead battle), **Delegate to the general**, **Withdraw**.
- **Different from the genre on purpose:** a division is real people and real items (no divisions from nothing); the result of a battle you play is written once; and the OberPad stays for administration while the map is where you command.

## 7. Release placement

**Superseded by `ROADMAP.md`**; the table below is kept for context.

| Release | Adds |
| --- | --- |
| v0.115.1 (9b) | the **detail renderer** only (terrain, buildings with states, soldiers, vehicles, effects), no new rules; replaces the placeholder art in the tactical plan |
| v0.116.0 (10a) | the tactical engine on the new renderer (unchanged scope) |
| v0.116.1 (10b) | vehicles, air, missiles, **artillery fire missions**, ram and blast breaches |
| v0.116.2 (10c) | maps, medics, engineers and the **UAV team** with scout and FPV drones, fog of war and designation |
| v0.117.0 (11a) | provinces, **counters and miniatures**, ordering tools, plans, **fronts**, the combat window |
| v0.117.1 (11b) | air, sea, landings, intel levels (UAV recon feeds them), contracts |

## 8. What is real and what is not

- **Mock-only:** all `d_*.js` painters, `hoi.js`, the HUDs and the layouts. They use Canvas 2D and no game state.
- **Reusable in the game:** the idioms (outline, lit left, shaded right), the cache keys, the data models (class, tier, look, loadout), the wall-state model.
- **Not drawn:** the collapse animation of a building (the moment between breached and rubble), per-pixel dynamic lighting, wind-driven smoke, snow, rain and night. Those are reach goals.
- **Needs profiling:** the terrain paint time, the vehicle cache size and the particle cap on a modest machine.

## 9. Questions for the owner

1. Should a **destroyed building** keep a collapsing animation (about 1 second, adds work) or go straight to rubble with a dust cloud?
2. Should the **UAV team** be one class that carries both drone types, or two (a scout team and an FPV team)?
3. Should **blind artillery fire** (no designation) exist at all, or should guns also need a designated target?
