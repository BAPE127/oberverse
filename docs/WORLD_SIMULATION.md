# The World Simulation Rules (v0.32.0–v0.33.0)

Every persistent character in the Oberverse belongs to the world simulation. These rules apply to all current and **future** content; `npm run check` enforces them.

## 1. Every persistent character has a life configuration
In `src/content/life.js`:
- **`LIFE[id]`** — `home: 'residence/unit'` and `occupation`.
- **`OCCUPATIONS`** — reusable profiles: `transport` (walk / transit / drive / patrol), `interrupt` (resume), `persist` (persistent). A new job is a new entry here, not new engine code.
- **`RESIDENCES`** — real places: each unit names its map (an interior, or an outdoor map for a camp), its beds (spots), its capacity, and whether unrelated people may share it. Types: house, farmhouse, flat, apartment, rooming_house, dormitory, estate, staff_quarters, quarters (living where they work), houseboat, camp.
- **`LIFE_EXCEPTIONS[id]`** — only for characters who genuinely don't have a home (an inmate, livestock), with a reason. Ordinary residents never go here.
- The character's **schedule** (in its profile) must have a sleep block on one of its home's beds.

The checker rejects: no home and no exception; a home or bed that doesn't exist; sleeping outside the home; more residents than places; a private unit shared by two households; an unknown occupation.

## 2. Schedules, interruptions and the two tiers
Schedules are data (`profile.schedule`: time blocks with an activity and a spot, or a `patrol`). The NPC brain (`src/sim/npcBrain.js`) picks the block (or an impulse) and commits; `src/sim/npcSystem.js` walks them physically on the player's map and moves them by timed abstract travel elsewhere — same decisions, same clock. Interruptions are *held intents* (police dispatch, deals, gang hunts, staff, the dairy) and conversations; they pause the routine and it resumes from where it was.

## 3. Police beats
`PATROLS` in `src/content/life.js`: a beat is a loop of waypoints — rough `[x, y]` tiles on one map (snapped to the pavement at load by `src/world/patrols.js`, becoming spots `patrol_<beat>_<i>`) or existing `map:spot` refs (a beat may cross maps). A schedule block `{ activity: 'patrol', patrol: 'beat_id' }` sends the officer round it: walk to a waypoint, stop `dwell` minutes, walk on, until the block ends. The place on the beat is saved. Dispatch (`src/systems/police.js`) takes priority and the beat resumes afterwards. The checker walks every beat end to end.

Beats: `beat_civic`, `beat_eastend`, `beat_park`, `beat_sumps`, `beat_docks` (Halvermouth), `beat_lanternside`, `beat_westbrook`, `beat_oilfields`. A patrol cruiser drives the city as a traffic loop (`police_cruiser` in `src/content/transit.js`).

## 4. Buses
Lines live in `src/content/transit.js` (`BUS_INFO` is the No. 1, `LINE_2` the No. 2; `buildTransit` returns `lines`). A line: `id`, `name`, `ends` (for "towards …"), `fare`, `buses`, `speed`, `dwell`, `hours` (or null), a closed `route` of lane points, and `stops` (a sign on a map; a `wait_<stop>` spot beside it is made at load). The transit system (`src/systems/transit.js`) runs every line's buses in world space, stopping at each stop (in both directions where the loop passes twice), only within hours.

**Riding:** the player boards a bus standing at a stop (E), pays the line's fare and gets off at any stop. **NPCs:** a character with `transport: 'transit'` (occupation, or a per-character override in `LIFE`) going to another region plans a trip in `src/sim/npcTransit.js` — `npc.trip` (`to_stop` → `waiting` → `riding` → `to_dest`) and `npc.riding` — boarding only a bus going the quicker way, giving up after two hours. Saved with the NPC.

## 4. Adding content
- **A character:** profile + dialogue as before, *and* a `LIFE` entry (home + occupation) and a sleep block in that home. If there's no room, add a residence or unit — never leave them homeless.
- **A building people live in:** a `RESIDENCES` entry with units and beds (spots on its interior).
- **An apartment block:** a hall interior with a door per flat, one interior per flat (see the Plumb Line in `src/content/maps/westbrook.js`), one unit each.
- **A job:** an `OCCUPATIONS` entry; schedules use it.
- **A police beat or officer:** a `PATROLS` entry; schedule blocks with `patrol`.
- **A bus line:** an entry in `lines` with its route (lane points, closed) and stops; the checker requires real maps, a place to wait at each stop, valid hours. Characters who should ride it get `transport: 'transit'`.
