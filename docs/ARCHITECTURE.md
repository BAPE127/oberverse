# Architecture

## Technology decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Language/runtime | Plain JavaScript ES modules in `src/`, bundled into one file | Readable modular source for development; players get a single `index.html`. |
| Distribution | Generated self-contained `index.html` (`tools/build.mjs`) | Opens by double-click (`file://`) and on GitHub Pages; no server or install for players. A tiny in-repo bundler (no dependencies) inlines CSS and modules as one classic script. |
| Rendering | Canvas 2D, procedural stylised art | Smooth movement and lighting without a framework; art is data-driven and replaceable by images. |
| UI | DOM overlay (HTML/CSS) | Accessible text, forms and scrolling panels for free. |
| Audio | Web Audio API synthesis | Original music and SFX with no audio files to license or load; fails silently if unavailable. |
| Persistence | `localStorage` + JSON export/import | Works offline; saves are inspectable text files. |
| Tests | Node's built-in `node:test` | Zero dependencies. Simulation code is DOM-free so it runs headlessly. |
| Dev server | 60-line Node static server (`server.js`) | Only for `dev.html`, because browsers block ES modules on `file://`. Players never need it. |

## Layering

```
          ┌───────────── browser only ─────────────┐
 main.js → ui/ (DOM)   engine/ (canvas)   audio/ (Web Audio)
          └──────────────── reads ↓ calls ─────────┘
                       game/game.js  (Game: all state)
         ┌──────────┬──────────┬──────────┬─────────┐
       sim/       systems/   dialogue/   world/    save/
 (npc brain,   (inventory,  (sessions)  (clock,   (slots,
  knowledge,    quests,                  maps,     schema,
  memory,       events)                  paths)    migrations)
  relations,
  conditions)
                       ↑ data
                  content/ (pure data + small builders)
```

Rules:
- `src/game`, `src/sim`, `src/systems`, `src/dialogue`, `src/world`, `src/save` and `src/content` **must not touch the DOM, canvas or audio**. The test suite imports them in Node.
- Systems talk through the `EventBus` (`game.bus`). Examples: `fact:learned`, `item:acquired`, `map:entered`, `quest:completed`, `npc:chat`, `sfx`, `notify`.
- Content never contains code paths that bypass systems: consequences are declarative **effects**, requirements are declarative **conditions** (see `docs/CONTENT_FORMAT.md`). The only interpreters are `src/sim/conditions.js` and `src/game/effects.js`.

## Core loop

`main.js` runs `requestAnimationFrame`. Each frame: queued key actions → `ui.handleAction`; `ui.frame(dt)` → `game.update(dt, movement)` → renderer → audio. `dt` is clamped to 0.1 s.

`Game.update`:
1. Clock advances (`clock.rate` game minutes per real second, default 1).
2. Player physics (acceleration, axis-separated tile collision, corner nudging, doors).
3. Physical tier NPCs (those on the player's map) follow paths every frame; ambient barks.
4. For every whole game minute crossed: `minuteTick()` → NPC decisions, abstract-tier travel, NPC chats, observations, quest timers, chained events, hourly events, energy.

All modal UI (dialogue, panels) pauses the game clock.

## NPC simulation

- **Decision model:** utility scoring (`src/sim/npcBrain.js`). Candidates are the current schedule block (score `1 + conscientiousness × 0.6`) and personality impulses (`weight × trait + mood bonus ± noise`, gated by conditions and the activity they may interrupt). The winner is committed for a duration; impulses then cool down. Schedule lookups are shifted by `punctuality` minutes (Osric leaves early, Tibbs is late).
- **Tiers:** physical NPCs walk A* paths (`src/world/pathfinding.js`, 8-way, no corner cutting) and hop maps through doors they're allowed to use. Abstract NPCs move by travel-time estimates door-to-door and jump into the physical tier when they enter the player's map. Time skips (sleep) simulate everyone abstractly minute by minute, so schedules, events and quest timers stay consistent.
- **Social:** NPCs on the same map within 5 tiles may chat (chance from sociability, affection and work ethic). Chats change affection, create memories and run `Knowledge.gossip`, which passes one fact as a *rumour* with reduced confidence.
- **Observation:** `profile.notices` let characters remember seeing the player in places they care about (Osric remembers visitors to his office).
- **Errands:** effects can send an NPC somewhere outside their schedule (`errand`).

## Knowledge, memory, relationships

- `Knowledge` stores per-entity `factId → {kind: fact|rumor, source, at, confidence}`. Channels: `innate`, `witnessed`, `heard` (noise), `told:<id>`, `read`, `notice`. Facts flagged `spread:false` or a character's `discretion` limit gossip. Facts `aboutPlayer` change the learner's relationship (rumours count half) and apply faction reputation once, when the fact first becomes public.
- `Memory` is bounded: 12 recent everyday entries (FIFO) and 24 significant ones (importance ≥ 6, evicting least important then oldest).
- `Relationships`: trust, affection, respect, suspicion in [-100, 100]; `disposition()` combines them for prices, labels and persuasion.

## Dialogue

`DialogueSession` (`src/dialogue/dialogueEngine.js`) chooses the first greeting whose conditions match, offers available topics, runs choices with optional skill checks (`stat`, `base`, relationship scaling, mood modifier, condition mods), handles gifts (per-character preferences with daily diminishing returns), Mags-style gossip trading, and the bounded "Ask about…" box: keyword → authored topic → authored ask-about lines → opinion of a named character → a fact the character actually knows (secrets refused at low trust) → in-character "I don't know". It never invents facts.

## Quests and events

- `QuestSystem` holds stage/outcome state, listens to bus events via data-driven triggers, applies outcome effects, expires jobs, and builds the journal (objectives + hints revealed by player knowledge).
- `EventDirector` evaluates templates hourly, on NPC arrival, or as chained follow-ups at a set time, with conditions, chance, cooldowns and effects.

## Regions (continuous outdoors)

`src/content/world.js` places outdoor maps in a region with tile offsets. When map B sits at `A.x + A.width - 1`, A's last column and B's first column are the same ground; `addSeams()` (`src/world/regions.js`) turns every tile on that strip that is walkable on both sides into a `seamless` door. Each map keeps its own coordinates, saves and simulation; the seam only joins them:

- **Player:** while standing on a seam tile and moving toward the neighbour, `Game.trySeam()` crosses as soon as the hitbox fits on the other side, translating the position by the region offset — no fade, no snap.
- **NPCs:** routing treats seams as doors; `NpcSystem.nearestSeam()` picks the crossing that best lines up with the route; `hop()` maps the position across.
- **Rendering:** `Renderer` builds `layers` = current map + `Game.neighbors()`, drawing each neighbour's ground, props, buildings, people and lights at its offset; camera bounds span the region. The minimap and full map stitch the region the same way.

Only horizontal (east–west) seams are generated so far. The coast region is Westbrook (x −43) · Lanternside (0) · the Ober Fields (63).

**Separate regions and gateways.** Big areas go in their own region and are joined by ordinary edge doors carrying `gateway: '<name>'` (with `keepTile: true` so the road still looks like road). Walking onto one loads the other region with the normal door transition; nothing from the other region is drawn or simulated as a neighbour. Halvermouth (`city`) is the first: 112×80 tiles, entered from Westbrook's west edge. The full map (M) shows a tab per region and draws gateway arrows at map edges.

## Companies and properties

- `OilCompany` (`src/systems/oilCompany.js`) and `Construction` (`src/systems/construction.js`) each own a slice of `world` state and expose shift stations; a `workstation` prop names its `company`. Panels call their methods through `choices` options (`call: [system, method, ...args]`).
- `Logistics` (`src/systems/logistics.js`, v0.21.0) runs Ober & Sons Maritime: ports, a fleet of vessel records with a validated status machine, contracts, and voyages along sea lanes (`src/world/seaRoutes.js`: A* over the globe's 3° sea cells, smoothed, cached) whose positions are derived from the game clock and whose random events are rolled once at departure. All logistics money moves through `spend`/`earn` (the ledger). Piracy is pure functions over the world's state (`src/systems/piracy.js`); missions (`src/systems/missions.js`) and the shipyard (`src/systems/shipyard.js`) are owned by `Logistics` and share its fleet — custom ships are vessel records whose model is a saved design. Fleet Command (`src/ui/fleetCommand.js`, v0.25.0) is the full-screen view of that state; the tablet's Ships app opens it; its Shipyard sheet is the shipbuilder (`src/ui/shipBuilder.js`, v0.26.0). Ships are drawn top-down by `src/engine/drawShips.js`, side-on, in detail, by `src/engine/drawShipProfile.js`, and life-size at the Yards berths by `src/engine/drawDeck.js`; `Logistics.docks` (`src/systems/docks.js`, v0.27.0) moors them there, making their decks walkable (`GameMap.setWalkable`) and generating the rooms below as maps at runtime (`src/world/shipDeck.js`; never saved, rebuilt on `maps:rebuilt`). Globe geography (`src/world/globe.js`, sampling `src/world/geography.js` since v0.28.0; drawn by `src/engine/drawGlobeSurface.js`) is shared with the arms terminal. See `docs/LOGISTICS.md`.
- `Dairy` (`src/systems/dairy.js`, v0.29.0) runs Chuckie's Cheese at Lariat: the day's milk and cheese from the herd, dividends and the CHZ share price at 18:00, and the five lead cows of `q_lost_herd`. It holds a lead cow's intent (`'dairy'`, one of npcSystem's held intents) while she's loose or on your rope, steers a roped cow after you on the player's map (short A* paths every 0.4 s; `npc.speedMul` lets her trot), carries her across a gate or map edge with you (`map:entered`), and hands her back to her paddock schedule once she's home. State is `world.dairy`, created on first use. See `docs/LARIAT.md`.
- `Properties` (`src/systems/properties.js`) tracks contracts on plots. Plots are content expanded at load by `withPlots()` (`src/world/plots.js`) into ordinary props, an interior map and a container, all shown or hidden by `property` conditions, so the engine has no plot special cases. A finished building is the one runtime change to a map: `Game.rebuildMaps()` recreates `GameMap`s from content and calls `GameMap.addBuilding()` for every finished property (on new game, on load and on completion). Render caches are keyed by `GameMap` object so rebuilt maps redraw.

## Combat

`Combat` (`src/systems/combat.js`) runs in real time on the player's map. `Game.update` calls `combat.update(dt)` before NPC movement; NPCs with `hostile` (fight/flee), or who are unconscious or dead, are skipped by the normal schedule logic (`NpcSystem.think`, `updatePhysical`, `updateAbstract`, chats) and steered by `Combat.fightStep` / `fleeStep` instead. `combat.minuteTick()` wakes the knocked-out, ends fights when their timer runs out (handing the NPC back to `think`), and heals slowly. Consequences use the existing systems: `relationships.adjust`, `remember`, `knowledge.learn` (assault/murder facts spread by gossip and apply reputation), `quests.fail(…, 'giver_died')`. Weapons are plain item data; NPC temperaments are `profile.combat`. Visual effects live in `combat.fx` (not saved) and are drawn by the renderer; health bars come from `combat.healthBar(npc)`.

### The Wrath (protected characters)

`Combat.hitNpc` checks `isProtected(npc)` first; if true it calls `smite()`, which records consequences and sets `combat.wrath = {npcId, start, seed, color, line}`. While `wrath` is set, `Game.update` only advances `realTime` and `combat.updateWrath()` (which emits `combat:lightning` on the `WRATH.strikes` timeline and `combat:wrathEnd` at the end) — the clock, NPCs and input are frozen, and the UI suspends autosave. The renderer hands the frame to `drawWrath()` (`src/engine/wrath.js`), which is a pure function of time since `start`, so tests and screenshots can jump to any moment by moving `start`. Themes (`THEMES` in `wrath.js`) supply `ground`, `aura`, `strike(i, age)`, `after` and `finale` layers plus sky/flash colours; the shared shell handles camera, letterbox, banner and fade. Melee triggers via `Combat.raisedAgainst` (generous reach, so furniture can't block it) and guns via `Combat.protectedOnRay`. The UI plays `sfx_wrath` (with the theme) and a theme strike sound (`sfx_thunder`, `sfx_gusher`, `sfx_beam`) on the bus events, then opens the *struck down* card, which calls `Combat.riseAgain()` or loads the autosave.

## Rendering

Skyscrapers are buildings with `tower: <storeys>`: the facade rises `storeys × 14 px` above the footprint, so they are culled, y-sorted and occlusion-tested by that height (`towerHeight()`), and add a soft night glow in the lighting pass. Burning barrels are light sources like street lamps.

`Renderer` caches a static ground layer per map, then draws flat props, y-sorted buildings/props/characters, interaction highlight, a lighting pass (darkness with light "holes" for lamps, lit windows and the player, plus additive warm glow), and screen-space name tags and speech bubbles. Characters are drawn procedurally from `appearance` data; if `appearance.sprite` names an image that loads, it is used instead (`src/engine/assets.js`), so art can be upgraded without touching simulation code.

## Audio

`AudioEngine` creates the `AudioContext` on the first user gesture, with master → compressor and four buses (music, sfx, ambience, voice). `SongPlayer` schedules compiled note data with a look-ahead timer and crossfades between pieces chosen by map and time of day. Failures are logged to `audio.failures` and never stop the game.

## Persistence

See `docs/SAVE_FORMAT.md`. `Game.serialize()` produces plain JSON; `SaveManager` wraps it in a versioned envelope, keeps a `.bak` of the previous save per slot, validates and repairs on load, runs migrations, and falls back to the backup if the main file is unreadable.

## Adding things without touching unrelated code

- New character: add a profile + dialogue file and register both in `src/content/index.js`. Existing saves gain the character automatically.
- New map/interior: add a map definition and a door on an existing map pointing to it (or place an outdoor map in a region in `src/content/world.js`).
- New property plot: one entry in `PLOTS` (docs/PROPERTIES.md).
- New quest/event/item/fact: add data; run `npm run validate`.
- New condition/effect type: add one `case` to `conditions.js`/`effects.js` and its key to `CONDITION_KEYS`/`EFFECT_KEYS`, document it in `CONTENT_FORMAT.md`, add a test.
