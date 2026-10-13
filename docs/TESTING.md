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
| `content.test.mjs` | Validator passes and catches injected errors, songs compile into whole bars, every major character has motif/voice/personality, **no network or external AI usage anywhere in `src/` or `index.html`**. |

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
