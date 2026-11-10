# Handoff brief for an agentic workflow — Oberverse 2.5D concept study

Paste the "PROMPT" block into a new session/agent. Everything it needs is in this folder.

## State right now
- **Folder:** `mockups/iso25d/` (isolated; the game is untouched). Branch `claude/kind-rubin-3nafrm`, base commit `fbfa095` (v0.103.11).
- **Deliverables present:** `STUDY.md` (all eight deliverables), `out/*.png` (12 mock-ups at 1920×1080), the prototype renderer and the data exporter.
- **Not done / honest gaps:** (1) the Zomboid reference screenshots were never attached, so style-matching is unchecked; (2) there are no before/after screenshots of today's game for each location (`docs/mockups/v049-*.png`, `v048-*`, `v051-*` exist and are usable as "current look"); (3) Westbrook Lots, Mill Road Yards, Crown Quarter, Starling Flats and Hollowmoor have catalog entries but no mock-up; (4) rendering is blocky procedural geometry — an art pass is needed; (5) never run in a real GPU browser, only headless SwiftShader; (6) `npm run check` was not re-run (nothing in `src/` changed).

## How to reproduce
```bash
# 1. export real game data (headless, read-only; writes mockups/iso25d/data/*.json)
node mockups/iso25d/tools/dump-scenes.mjs                    # or pass map ids
# 2. render mock-ups with headless Chromium (needs global Playwright, as tools/smoke-test.mjs)
node mockups/iso25d/tools/shoot.mjs                          # all scenes -> out/
node mockups/iso25d/tools/shoot.mjs a_urban f_night --w=1920 --h=1080
# 3. interactive: serve the folder statically and open index.html?scene=a_urban
```
Software GL takes ~2–12 s per scene.

## Prototype map (all in `mockups/iso25d/src/`)
| File | Role |
| --- | --- |
| `scenes.js` | The 12 shot definitions (map, focus tile, span, time, weather, cut-away ids, labels, staged people/cars). **Edit here to add a mock-up.** |
| `scene.js` | Assembles a scene from dumped data; light presets (`TIMES`), camera (30° ortho), cut rule for tall buildings (`cutFront`, `cutHeight`) |
| `ground.js` | Tile grid → stepped mesh + painted texture (roads, kerbs, water, rain/snow variants) |
| `buildings.js` | Facade painter, roof kinds, shopfront kit, `buildCutaway` (room cut-away) |
| `props.js` | ~85 prop builders keyed by game prop `type` (others fall back to a box) |
| `actors.js` | `person(appearance, opts)` and `vehicle(model, opts)` |
| `dress.js` | Staged set dressing per scene (fences, platoon, aircraft) — **not in game data** |
| `overlay.js` | Weather particles, name tags, labels, red mock-up banner |
| `main.js` / `index.html` | Viewer (`?scene=id&w=&h=&px=`) |
| `tools/dump-scenes.mjs`, `tools/shoot.mjs` | Exporter (imports `src/content` + `Game`, read-only) and PNG renderer |
| `vendor/three.module.min.js` | three.js 0.160.0 (MIT) |

## Facts an agent must not get wrong
- Tile = 32 px (`TILE` in `src/core/util.js`); tile codes in `src/world/tiles.js`; a map is `rows[y][x]` chars.
- Interiors are laid over building footprints in world space (`src/world/interiors.js`); the building's `interior` field names the map; world offsets come from `Game.neighbors()`.
- Sim code must stay DOM-free (tests enforce). The renderer must read state only.
- Build: `npm run build` regenerates `index.html` (commit it); checks: `npm run check`, `npm run smoke`.
- Do **not** modify `src/`, `index.html`, saves, or assets in the study phase. Implementation needs the owner's explicit authorisation.
- Don't claim a mock-up uses game art — it does not.

## PROMPT
```
You are continuing a visual concept study for "The Oberverse" (repo bape127/oberverse, branch
claude/kind-rubin-3nafrm). Read mockups/iso25d/STUDY.md and mockups/iso25d/HANDOFF.md first.
Rules: implementation of a new renderer is NOT authorised; do not modify src/, index.html, assets,
saves, or tests. Work only inside mockups/iso25d/ and docs. Distinguish verified facts, proposals,
assumptions and open questions.

Tasks, in order:
1. If the owner has supplied Project Zomboid reference screenshots, compare them with out/*.png and
   list concrete style gaps (palette, wall height, roof fading, clutter density, lighting). Otherwise
   state that they are missing and stop that step.
2. Produce the missing mock-ups: Westbrook Lots (construction site), Mill Road Yards (port/foundry),
   Crown Quarter (government), Starling Flats (airfield). Add shots to src/scenes.js, run
   tools/dump-scenes.mjs and tools/shoot.mjs, inspect every PNG, fix visible defects
   (floating props, wrong labels, clipped buildings, black areas).
3. Create before/after pairs using the existing game screenshots in docs/mockups (v048/v049/v051) or
   fresh ones from `npm run smoke`, and add a contact sheet (out/contact.png) plus a short index.
4. Raise art quality where it is weakest: characters (more detail than boxes), tree/foliage, building
   facades, interior clutter. Keep it procedural and isolated.
5. Add a "performance budget" appendix: measure triangles, draw calls, light count per scene and
   propose chunking/instancing numbers.
6. Update STUDY.md; keep the red "not a game screenshot" labelling. Commit with clear messages and
   push to claude/kind-rubin-3nafrm. Do not open a pull request unless asked.
Finish by reporting: what changed, what is still missing, and the open decisions for the owner.
```
