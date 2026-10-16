# The World Simulation Rules (v0.32.0–v0.36.0)

Every persistent character in the Oberverse belongs to the world simulation. These rules apply to all current and **future** content; `npm run check` enforces them.

## 1. Every persistent character has a life configuration
In `src/content/life.js`:
- **`LIFE[id]`** — `home: 'residence/unit'` and `occupation`.
- **`OCCUPATIONS`** — reusable profiles: `transport` (walk / transit / drive / patrol), `interrupt` (resume), `persist` (persistent). A new job is a new entry here, not new engine code.
- **`RESIDENCES`** — real places: each unit names its map (an interior, or an outdoor map for a camp), its beds (spots), its capacity, and whether unrelated people may share it. Types: house, farmhouse, flat, apartment, rooming_house, dormitory, estate, staff_quarters, quarters (living where they work), houseboat, camp.
- **`LIFE_EXCEPTIONS[id]`** — only for characters who genuinely don't have a home (an inmate, livestock), with a reason. Ordinary residents never go here.
- The character's **schedule** (in its profile) must have a sleep block on one of its home's beds.

**No beds at work (v0.36.0).** A bed or cot may only be in a home (a residence unit), the player's flat, the jail, the Lodging House or a property the player builds; nobody works in someone's home (estates and farms excepted). New homes are generated in `src/content/homes.js` (`HOMES`: a building, and a flat per household); every private home's locked doors carry `lock.home` (its residents) and its map `def.home` — invitations and break-ins work on them automatically (`src/systems/homes.js`).

The checker rejects: no home and no exception; a home or bed that doesn't exist; sleeping outside the home; more residents than places; a private unit shared by two households; an unknown occupation.

## 2. Schedules, interruptions and the two tiers
Schedules are data (`profile.schedule`: time blocks with an activity and a spot, or a `patrol`). The NPC brain (`src/sim/npcBrain.js`) picks the block (or an impulse) and commits; `src/sim/npcSystem.js` walks them physically on the player's map and moves them by timed abstract travel elsewhere — same decisions, same clock. Interruptions are *held intents* (police dispatch, deals, gang hunts, staff, the dairy) and conversations; they pause the routine and it resumes from where it was.

## 3. Police beats
`PATROLS` in `src/content/life.js`: a beat is a loop of waypoints — rough `[x, y]` tiles on one map (snapped to the pavement at load by `src/world/patrols.js`, becoming spots `patrol_<beat>_<i>`) or existing `map:spot` refs (a beat may cross maps). A schedule block `{ activity: 'patrol', patrol: 'beat_id' }` sends the officer round it: walk to a waypoint, stop `dwell` minutes, walk on, until the block ends. The place on the beat is saved. Dispatch (`src/systems/police.js`) takes priority and the beat resumes afterwards. The checker walks every beat end to end.

**Incidents (v0.35.0).** Every witness call is an incident in `world.police.incidents` (saved): `reported` → `responding` (the nearest free officers are dispatched — a held intent carrying the incident id) → `investigating` (on arrival the officer looks round for 20 minutes and questions the witnesses still at the scene; a witness tells only what they actually saw, and the officer learns it; if they name you and you're in plain sight, Wanted and pursuit) → `closed` (once no officer is still attending, with an outcome: a suspect named / nothing more to go on / never reached the scene). The officers' routines resume where they left off. Open incidents show on the world map (🚨). The police never know where you are unless an officer sees you or a witness reports you.

Beats: `beat_civic`, `beat_eastend`, `beat_park`, `beat_sumps`, `beat_docks` (Halvermouth), `beat_lanternside`, `beat_westbrook`, `beat_oilfields`. A patrol cruiser drives the city as a traffic loop (`police_cruiser` in `src/content/transit.js`).

## 4. Buses
Lines live in `src/content/transit.js` (`BUS_INFO` is the No. 1, `LINE_2` the No. 2; `buildTransit` returns `lines`). A line: `id`, `name`, `ends` (for "towards …"), `fare`, `buses`, `speed`, `dwell`, `hours` (or null), a closed `route` of lane points, and `stops` (a sign on a map; a `wait_<stop>` spot beside it is made at load). The transit system (`src/systems/transit.js`) runs every line's buses in world space, stopping at each stop (in both directions where the loop passes twice), only within hours.

**Riding:** the player boards a bus standing at a stop (E), pays the line's fare and gets off at any stop. **NPCs:** a character with `transport: 'transit'` (occupation, or a per-character override in `LIFE`) going to another region plans a trip in `src/sim/npcTransit.js` — `npc.trip` (`to_stop` → `waiting` → `riding` → `to_dest`) and `npc.riding` — boarding only a bus going the quicker way, giving up after two hours. Saved with the NPC.

## 5. Errands and meet-ups (v0.35.0)
A schedule block may carry `errand: '<kind>'` (and `errandChance`, default 0.5): on that share of days the character goes to another place of that kind instead of the block's usual spot — chosen from `ERRANDS` in `src/content/life.js`, only in the same region as the usual spot, and only places open (`hours`) when the block starts. `meet: 'npc_x'` on two friends' blocks (same kind, same chance, overlapping times) makes it a standing arrangement: they share a seed, so on a meet day both go to the same place (the label says who with). Resolution (`src/sim/errands.js`) is a hash of who, which block and which day — re-deciding, watching or not, saving and loading never change it. Kinds: `outing` (tea, the pier, the parks — the coast and the city), `lariat_evening` (the diner, the square, Main Street). In use: Quinn, Barnaby, Agnes, Delphine, Opal; Rosa meets Lorna, Dale meets Wes. The checker requires real spots and labels, known kinds and two-sided, overlapping meet-ups.

## 6. Simulation scales and persistence
- **On the player's map:** NPCs walk paths with collision; buses and traffic drive with real physics-lite movement, stop for obstacles and at stops.
- **Elsewhere:** the same decisions on the same clock, carried out by timed abstract travel (`updateAbstract`); buses keep moving along their routes (they never reset); passengers move with their bus.
- **Saved:** each NPC's intent, trip, seat on a bus, place on a patrol beat; each bus's line and position; police state with incidents; vehicles. Static definitions (schedules, routes, residences, errands) stay in content. Migrations are idempotent: older saves gain the No. 2's buses, the signature cars, and an empty incident log.
- **Clock:** everything runs off the world clock (minute ticks for decisions, transit hand-offs and police); nothing advances while the game is paused.

## 7. Adding content
- **A character:** profile + dialogue as before, *and* a `LIFE` entry (home + occupation) and a sleep block in that home. If there's no room, add a residence or unit — never leave them homeless.
- **A building people live in:** a `RESIDENCES` entry with units and beds (spots on its interior).
- **An apartment block:** a hall interior with a door per flat, one interior per flat (see the Plumb Line in `src/content/maps/westbrook.js`), one unit each.
- **A job:** an `OCCUPATIONS` entry; schedules use it.
- **A police beat or officer:** a `PATROLS` entry; schedule blocks with `patrol`.
- **Free time with variety:** give a leisure block an `errand` kind (add places to `ERRANDS` for a new town); give two friends matching `meet` blocks.
- **A bus line:** an entry in `lines` with its route (lane points, closed) and stops; the checker requires real maps, a place to wait at each stop, valid hours. Characters who should ride it get `transport: 'transit'`.

## 8. Not yet simulated
- **Driving.** `transport: 'drive'` (executives, dealers, farmers) is declared but those characters currently walk; NPCs don't drive the cars they own (the signature cars stay parked). Driving needs a road-routing layer for NPC drivers across map seams and gates — the next step for this system.
- **The patrol cruiser** is a traffic loop with no named officer in it.
- **Transfers** between bus lines: a trip uses one line.
