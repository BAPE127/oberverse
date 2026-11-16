# Project Status

The handoff. Read this and `TASK_BOARD.md` at the start of a session. Keep it to one screen; history goes in `CHANGELOG.md`.

**Updated:** 2026-11-12

## Where the project stands

- **Version:** v0.106.0 (War: Destruction, the Army and the Coup), development channel, save schema 1.
- **Size:** about 84,000 lines of source in `src/` (18 folders), 163 test files, 48 system and design documents.
- **Released:** the home coast and Halvermouth, the living-world simulation, combat, quests and emergent events, the corporate empire (companies, group, bank, bonds, exchange, managers, headquarters), shipping, arms works, aerospace, farming, casino, the World Atlas, the complete Politics update (v0.93–v0.97), and the War update through Strategic Command (v0.98–v0.103.11).
- **In progress:** **Special Operations** (owner, 2026-11-16: the roadmap is scratched). Built: Neumina's three levels in 3D with the view down through the drops. Designed, waiting for the owner: missions, hacking (the Splice), disguise and suspicion, the mission-run rule (`SPECIAL_OPERATIONS.md`).
- **Next:** the owner's answers to `SPECIAL_OPERATIONS.md` section 9, then v0.107.0 (Neumina's look, lobbies, crowds, the mission-run foundation and its contamination test) and v0.108.0 (the Splice, disguises, the first contract). The old roadmap is history.

## Last work

2026-11-15 — **v0.106.0, War: Destruction, the Army and the Coup** (`CHANGELOG.md`), built in the lead session on Opus while the Sonnet agents were on the weekly limit. Earlier the same day: v0.105.0.

## Health

- `npm run check` on 2026-11-13: validator 0 errors (2 warnings), 1,461 of 1,461 tests. The full suite takes about 8 minutes.
- Smoke test (`npm run smoke`): 91 of 91 on the built `index.html` in 3D mode, 2026-11-13. Headless Chromium uses software WebGL (about 10 frames a second); nothing has been seen on a real GPU.
- Claude usage: the subscription's 5-hour limit stopped agents twice during the 3D work. Save a WIP commit before and after each agent; resume a stopped agent with SendMessage.
- Known issues: `KNOWN_ISSUES.md`. Its title still says v0.80.0 although it has later entries.

## Things a new session must know

- The live game on GitHub Pages is built from the branch `claude/funny-mayer-52dll8`. The owner had it fast-forwarded to v0.104.0 on 2026-11-13. (The audit's claim that it was eleven commits behind came from a stale local ref: it was already at v0.103.11.) Publishing is always the owner's call.
- The local clone is shallow (50 commits) and there are no git tags, although the release procedure calls for one per release.
- `README.md` ("What's in this build", project layout) and `PROJECT_OVERVIEW.md` (scope, stage table) describe the game as of about v0.20; `oberverse-manifest.json`'s system map likewise. Use `SYSTEM_REGISTRY.md`.
- The "Current state" log in `DEVELOPMENT_WORKFLOW.md` ends at v0.51.0. It is kept as art-pipeline notes; this file replaces it as the handoff.

## Recommended next assignment

1. The owner answers `SPECIAL_OPERATIONS.md` §9 (who hands out missions, whether a mission takes Sund time, lethal or not, which contract first) and decides whether v0.106.0 is published to the live site.
2. Build the mission-run foundation (template/instance, own clock and RNG, run-local people, extraction once, save mid-run) with the contamination test written first.
3. The Splice, disguise and suspicion, and the first contract end to end.
