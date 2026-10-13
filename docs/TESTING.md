# Testing

## Automated

| Command | What it does |
| --- | --- |
| `npm test` | Runs every `tests/*.test.mjs` with Node's built-in test runner. Fully headless: the whole simulation runs without a browser. |
| `npm run validate` | Content reference validator (`tools/validate-content.mjs`). |
| `npm run check` | Both of the above. |
| `npm run smoke` | Opens the standalone `index.html` via `file://` (no server — exactly as players do), drives it in headless Chromium via Playwright, fails on any page error or engine warning, and writes screenshots to `tools/out/`. `npm run smoke -- --dev` runs the same checks on `dev.html` through the dev server. Requires Playwright (a global install is fine). |
| `node tools/make-save-fixture.mjs` | Writes a representative save for the *current* schema to `tests/fixtures/`. Run once per new schema and commit; never regenerate old fixtures. |

### Test files

| File | Covers |
| --- | --- |
| `version.test.mjs` | Version agreement across VERSION, package.json, manifest, game, release notes, changelog, version history. |
| `clock.test.mjs` | Time parsing, wrap-around windows, day/night, pausing. |
| `world.test.mjs` | A* and cross-map routing, wall collision, door transitions, locks/hours/owners, interaction targeting. |
| `dialogue.test.mjs` | Greetings, distinct voices, topic effects, bounded Ask-about (secrets, unknowns), knowledge boundaries, gifts with diminishing returns, gossip trading, locked choices, moods vs persuasion, condition evaluation. |
| `simulation.test.mjs` | Schedules cover 24 h, a full simulated day in the abstract tier, physical walking on the player's map, NPC chats spreading information, rumour vs fact, observation, bounded memory, impulsive deviation, sleep/time-skip consistency. |
| `quests.test.mjs` | The Dark Lamp's three entry approaches (permission, theft + later discovery + confession, caught red-handed, hatch, witnessed hatch), both resolutions, The Lucky Spanner, job expiry & recovery, shops & pricing. |
| `events.test.mjs` | Bang → citation chain gated by information flow, sell-out → irritable Osric, gull heists, witness-only crimes. |
| `save.test.mjs` | Round-trip of rich state, backup fallback on corruption, validation/repair, migrations, forward-compatible content, import/export, settings. Loads the schema-1 fixture. |
| `build.test.mjs` | `index.html` matches a fresh build; the page is self-contained (no module scripts, external files); the bundle parses and includes every module once. |
| `character_moneybucks.test.mjs` | Sir Moneybucks's tiers, schedule, invitation, refinery shifts, investing, the Ledger, the strike, the mystery, saves. |
| `character_mason.test.mjs` | Mason's import, puns and Pun of the Day, always-friendly rule, schedules and physical routes, construction shifts and goodwill, contracts board, the property lifecycle on a test plot, the Westbrook seam, old-save compatibility. |
| `world_halvermouth.test.mjs` | Halvermouth: separate region, gateway travel both ways, required buildings/districts/slum, reachability of every open door and interior, opening hours, saves. |
| `combat.test.mjs` | Weapon variety, punching + health bar, flee vs fight-back, the player being beaten, witnesses, knock-outs and waking, killing (permanent, quests fail, saves), buying/loading/shooting a gun, walls stopping bullets, gunfire panic, weapons in the world, old saves. |
| `wrath.test.mjs` | Protection of imported characters (and only them), the Wrath freezing the world, five strikes, rising again, every weapon type triggering it, `killable: true` lifting it. |
| `debug.test.mjs` | Debug console: give/take by id or name, money/health/energy/heal/god, weapons and ammo, time/skip/teleport/stats/rep/flags, reviving the dead and knocked-out. |
| `content.test.mjs` | Validator passes and catches injected errors, songs compile into whole bars, every major character has motif/voice/personality, **no network or external AI usage anywhere in `src/` or `index.html`**. |

## Manual testing with the Debug menu

Press ` in game (or Pause → *Debug menu*). Useful recipes: `weapons` then `tp halvermouth` for combat; `money 1000` for shops and property; `time 22:00` for night lighting; `revive all` after combat tests; `god` to watch fights without dying; `npcs` to find someone. Saves made after using it carry `flags.debug_used = true`.

## Verification record — v0.9.0 (2026-10-13)

- Bug report from the owner: attacking Sir Moneybucks showed nothing. Reproduced in Chromium by walking up to him at his real haunts and pressing F: in the dining room the closest the player can stand is 63 px (the table is in the way) while a fist reaches 46 px — the swing silently missed. Earlier tests always stood the player adjacent. Fixed and covered by two regression tests (across-the-table swing; a near-miss bullet).
- `npm run check` — **121/121 tests passed**; validator 0 errors.
- `npm run smoke` and `npm run smoke -- --dev` — 24/24 each.
- Browser: real F-key attacks on Sir Moneybucks (dining room, study) and Mason (excavator cab) all triggered their themed Wrath; frames captured across the timeline for both themes (aura, first strikes, finale). No page errors or warnings.
- Audio: all three `sfx_wrath` themes, `sfx_gusher` and `sfx_beam` rendered offline in Chromium; peaks 0.71–0.89 (no clipping). Not listened to by ear.

## Verification record — v0.8.0 (2026-10-13)

- `npm run check` — **118/118 tests passed** (5 new in `debug.test.mjs`); validator 0 errors.
- `npm run smoke` and `npm run smoke -- --dev` — 24/24 each.
- Browser (headless Chromium, real keyboard): ` opened the menu with the console focused; typed `money 777`, `give pistol`, `health 35` (all applied); Up recalled the last command; clicked *All weapons*; searched "feather", set qty 3 and clicked Give; teleported to Halvermouth from the map list; Esc closed the menu; letters typed into the console did not move the player or trigger attacks; the Pause menu shows the Debug entry. No page errors or game warnings.

## Verification record — v0.7.0 (2026-10-13)

- `npm run check` — **113/113 tests passed** (5 new in `wrath.test.mjs`); validator 0 errors.
- `npm run smoke` and `npm run smoke -- --dev` — 24/24 each.
- Browser (headless Chromium), with a real F-key attack: on Mason at the construction site (orange) and on Sir Moneybucks at the Quay (gold), frames captured across the timeline — runes and banner (1.9 s), first lightning strike (3.45 s), the strike storm (3.9 s), the pillar and embers (5.15–5.9 s), the last word on black (8.5 s), the *struck down* card; clicking *Rise again* woke the player at home at 08:00 the next day with half their money and the HUD restored. No page errors, no game warnings, no audio failures.
- Audio: `sfx_wrath`, `sfx_thunder` and `sfx_gunshot` rendered through an `OfflineAudioContext` in Chromium; the score sounds for ~7 s and peaked at 1.34 (clipping) — lowered to 0.91 before release. Not listened to by ear.

## Verification record — v0.6.0 (2026-10-13)

- `npm run check` — **108/108 tests passed** (10 new in `combat.test.mjs`), stable across three runs; validator 0 errors (2 intentional warnings).
- `npm run smoke` — 24/24; `npm run smoke -- --dev` — 24/24.
- Browser playtest with real input (headless Chromium): pressed F next to Mags → she took 9 damage, her health bar appeared and she fought back (player 100 → 74 over 2.5 s); bought a pistol, 9mm rounds, a shotgun and shells through the gun-counter shop panel by clicking; equipped from the inventory; R reloaded (12/12 · 8); two mouse-aimed clicks across the Civic Office hit Osric (100 → 39) who fled; a knock-out shows him lying down with "KNOCKED OUT" under his bar. No page errors, no game warnings.
- Not verified: feel/balance over long play, phones/touch (no touch controls for combat), audio by ear.

## Verification record — v0.5.0 (2026-10-13)

- `npm run check` — **98/98 tests passed** (6 new in `world_halvermouth.test.mjs`); validator 0 errors (2 intentional warnings).
- `npm run smoke` — 24/24; `npm run smoke -- --dev` — 24/24. (The smoke test caught a regression during this build — a roof variable moved out of scope broke the chimneys on ordinary houses — fixed before release.)
- Browser walkthrough (headless Chromium): walking west from Westbrook's gate loads Halvermouth at the East Gate; screenshots of the plaza (day and night), Bank Row and Ober's Oil Tower, the Financial District at night, Precinct Row, Iron Row, the Sumps (day and night), the Docks, all three interiors, the city map tab and the coast map's gateway arrow. No page errors, no game warnings. 60 fps measured in the plaza and on Bank Row.
- Not verified: phones/tablets (large ground layer), Firefox/Safari, audio by ear.

## Verification record — v0.4.0 (2026-10-13)

- `npm run check` — **92/92 tests passed** (13 new in `character_mason.test.mjs`); validator 0 errors (2 intentional warnings).
- `npm run smoke` (standalone `file://`) — 24/24 passed; `npm run smoke -- --dev` — 24/24 passed.
- Property lifecycle verified headlessly on a **test-only plot** (contract → Osric permit → 3-day build at 18:00 → building + door on the map → interior furniture by blueprint → survives save/load; rental pays 8/day). No real plots exist, so the finished-building path has not been seen in a browser; `Game.rebuildMaps()` was exercised in Chromium with no errors.
- Browser screenshots (headless Chromium): Mason in the excavator cab at 11:00 with Dee and Barnaby on site; Westbrook Row and the canal basin; Mason's portrait in dialogue; the site office and the contracts board ("No plots surveyed yet"); the crew at home in the Plumb Line at 20:00; the stitched region map. No page errors.
- Not verified: Firefox/Safari; GitHub Pages (deploys automatically on push); audio by ear (songs compile-tested only).

## Verification record — v0.3.0 (2026-10-13)

- `npm run check` — **79/79 tests passed** (3 new seam tests); validator 0 errors.
- `npm run smoke` (standalone `file://`) — 24/24 passed.
- Browser walkthrough: holding D from x 57.8 in Lanternside crossed into the Ober Fields at x 0.9 with no fade or jump (positions logged every 250 ms); the region map and minimap draw both maps stitched. No page errors.
- Not verified: Firefox/Safari; GitHub Pages (deploys automatically on push).

## Verification record — v0.2.0 (2026-10-13)

- `npm run check` — **76/76 tests passed** (incl. 14 in `character_moneybucks.test.mjs`); **validator 0 errors** (2 intentional warnings).
- `npm run smoke` (standalone `index.html` via `file://`) and `npm run smoke -- --dev` — **24/24 each**, no page errors or engine warnings.
- Scripted browser walkthrough of the new content, no errors: walking east into the Ober Fields through the road exit; the estate and fields by day; Sir Moneybucks's study, dialogue with the supplied portrait, the share register opened from dialogue, a full Ledger match; the relit lighthouse and canal slick at night.
- Ledger balance (simulation, 4–6k matches): naive play wins ~45%; reading tells wins ~50–53%, rising with Wits.
- Frame rate with 14 residents: ~57–60 fps at 1600×900 in headless software rendering.
- Not verified: audio by ear; Firefox/Safari; GitHub Pages hosting.

## Verification record — v0.1.1 (2026-10-13)

- `npm run check` — **62/62 tests passed; validator 0 errors.**
- `npm run smoke` against `file://…/index.html` with no server running — **24/24 passed**, including saves persisting across a page reload and Continue resuming the game.
- `npm run smoke -- --dev` against `dev.html` — passed.
- Not verified: GitHub Pages hosting itself (Pages must be enabled in the repository settings; the page uses only relative, self-contained content, so no differences are expected), Firefox/Safari `file://` behaviour.

## Verification record — v0.1.0 (2026-10-13)

Actually run in the development container (Node 22, Chromium via Playwright 1.56):

- `npm run check` — **59/59 tests passed; validator 0 errors** (2 intentional warnings: the Vane house and Collective Hall doors have no obtainable key).
- `npm run smoke` — **21/21 checks passed, no page errors, no engine warnings** (run 3× consecutively): title + version, new game, reading the letter, leaving the flat on foot, inventory/journal/map panels, dialogue with Mags and topic list, dialogue → shop hand-off and purchase, returning to the conversation, Ask-about box, wardrobe container, sleeping until morning, quick save/quick load restoring state, night lighting, pause menu version.
- Frame rate: steady ~60 fps at 1600×900, day and night, in headless software-rendered Chromium (rAF measured over 2 s each).
- ESLint (no-undef, unreachable code, duplicate keys): 0 errors.
- Screenshots reviewed by eye: title backdrop, flat, outdoors (day and night), café dialogue, shop, map with fog.

Bugs found and fixed by this verification: double-started vibrato oscillators (audio exception on every note), Esc closing a conversation instead of the shop opened from it, `notifyKind` logged as an unknown effect.

Not verified in this session:
- Audible quality of music/SFX (headless browser; synthesis code ran without errors, but no human listened).
- Firefox and Safari.
- Very long play sessions (multi-day real-time memory/performance).
- Touch devices (not supported yet).
