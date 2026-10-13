# The Oberverse

A persistent, character-driven, systemic sandbox RPG that runs in your browser.

You have just moved into Number 9, Gullwing Row, in **Lanternside** — a small seaside borough of the city of Obermere. The people here keep schedules, hold opinions, gossip, hold grudges, run businesses and react to what you do. The old lighthouse on the Point has been dark for eleven years, and nobody official wants to say why.

**Version:** 0.1.0 (development build) · **Save schema:** 1 · See [CHANGELOG.md](CHANGELOG.md).

---

## Running the game

The game is plain HTML/CSS/JavaScript (ES modules) with no build step and no dependencies. Browsers will not load ES modules from `file://`, so serve the folder over HTTP:

```bash
npm start            # zero-dependency Node server → http://127.0.0.1:8080/
```

Any static file server works too, e.g. `python3 -m http.server 8080` or `npx serve`. The server is only a file server; the game itself runs entirely in the browser, works offline once loaded, and never contacts any external service or AI API.

Requirements: a current desktop browser (Chromium, Firefox or Safari). Node 18+ is needed only for `npm start`, the tests and the tools.

Sound starts after your first click or key press (browser autoplay rules).

## Controls

| Key | Action |
| --- | --- |
| WASD / arrow keys | Move |
| Shift | Sprint (uses energy) |
| E / Space | Interact · talk · advance dialogue |
| 1–9 | Pick a dialogue option |
| I / Tab | Inventory & character stats |
| J / Q | Journal (quests, people, notes, standing) |
| C | People you know |
| M | Map |
| Esc / P | Pause menu · back |
| F5 / F9 | Quick save / quick load (slot 1) |
| ` (backquote) | Debug overlay |

## What's in this build

* **Lanternside** — an outdoor borough (canal, civic square, park, quay, lighthouse point) and six interiors, with a day/night cycle, lit windows, street lamps and a world clock (1 real second = 1 game minute).
* **Three original residents** — Mags (café owner, gossip broker), Osric (Civic Office clerk, keeper of keys), Tibbs (impulsive mechanic). Each has a structured personality, schedule, impulses, moods, bounded memory, relationships, knowledge, voice, musical motif and their own dialogue and mechanics.
* **Systemic play** — doors with keys and opening hours, containers with ownership and witnessed theft, shops whose prices follow friendship, gifts, persuasion checks, reputation with three factions, and information that spreads through gossip rather than omniscience.
* **Quests with multiple solutions** — *The Dark Lamp* (get into the lighthouse by permission, stealth, or a crowbar and a noisy hatch; then decide who to tell), *The Lucky Spanner*, and a daily delivery job.
* **Emergent events** — workshop explosions that lead to noise citations only if word reaches Osric, a missing key that Osric notices and investigates, honey-bun sell-outs that ruin Osric's lunch, and gulls with intent.
* **Original audio** — seven procedurally performed compositions, ambience beds, sound effects, character motifs and per-character dialogue voices, with master/music/SFX/ambience/voice volume and mute.
* **Durable saves** — autosave + three slots, backups, validation and repair, versioned schema with migrations, JSON export/import.

Combat is not in this build (it is planned as an optional system; see [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md)).

## Development

```bash
npm test             # unit/integration tests (Node's built-in test runner)
npm run validate     # content reference validator
npm run check        # both of the above
npm run smoke        # headless browser smoke test with screenshots (needs Playwright)
npm run map -- cafe  # ASCII preview of a map
```

Start with [docs/DEVELOPMENT_WORKFLOW.md](docs/DEVELOPMENT_WORKFLOW.md) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). AI agents continuing development should begin at [docs/prompt-bank/INDEX.md](docs/prompt-bank/INDEX.md).

### Adding your own characters

The Oberverse is designed to take in characters you supply (an image plus a description). Character import always starts with a short interview so the character is implemented as *you* see them — see [docs/CHARACTER_IMPORT.md](docs/CHARACTER_IMPORT.md) and the prompt [docs/prompt-bank/03-character-import.md](docs/prompt-bank/03-character-import.md).

## Project layout

```
index.html, styles.css     page shell and UI styling
server.js                  optional zero-dependency static server
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
