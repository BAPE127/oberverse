# Project Status

The handoff. Read this and `TASK_BOARD.md` at the start of a session. Keep it to one screen; history goes in `CHANGELOG.md`.

**Updated:** 2026-11-12

## Where the project stands

- **Version:** v0.103.11, development channel, save schema 1.
- **Size:** about 84,000 lines of source in `src/` (18 folders), 163 test files, 48 system and design documents.
- **Released:** the home coast and Halvermouth, the living-world simulation, combat, quests and emergent events, the corporate empire (companies, group, bank, bonds, exchange, managers, headquarters), shipping, arms works, aerospace, farming, casino, the World Atlas, the complete Politics update (v0.93–v0.97), and the War update through Strategic Command (v0.98–v0.103.11).
- **In progress:** the **isometric view** (owner's priority, 2026-11-12). Phases 2, 3, 5 and 6 of `RENDERING.md` are built and tested (world, buildings, vehicles, combat, Wrath, battles); phase 4 (people and prop art) and phase 7 (optimise, final review) remain. Unreleased: no version number set.
- **Next on the roadmap:** v0.104.0 *War: Destruction, Government Response and Coup*, then v0.105.0 *War: Migration and Release*, then the Post-War Expansion (v0.106.0–v0.114.0). See `ROADMAP.md` section 0.

## Last work

2026-11-12 — **Isometric view**, phases 2, 3, 5, 6 (see `CHANGELOG.md` Unreleased, `RENDERING.md` section 6). Earlier the same day: repository initialisation (`REPOSITORY_AUDIT.md`).

## Health

- `npm run check` on 2026-11-12: after the isometric work, validator 0 errors (2 warnings), 1,348 of 1,348 tests passed. The full suite takes about 8 minutes.
- Smoke test (`npm run smoke`): 76 of 76 on the built `index.html`, 2026-11-12.
- Known issues: `KNOWN_ISSUES.md`. Its title still says v0.80.0 although it has later entries.

## Things a new session must know

- The live game on GitHub Pages is built from the branch `claude/funny-mayer-52dll8`, which was at v0.103.5-era commit `a48d4d7` on 2026-11-12: eleven commits behind this work. Publishing is the owner's call.
- The local clone is shallow (50 commits) and there are no git tags, although the release procedure calls for one per release.
- `README.md` ("What's in this build", project layout) and `PROJECT_OVERVIEW.md` (scope, stage table) describe the game as of about v0.20; `oberverse-manifest.json`'s system map likewise. Use `SYSTEM_REGISTRY.md`.
- The "Current state" log in `DEVELOPMENT_WORKFLOW.md` ends at v0.51.0. It is kept as art-pipeline notes; this file replaces it as the handoff.

## Recommended next assignment

Isometric view phase 4 (diagonal walking sprites; boxy and linear props from `RENDERING_PROPS.md`; pitched roofs, the lighthouse), then phase 7 (frame time on a real GPU, battle open time, particle sorting, Opus final review). The owner sets the version number for the release. v0.104.0 (War: destruction and coup) follows.
