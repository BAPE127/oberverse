# 02 — Project Onboarding

**Purpose:** Establish the true current state of a copy of the project before any work.

**Required input:** the project folder (and, if relevant, which copy is canonical).

**Read first:** `docs/prompt-bank/INDEX.md`, `README.md`, `oberverse-manifest.json`, `CHANGELOG.md`, `VERSION_HISTORY.md`, `docs/KNOWN_ISSUES.md`, `docs/TESTING.md`, `docs/DEVELOPMENT_WORKFLOW.md` ("Current state").

## Steps

1. Record the working directory, git branch/status and last commits (`git log --oneline -15`).
2. Read `VERSION`, `package.json`, the manifest and `src/core/version.js`; note any disagreement.
3. Identify the entry points: `index.html` (generated standalone build players open), `dev.html` → `src/main.js` (development). Confirm `npm run build` reproduces `index.html` and that it opens via `file://`.
4. Map the structure (`src/*`, `tools`, `tests`, `docs`, `assets`).
5. Run `npm run check` and, if Playwright is available, `npm run smoke`. Record exact results.
6. List implemented systems by reading code (not docs): world/maps, clock, NPC tiers, knowledge, memory, relationships, dialogue, quests, events, inventory/shops/containers, audio, saves, UI.
7. List characters, maps, quests, events from `src/content/index.js`.
8. Note the current save schema and migrations.
9. Compare docs to code; list every discrepancy.
10. Note incomplete features and TODOs (`grep -rn "TODO\|FIXME" src tools`).

## Constraints

Read-only unless the user asks for fixes. Do not "tidy" while onboarding.

## Deliverable

An onboarding report:

```
## Onboarding report
Directory / branch / last commit:
Version (all sources agree?):
Entry point & run command:
Structure summary:
Checks run and results:
Implemented & verified:
Implemented but unverified:
Incomplete / planned:
Known bugs (docs + newly found):
Save schema & migrations:
Content inventory (characters, maps, quests, events):
Doc/code discrepancies:
Recommended next task + prompt to use:
```
