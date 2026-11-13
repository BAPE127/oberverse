# Project Status

The handoff. Read this and `TASK_BOARD.md` at the start of a session. Keep it to one screen; history goes in `CHANGELOG.md`.

**Updated:** 2026-11-12

## Where the project stands

- **Version:** v0.103.11, development channel, save schema 1.
- **Size:** about 84,000 lines of source in `src/` (18 folders), 163 test files, 48 system and design documents.
- **Released:** the home coast and Halvermouth, the living-world simulation, combat, quests and emergent events, the corporate empire (companies, group, bank, bonds, exchange, managers, headquarters), shipping, arms works, aerospace, farming, casino, the World Atlas, the complete Politics update (v0.93–v0.97), and the War update through Strategic Command (v0.98–v0.103.11).
- **In progress:** the **3D view** (three.js; owner's decision of 2026-11-12, replacing the Canvas 2D isometric view built earlier that day, which is now the fallback). Foundation, all props, vehicles and machines are built and tested (`RENDERING.md` 7.4); battles in 3D and the final optimise/review remain. Unreleased: no version number set.
- **Next on the roadmap:** v0.104.0 *War: Destruction, Government Response and Coup*, then v0.105.0 *War: Migration and Release*, then the Post-War Expansion (v0.106.0–v0.114.0). See `ROADMAP.md` section 0.

## Last work

2026-11-13 — **3D view**, phases 3D-1 to 3D-3 (see `CHANGELOG.md` Unreleased). 2026-11-12: the Canvas 2D isometric view; repository initialisation.

## Health

- `npm run check` on 2026-11-13: validator 0 errors (2 warnings), 1,386 of 1,386 tests. The full suite takes about 8 minutes.
- Smoke test (`npm run smoke`): 89 of 89 on the built `index.html` in 3D mode, 2026-11-13. Headless Chromium uses software WebGL (about 10 frames a second); nothing has been seen on a real GPU.
- Claude usage: the subscription's 5-hour limit stopped agents twice during the 3D work. Save a WIP commit before and after each agent; resume a stopped agent with SendMessage.
- Known issues: `KNOWN_ISSUES.md`. Its title still says v0.80.0 although it has later entries.

## Things a new session must know

- The live game on GitHub Pages is built from the branch `claude/funny-mayer-52dll8`, which was at v0.103.5-era commit `a48d4d7` on 2026-11-12: eleven commits behind this work. Publishing is the owner's call.
- The local clone is shallow (50 commits) and there are no git tags, although the release procedure calls for one per release.
- `README.md` ("What's in this build", project layout) and `PROJECT_OVERVIEW.md` (scope, stage table) describe the game as of about v0.20; `oberverse-manifest.json`'s system map likewise. Use `SYSTEM_REGISTRY.md`.
- The "Current state" log in `DEVELOPMENT_WORKFLOW.md` ends at v0.51.0. It is kept as art-pipeline notes; this file replaces it as the handoff.

## Recommended next assignment

1. The owner plays the build on a real machine and says what looks wrong (nothing has been seen on a real GPU).
2. 3D-4: the battle screen in 3D on the shared `engine3d` modules.
3. 3D-5: the defects in `RENDERING.md` 7.5, real-GPU frame time, Opus review; then the owner sets the version and the release is cut.
