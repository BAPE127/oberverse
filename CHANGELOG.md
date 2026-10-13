# Changelog

All notable changes to the Oberverse. Versions follow `MAJOR.MINOR.PATCH` (see docs/DEVELOPMENT_WORKFLOW.md).

## [0.7.0] — 2026-10-13 — "The Oberverse Protects Its Own" (development build)

### Added
- **Imported characters are protected** (`isProtected()` in `src/systems/combat.js`): any character with `origin: 'imported'` cannot be damaged, knocked out or killed — unless their profile sets `killable: true` (the project owner's decision).
- **The Wrath**: attacking a protected character with anything (fists, melee, guns) triggers a ~10-second cutscene (`src/engine/wrath.js`) that strikes the player down:
  - the world freezes (clock, NPCs, input), letterbox bars slide in, the camera pushes in and the sky darkens toward the character's colour;
  - three counter-rotating rings of procedurally drawn runes unfold around the levitating victim, whose eyes burn; a heptagram sigil glows beneath them; motes swirl inward;
  - the banner "THE OBERVERSE PROTECTS ITS OWN" drifts together letter by letter;
  - the runes converge on the player and a sigil opens under their feet; five forked lightning bolts strike with white-out flashes and screen shake;
  - a pillar of light rises, the player dissolves into embers, fade to black, and the victim has the last word (`profile.wrath.line`, coloured by `profile.wrath.color`).
- **Score**: `sfx_wrath`, an original 8-second procedural piece (impact, timpani roll, detuned "choir" through vowel formants, organ pedal, rune hum, brass stabs, a rising whoosh, final D-major crash), timed to the visuals; `sfx_thunder` on every strike; music and ambience duck for the scene. Rendered offline in Chromium to confirm output and headroom (peak 0.91).
- **Struck down** card: *Rise again* (wake at home at 08:00 the next day, full health, half your obols gone) or *Load last autosave*.
- Consequences: the victim remembers; witnesses and the victim learn `fact_player_smitten` (gossip); flag `smitten_by_<id>` counts attempts for future dialogue.
- Wrath lines and colours for Sir Moneybucks (gold) and Mason Nails (orange).
- Tests: `tests/wrath.test.mjs` (5 tests).

### Changed
- `docs/CHARACTER_IMPORT.md` and prompt 03: imported characters are protected by default; ask the owner before setting `killable`, and write a `wrath.line`.

### Compatibility
- Save schema unchanged (1). The cutscene is never saved (autosave is suspended while it plays).

## [0.6.0] — 2026-10-13 — "Hard Lessons" (development build)

### Added
- **Combat system** (`src/systems/combat.js`). The player can attack any NPC with melee weapons or guns.
  - Melee: an arc in front of the player (range, arc, cooldown, knockback per weapon). Guns: hitscan rays stopped by walls and buildings, with spread, pellets (shotgun), full auto (SMG), magazines, reloading and ammunition items.
  - Aiming: the mouse when it is in use; otherwise facing with a forgiving auto-aim cone. A dashed aim line shows for guns.
  - **NPC health bars** appear over anyone who is hurt or fighting (green → amber → red, white flash on hit), with floating damage numbers; "KNOCKED OUT" under the bar while they are down.
  - **Fight or flight**: victims and witnesses flee or fight back by temperament (`profile.combat`: `fights`, `defends` (true or a list of people), `never`, `weapon`, `maxHealth`) and personality. Fighters chase with collision and short A* re-plans; badly hurt fighters break and run.
  - **Non-lethal** weapons (fists, brass knuckles, police baton) knock people out for two game hours; they wake at 30% health, frightened. **Lethal** weapons kill: bodies stay where they fell, the dead never act again, can't be talked to, and quests they gave fail.
  - Consequences through existing systems: victims' relationships and memories, witnesses learn `fact_player_assault` / `fact_player_murder` (gossip, reputation), a new `frightened` mood, gunshots scare everyone within earshot (and wake sleepers).
  - The player can be beaten: at 0 health you black out and wake at home six hours later with 45 health, missing a quarter of your money. Health regenerates slowly out of combat.
- **Weapons** (items with a `weapon` block): brass knuckles, police baton, baseball bat, crowbar (now also a weapon), machete, fire axe; .38 revolver, 9mm pistol, pump shotgun, hunting rifle, submachine gun. **Ammo**: .38, 9mm, shotgun shells, rifle rounds (sold by the box; items take a `bundle` size).
- Where to get them: **Rook & Rifle** (Halvermouth) is now an unmanned shop (honesty box; restocks at 09:00); Tibbs sells a fire axe; a baton in the police station lockers (faction `fac_police`); a bat in a crate in the Sumps (unowned containers can be taken from freely).
- Controls: **F / left click** attack (hold for automatic weapons), **R** reload, **X** next weapon, **1–9** pick a weapon, **Z** put weapon away; Equip / Put away buttons in the inventory; HUD shows the weapon and ammo.
- Art: weapons held in hand, bodies lying down (dead ones over a dark pool), tracers, muzzle flashes, swing arcs, bullet sparks, a red vignette when hurt or low on health.
- Audio: swing, punch, whack, slash, three gunshots, reload, dry fire, hurt.
- Combat temperaments for 18 characters (e.g. Silas defends with a revolver; Barnaby protects anyone; Mason, Osric, Sir Moneybucks and others never fight).
- Validator: weapon definitions, ammo references, combat profiles; interact kind `shop`; shops and containers may have `owner: null`.
- Tests: `tests/combat.test.mjs` (10 tests).

### Compatibility
- Save schema unchanged (1). New optional fields: `player.equipped`, `player.mags`; per NPC `health`, `dead`, `downUntil`, `diedAt`. Older saves load with fists and everyone at full health.

## [0.5.0] — 2026-10-13 — "Halvermouth" (development build; map only)

### Added
- **Halvermouth** (`halvermouth`, 112×80 tiles — the largest map), a metropolis west of Westbrook. It is its own region (`city` in `src/content/world.js`) and is **loaded when the player enters** through gateway doors at Westbrook's west edge / the city's East Gate, rather than stitched seamlessly.
- Districts: the Financial District, Bank Row, Civic Plaza, Precinct Row, the East End, Market Street, Iron Row, Founders Park, the Docks and **the Sumps** (slums).
- **Skyscrapers** (new `tower` building style: tall glass facades, floor bands, lobbies, helipads, antenna beacons, offices lit at night, night glow): eleven towers including Ober's Oil Tower (30 storeys).
- **Hall of Justice** (courthouse + Mayor's office) with a dome and pediment at the centre of Civic Plaza; **Police Precinct 1** with a car park of cruisers; **Rook & Rifle Firearms** on Iron Row. Interiors: `hall_of_justice` (lobby, Mayor's office, Courtroom One), `police_station` (front desk, desks, holding cells), `gun_shop` (display counter, racks).
- Closed-for-now buildings with flavour text: the other towers, bank, hotel, cinema, diner, pawnbroker, bar, garage, locksmith, bail bonds, mission, warehouses.
- New tiles `m` (plaza stone) and `u` (mud); building styles `flatRoof`, `dome`, `pediment`, `shabby`; props `car` (incl. police and wrecked), `flagpole`, `statue`, `trash`, `barrelfire` (a light source), `tent`, `laundry`, `crosswalk`, `hydrant`, `dumpster`, `chainfence`, `gunrack`, `cellbars`, `gatepost`; a firearms variant of the display case.
- Audio: `mus_halvermouth` ("City of a Thousand Windows"), `amb_city` (traffic hum, distant horns).
- Map (M): a tab for every region, including regions not yet visited; gateway arrows at map edges ("◀ Halvermouth"); the full map now always stitches the whole region.
- Tests: `tests/world_halvermouth.test.mjs` (6 tests: region separation, walking through the gateway both ways, required buildings and districts, reachability of every open door and interior, opening hours, saves).

### Changed
- Doors may carry `gateway: '<name>'` (edge doors into another region); building `mapLabel: ''` hides a label on the map.

### Not included (by request — map first)
- No residents, shops, jobs, quests or events in Halvermouth yet.

### Compatibility
- Save schema unchanged (1). Older saves load; the city simply appears.

## [0.4.0] — 2026-10-13 — "Mason's Os" (development build)

### Added
- **Second imported character: Mason Nails** (`npc_mason`), from a player-supplied image and interview. Cheerful, neutral, always friendly, a dad-joke machine; owns Mason's Os ("That's O plural!"). His photo is his dialogue portrait.
- **Pun of the Day**: a different pun each in-game day (`Game.dailyPun()`, bank in `src/content/dialogue/mason.js`); groan, laugh, or fire one back (Wits check).
- **Westbrook Lots** (`westbrook`, 44×48), joined seamlessly to the west of Lanternside: Mason's Os yard and site office (`mason_office`), a construction site with a working excavator (animates while Mason digs), the Plumb Line Apartments (`apartments`), the canal's western basin and surveyed lots.
- **Three generated crew**: Dee Rivera (foreman), Barnaby Cole (labourer, birdwatcher, feuding with Tibbs over a gull), Quinn Abernathy (apprentice surveyor/draftsperson). All live at the Plumb Line.
- **Construction shifts** (`job_construction_shift`, `src/systems/construction.js`): trench, bricks, mixer; properly or rushed. Flat 6-obol wage; careful shifts earn crew goodwill (discounts up to 25%, builds up to 2 days faster).
- **Property groundwork** (`src/systems/properties.js`, `src/world/plots.js`, `src/content/properties.js`, docs/PROPERTIES.md): plots and blueprints (home, rental, business), contracts board, Form 22-B permits from Osric, multi-day builds, finished buildings added to the map at runtime with their own interior, rent/income at 18:00. **No plots exist yet** — added on request.
- New condition keys `site`, `property`; effect keys `site`, `permit`; `payWages: 'construction'`; interact kind `contracts`; workstations take a `company`.
- New faction `fac_builders`; facts about Mason's Os, the gull feud, Dee's secret pun tally.
- Audio: `mus_westbrook` ("Measure Twice"), `motif_mason` (whistled), `amb_site` (hammering, idling excavator).
- Docs: `docs/characters/npc_mason.md`, `docs/PROPERTIES.md`, prompt 17 (add a property plot); registry, world bible, content format, architecture, audio guide, known issues, testing record updated.
- Art: scaffold, excavator, lumber, bricks, cement mixer, trench, survey stake, contracts board.
- Tests: `tests/character_mason.test.mjs` (13 tests, incl. a full property lifecycle on a test-only plot).

### Changed
- Mags, Osric, Tibbs and Sir Moneybucks know Mason (relationships and opinions); Sir Moneybucks wants him exclusively and was refused.
- Region renamed "Lanternside & surrounds" (Westbrook · Lanternside · Ober Fields).
- Map rendering caches are keyed by map object so maps can be rebuilt at runtime.

### Compatibility
- Save schema unchanged (1). `world.construction`, `world.properties`, `fac_builders` and the four new residents are defaulted on load of older saves.

## [0.3.0] — 2026-10-13 — "One Coast" (development build)

### Changed
- **Lanternside and the Ober Fields are one continuous space.** Outdoor maps can be placed side by side in a *region* (`src/content/world.js`); the shared edge column becomes a seam the player and NPCs walk across with an exact, jump-free handover (no fade, no camera snap).
- The renderer draws neighbouring maps (ground, water, buildings, props, people, street lights, the lighthouse beam) beyond the current map's edge, and the camera pans across the seam.
- The minimap and the full map (M) draw the whole region stitched together as "Lanternside & the Ober Fields".
- The Ober Fields' west edge continues the Lantern Canal (ending in a culvert pool) and the harbour shore; a westward signpost was added.
- NPCs choose the seam crossing that best lines up with their route.

### Added
- `src/world/regions.js`: seam generation (walkable tiles only) and region offsets; `Game.neighbors()`, `Game.mapOffset()`.
- The welcome letter points new players east to the Ober Fields; loading a save from an older version shows a "what's new" note.
- Tests: walking across and back with no jump; seams only on walkable ground; an NPC crossing physically.

### Removed
- The two explicit "Road to …" edge doors (replaced by the generated seam).

### Compatibility
- Save schema unchanged (1). Saves made on either map load as before.

## [0.2.0] — 2026-10-13 — "Ober's Oil" (development build)

### Added
- **First imported character: Sir Richard E. Moneybucks, Esq.** (`npc_moneybucks`), from a player-supplied image and interview. Ruthless robber baron and antagonist you can work with; status-tiered treatment of the player; his photo as dialogue portrait (embedded data URI).
- **The Ober Fields** district (`ober_fields`) reached by the road east of Lanternside, with interiors: Moneybucks Manor (hall + study), Ober's Oil Refinery No. 1, Workers' Bunkhouse.
- **Ten generated employees**: Crisp, Agnes, Gideon, Ruby, Hank, Pip, Delphine, Silas, Mabel, Otto — routines, personalities, relationships, dialogue and system hooks.
- **Ober's Oil economy** (`src/systems/oilCompany.js`): shares, daily output and dividends, expansion projects (derricks, pipeline, safety refit) with visible and social consequences, wages, morale, accident risk, strikes.
- **Refinery shift job** with three work stations (do it properly or cut corners).
- **"The Ledger"** card wager (`src/systems/ledgerGame.js`), tuned by simulation so reading his tells (Wits) beats naive play.
- **Quest "The Seal of M."** continuing the lighthouse mystery, with four endings (expose, restore, blackmail, partnership); a relit lighthouse with a sweeping beam.
- Events: strike, refinery accident, the Kettle & Crumb buyout, canal slick, the empty vault, lens requisition. Notice-board posts for each.
- Manor invitations (door locks with flags), private documents that catch snoopers, keyed vault, company store with gouging prices, edge-of-map road exits.
- Art: top hats, hard hats, caps, beards, handlebar moustaches, monocles, pinstripes, watch chains, held cigars/clipboards/wrenches; derricks, pumpjacks, tanks, pipes, refinery machinery, vault, paintings.
- Audio: three new compositions, Sir Moneybucks's motif, brass instrument, two ambience beds.
- New faction `fac_oil`; new condition keys `wealth`, `oil`, `arrived`; new effect keys `oil`, `payWages`, `schedule`, `action`.
- `tests/character_moneybucks.test.mjs` (14 tests); validator checks for impossible impulses and event id mismatches.

### Fixed
- Event templates lacked ids, so all events shared one cooldown/once slot.
- Impulses that could never fire (Mags's patio natter, Osric's overtime, Tibbs's gull watching).
- Character portraits drawn before their image loaded fell back to procedural art.

### Compatibility
- Save schema unchanged (1). Older saves load and gain the new characters, Ober's Oil state and `fac_oil` reputation automatically (tested with the 0.1.0 fixture).

## [0.1.1] — 2026-10-13 — "Just Open It" (development build)

### Changed
- **The game is now a single, self-contained `index.html`.** Double-click it to play: no server, no installation, no internet. The same file is served as-is by GitHub Pages, so the game can be shared as a link.
- The multi-file module page moved to `dev.html` (development only, `npm run dev`).

### Added
- `tools/build.mjs` (`npm run build`): zero-dependency bundler that inlines the stylesheet and every module into `index.html`.
- `tests/build.test.mjs`: fails if `index.html` is out of date with the sources, or stops being self-contained.
- Smoke test now runs against `index.html` over `file://` (24 checks, including saves persisting across a reload); `--dev` tests `dev.html` through the dev server.
- `.nojekyll` so GitHub Pages serves files untouched.

## [0.1.0] — 2026-10-13 — "Foundations of Lanternside" (development build)

First playable foundation (roadmap stages 0–1, with early parts of stages 2–6).

### Added
- Project structure, zero-dependency static server, ES-module browser game with no build step.
- Version identifiers in `VERSION`, `package.json`, `oberverse-manifest.json` and `src/core/version.js`; version shown on the title screen, pause menu and About screen.
- World clock (1 real second = 1 game minute), weekdays, dawn/dusk lighting, lit windows and street lamps.
- Lanternside outdoor map (64×48 tiles) with six districts and six interiors (player flat, Kettle & Crumb café, Civic Office, Hollow Fixings workshop, the Old Lighthouse, Vane residence).
- Smooth player movement with acceleration, collision, corner sliding, sprinting and energy.
- Doors with keys, owners and opening hours; trespass detection for restricted places.
- Interaction framework: talk, examine, read, search containers, sit, sleep, forage, pry obstacles, notice board.
- NPC simulation in two tiers (physical on the player's map, abstract elsewhere) sharing one utility-based brain over schedules and personality-driven impulses.
- Knowledge system with witnessing, hearing, reading, gossip and rumours; NPC-to-NPC conversations that spread information.
- Relationships (trust, affection, respect, suspicion), moods, bounded importance-based memory, observation rules.
- Three original characters: Mags Pell, Osric Vane, Tibbs Hollow — with dialogue, opinions, gifts, reactions and distinctive mechanics (gossip trading, formal requests, junk trading).
- Dialogue engine: conditional greetings, topics, choices with skill checks, gifts, gossip trading, bounded "Ask about…" keyword box, anti-repetition.
- Inventory, money (obols), shops with friendship pricing and persistent stock, containers with ownership and witnessed theft.
- Quests: *The Dark Lamp* (three entry approaches, two resolutions), *The Lucky Spanner*, daily job *Coffee for the Clerk* with expiry.
- Reputation with Lanternside and three factions.
- Emergent event director with event chains: workshop bang → noise citation, missing key investigation, café sell-out, gull heists.
- Original procedural soundtrack (7 pieces), ambience beds, 18 sound effects, 3 character motifs, per-character voice blips; volume controls and mute.
- HUD, minimap, full map with fog of war and quest markers, journal (quests, people, notes, standing), inventory, shop, container, document reader, settings, save/load, About & release history, debug overlay.
- Saves: autosave + 3 slots, automatic backups, validation and repair, schema version 1 with migration framework, JSON export/import.
- 59 automated tests, content validator, 21-check browser smoke test, map preview tool, save-fixture generator.
- Documentation set and AI prompt bank.

### Known limitations
See docs/KNOWN_ISSUES.md. Notably: no combat yet, no equipment slots, a single outdoor map, no controller support.
