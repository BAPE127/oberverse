# Project Status

The handoff. Read this and `TASK_BOARD.md` at the start of a session. Keep it to one screen; history goes in `CHANGELOG.md`.

**Updated:** 2026-11-12

## Where the project stands

- **Version:** v0.103.11, development channel, save schema 1.
- **Size:** about 84,000 lines of source in `src/` (18 folders), 163 test files, 48 system and design documents.
- **Released:** the home coast and Halvermouth, the living-world simulation, combat, quests and emergent events, the corporate empire (companies, group, bank, bonds, exchange, managers, headquarters), shipping, arms works, aerospace, farming, casino, the World Atlas, the complete Politics update (v0.93–v0.97), and the War update through Strategic Command (v0.98–v0.103.11).
- **In progress:** nothing. The tree is clean.
- **Next on the roadmap:** v0.104.0 *War: Destruction, Government Response and Coup*, then v0.105.0 *War: Migration and Release*, then the Post-War Expansion (v0.106.0–v0.114.0). See `ROADMAP.md` section 0.

## Last work

2026-11-12 — **Repository initialisation** (no game code changed). Audit (`REPOSITORY_AUDIT.md`); `CLAUDE.md`; ten agent definitions in `.claude/agents/`; five rule files in `.claude/rules/`; new `PROJECT_STATUS.md`, `TASK_BOARD.md`, `SYSTEM_REGISTRY.md`, `TECHNICAL_DECISIONS.md`, `GAME_DESIGN.md`.

## Health

- `npm run check` on 2026-11-12: validator 0 errors (2 warnings), 1,318 of 1,318 tests passed. The full suite takes about 8 minutes.
- Smoke test (`npm run smoke`): not run in the initialisation session.
- Known issues: `KNOWN_ISSUES.md`. Its title still says v0.80.0 although it has later entries.

## Things a new session must know

- The live game on GitHub Pages is built from the branch `claude/funny-mayer-52dll8`, which was at v0.103.5-era commit `a48d4d7` on 2026-11-12: eleven commits behind this work. Publishing is the owner's call.
- The local clone is shallow (50 commits) and there are no git tags, although the release procedure calls for one per release.
- `README.md` ("What's in this build", project layout) and `PROJECT_OVERVIEW.md` (scope, stage table) describe the game as of about v0.20; `oberverse-manifest.json`'s system map likewise. Use `SYSTEM_REGISTRY.md`.
- The "Current state" log in `DEVELOPMENT_WORKFLOW.md` ends at v0.51.0. It is kept as art-pipeline notes; this file replaces it as the handoff.

## Recommended next assignment

v0.104.0, starting with stage 12a (destruction in battles: walls blown open, rubble, trenches destructible per tile; owner's decisions in `ROADMAP.md` sections 4 and 6). Before it, the owner may want the small documentation fixes on the task board done.
