# Project Status

The handoff. Read this and `TASK_BOARD.md` at the start of a session. Keep it to one screen; history goes in `CHANGELOG.md`.

**Updated:** 2026-11-12

## Where the project stands

- **Version:** v0.104.0 (The Graphics Update), development channel, save schema 1.
- **Size:** about 84,000 lines of source in `src/` (18 folders), 163 test files, 48 system and design documents.
- **Released:** the home coast and Halvermouth, the living-world simulation, combat, quests and emergent events, the corporate empire (companies, group, bank, bonds, exchange, managers, headquarters), shipping, arms works, aerospace, farming, casino, the World Atlas, the complete Politics update (v0.93–v0.97), and the War update through Strategic Command (v0.98–v0.103.11).
- **In progress:** nothing. v0.104.0 put the world and the battles in 3D (three.js); the owner played it and asked for the fixes that are in the release (`RENDERING.md` 7.5).
- **Next on the roadmap:** v0.105.0 *War: Destruction, Government Response and Coup*, then v0.106.0 *War: Migration and Release*, then the Post-War Expansion (v0.107.0–v0.115.0). Every number moved up one when the Graphics Update took v0.104.0. See `ROADMAP.md` section 0.

## Last work

2026-11-13 — **v0.104.0, The Graphics Update** released on the working branch (`CHANGELOG.md`).

## Health

- `npm run check` on 2026-11-13: validator 0 errors (2 warnings), 1,404 of 1,404 tests. The full suite takes about 8 minutes.
- Smoke test (`npm run smoke`): 90 of 90 on the built `index.html` in 3D mode, 2026-11-13. Headless Chromium uses software WebGL (about 10 frames a second); nothing has been seen on a real GPU.
- Claude usage: the subscription's 5-hour limit stopped agents twice during the 3D work. Save a WIP commit before and after each agent; resume a stopped agent with SendMessage.
- Known issues: `KNOWN_ISSUES.md`. Its title still says v0.80.0 although it has later entries.

## Things a new session must know

- The live game on GitHub Pages is built from the branch `claude/funny-mayer-52dll8`. The owner had it fast-forwarded to v0.104.0 on 2026-11-13. (The audit's claim that it was eleven commits behind came from a stale local ref: it was already at v0.103.11.) Publishing is always the owner's call.
- The local clone is shallow (50 commits) and there are no git tags, although the release procedure calls for one per release.
- `README.md` ("What's in this build", project layout) and `PROJECT_OVERVIEW.md` (scope, stage table) describe the game as of about v0.20; `oberverse-manifest.json`'s system map likewise. Use `SYSTEM_REGISTRY.md`.
- The "Current state" log in `DEVELOPMENT_WORKFLOW.md` ends at v0.51.0. It is kept as art-pipeline notes; this file replaces it as the handoff.

## Recommended next assignment

1. The 3D defect list (`RENDERING.md` 7.6) by the owner's priority: decals and skid marks, the city below tower floors, sleepers on beds, battle effects sorted in 3D.
2. v0.105.0, War: destruction (walls blown open are now a 3D geometry job as well as a battle-rules one).
