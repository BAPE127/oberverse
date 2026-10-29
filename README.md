# The Oberverse

A persistent, character-driven, systemic sandbox RPG that runs in your browser.

You have just moved into Number 9, Gullwing Row, in **Lanternside** — a small seaside borough of the city of Obermere. The people here keep schedules, hold opinions, gossip, hold grudges, run businesses and react to what you do. The old lighthouse on the Point has been dark for eleven years, and nobody official wants to say why.

**Version:** 0.61.1 (development build) · **Save schema:** 1 · See [CHANGELOG.md](CHANGELOG.md).

---

## Playing the game

**Play online at https://bape127.github.io/oberverse/ — or just open `index.html` in your browser.** That's it — the whole game is that one file. No installation, no server, no internet connection.

- **Download:** on GitHub choose *Code → Download ZIP*, unzip it, and double-click `index.html`. (You can also copy `index.html` on its own anywhere — it doesn't need the other files.)
- **Play online:** **https://bape127.github.io/oberverse/** — served by GitHub Pages from the `claude/funny-mayer-52dll8` branch, `/ (root)`. Every push redeploys it automatically.

Works in current desktop Chrome, Edge, Firefox and Safari. Sound starts after your first click or key press (browser rule). Your progress is saved in the browser automatically; saves made from the downloaded file and saves made on the web link are kept separately — use *Export*/*Import* in the Load menu to move one across.

The game never contacts any external service or AI API.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrow keys | Move |
| Shift | Sprint (uses energy) |
| E / Space | Interact · talk · advance dialogue |
| 1–9 | Pick a dialogue option · outside dialogue: pick a weapon (1 = fists) |
| F / left click | Attack (hold for automatic weapons; aim with the mouse) |
| R | Reload |
| X / Z | Next weapon / put weapon away |
| I / Tab | Inventory & character stats |
| J / Q | Tablet (notifications, quests, people, notes, standing, your business, stocks) |
| C | People you know |
| M | Map |
| E by a car | Get in (your car) · look at it / hotwire it (anyone else's) |
| E at a bus stop | Bus times · wait for the next bus · board one that's waiting (2 obols) · on board: get off when it stops |
| Driving | W/↑ accelerate · S/↓ brake & reverse · A/D steer · Shift handbrake · H horn · E get out |
| Esc / P | Pause menu · back |
| F5 / F9 | Quick save / quick load (slot 1) |
| ` (backquote) | Debug menu (testing): money, items, health, teleport, time, console — type `help` |

## What's in this build

* **Westbrook Lots, Lanternside and the Ober Fields** — one continuous stretch of coast (walk west along Gullwing Road to the building site, or east into the oil country, no loading) with canal, civic square, park, quay, lighthouse point, a construction site, manor grounds, refinery and oil fields, plus eleven interiors, with a day/night cycle, lit windows, street lamps and a world clock (1 real second = 1 game minute).
* **Halvermouth** — a sprawling city west of Westbrook (loaded when you walk through its gates): skyscrapers, the domed Hall of Justice and Mayor's office, Police Precinct 1, Rook & Rifle Firearms, Market Street, Founders Park, the Docks and the Sumps slum. *Map only so far — residents and activities come next.*
* **Three original residents** — Mags (café owner, gossip broker), Osric (Civic Office clerk, keeper of keys), Tibbs (impulsive mechanic). Each has a structured personality, schedule, impulses, moods, bounded memory, relationships, knowledge, voice, musical motif and their own dialogue and mechanics.
* **Sir Richard E. Moneybucks, Esq.** — the first imported character: ruthless founder of Ober's Oil, with his estate east of town (manor, refinery, oil fields), ten employees, refinery shifts, shares and expansion projects, strikes, and a high-stakes card wager called the Ledger.
* **Mason Nails** — the second imported character: cheerful, pun-powered owner of Mason's Os ("That's O plural!") in Westbrook, with a Pun of the Day, three crew who live at the Plumb Line Apartments, construction shifts that earn crew goodwill, and the groundwork for building your own home, rental flats or shopfront (plots coming soon).
* **Combat** — attack anyone with fists, clubs, blades or guns (twelve weapons, ammo and reloading). Health bars appear over people you hurt; some run, some fight back; knock-outs wear off, deaths don't — and witnesses talk. Imported characters are untouchable: raise a hand against one and the Oberverse strikes you down in their own style (Sir Moneybucks: burning oil and raining money; Mason: I-beams, a wrecking ball and a condemned brick wall).
* **Systemic play** — doors with keys and opening hours, containers with ownership and witnessed theft, shops whose prices follow friendship, gifts, persuasion checks, reputation with three factions, and information that spreads through gossip rather than omniscience.
* **Quests with multiple solutions** — *The Dark Lamp* (get into the lighthouse by permission, stealth, or a crowbar and a noisy hatch; then decide who to tell), *The Seal of M.* (four endings), *The Lucky Spanner*, and daily café, refinery and construction jobs.
* **Emergent events** — workshop explosions that lead to noise citations only if word reaches Osric, a missing key that Osric notices and investigates, honey-bun sell-outs that ruin Osric's lunch, and gulls with intent.
* **Original audio** — seven procedurally performed compositions, ambience beds, sound effects, character motifs and per-character dialogue voices, with master/music/SFX/ambience/voice volume and mute.
* **Durable saves** — autosave + three slots, backups, validation and repair, versioned schema with migrations, JSON export/import.

Combat is not in this build (it is planned as an optional system; see [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md)).

## Development

The source is plain HTML/CSS/JavaScript ES modules with no dependencies. `index.html` is **generated** — edit `dev.html`, `styles.css` or `src/`, then rebuild:

```bash
npm run build        # regenerate the standalone index.html (commit it)
npm run dev          # serve dev.html (multi-file, live source) at http://127.0.0.1:8080/dev.html
npm test             # unit/integration tests (Node's built-in test runner)
npm run validate     # content reference validator
npm run check        # both of the above
npm run smoke        # headless browser test of index.html via file:// (needs Playwright); add -- --dev for dev.html
npm run map -- cafe  # ASCII preview of a map
```

Start with [docs/DEVELOPMENT_WORKFLOW.md](docs/DEVELOPMENT_WORKFLOW.md) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). AI agents continuing development should begin at [docs/prompt-bank/INDEX.md](docs/prompt-bank/INDEX.md).

### Adding your own characters

The Oberverse is designed to take in characters you supply (an image plus a description). Character import always starts with a short interview so the character is implemented as *you* see them — see [docs/CHARACTER_IMPORT.md](docs/CHARACTER_IMPORT.md) and the prompt [docs/prompt-bank/03-character-import.md](docs/prompt-bank/03-character-import.md).

## Project layout

```
index.html                 GENERATED standalone game (open this to play)
dev.html, styles.css       page shell and UI styling used for development and as the build template
server.js                  development-only static server for dev.html
src/core/                  version, RNG, event bus, input, release notes
src/world/                 clock, tiles, maps, pathfinding
src/sim/                   NPC brain & tiers, schedules, knowledge, memory, relationships, conditions
src/systems/               inventory, quests, emergent event director
src/game/                  Game state object and the effect interpreter
src/dialogue/              dialogue engine
src/save/                  save slots, schema validation, migrations, settings
src/engine/                canvas renderer and procedural art
src/audio/                 Web Audio synth, sequencer, SFX, ambience
src/ui/                    HUD, panels, dialogue box, maps
src/content/               all authored content (maps, characters, dialogue, quests, items, audio…)
tools/                     validator, smoke test, map preview
tests/                     automated tests
docs/                      design, architecture, world bible, procedures, prompt bank
```
