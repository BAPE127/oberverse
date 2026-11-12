# Repository Audit — 2026-11-12

Made at v0.103.11 (commit `fbfa095`) before the development organisation was set up. A record of what was found; current state lives in `PROJECT_STATUS.md`.

## 1. What the repository is

A working, large browser game, not a prototype.

| | |
| --- | --- |
| Runtime | Plain JavaScript ES modules, Canvas 2D, DOM UI, Web Audio. No dependencies, no framework, no `node_modules` |
| Shipped as | One generated `index.html` (5.8 MB, committed), built by `tools/build.mjs` from `dev.html`, `styles.css`, `src/` |
| Source | 424 files in `src/`, about 84,000 lines, in 18 folders |
| Tests | 163 files, about 1,300 tests, Node's built-in runner; `tools/smoke-test.mjs` drives the built game in Playwright |
| Tools | build, content validator, smoke test, map printer, three economy audits, save-fixture maker, atlas generator, portrait embedder |
| Saves | `localStorage`, schema 1 with migrations, backups, export/import; fixtures in `tests/fixtures/` |
| Docs | 48 documents in `docs/`, 21 prompts in `docs/prompt-bank/`, 9 character sheets, 399 mock-up images (114 MB) |
| Git | Clean working tree. Shallow clone (50 commits). No tags. Two branches: this one and `claude/funny-mayer-52dll8` (GitHub Pages source) |
| Claude configuration | None: no `CLAUDE.md`, no `.claude/`, no agent definitions |

## 2. Architecture as found

Layered and consistently followed: browser-only code (`src/ui`, `src/engine`, `src/audio`, `src/main.js`) reads a single `Game` state object; simulation (`src/game`, `sim`, `systems`, `world`, `save`, `dialogue`, `content`) is DOM-free and tested in Node. Newer domains add a pure-rules folder each (`src/corp`, `aero`, `politics`, `war`, `battle`, `casino`) with a thin system in `src/systems`. Content is declarative. `ARCHITECTURE.md` describes this accurately for the foundation; it has no sections for politics, war or aerospace, which are covered by their own documents. The full map is now `SYSTEM_REGISTRY.md`.

## 3. Game systems

Functional (released, with tests): the home coast and Halvermouth maps, NPC simulation, dialogue, quests and events, inventory and shops, combat, vehicles and transit, police, homes, properties, casino, the corporate empire, banking and the exchange, shipping and shipbuilding, arms works, aerospace, farming, the world atlas, politics (complete), and the war company through strategic command, air and sea power.

Incomplete or planned (from `ROADMAP.md` and `KNOWN_ISSUES.md`): war destruction, government response and coup (v0.104.0); war migration and polish (v0.105.0); the Post-War Expansion (v0.106.0–v0.114.0); air superiority and bombing of structures; NPC driving; Halvermouth residents; farming seasons; corporate gaps in `CORPORATE_ACCEPTANCE.md`; a reload re-rolls the world's dice (cause not pinned down).

Duplicated or outdated code: none found at the level of this audit (directory and module survey, documents, test suite). No module-by-module code review was done.

## 4. Organisational problems found

| # | Problem | Action |
| --- | --- | --- |
| 1 | No Claude Code instructions or agents | Fixed in this change |
| 2 | No single "where are we" document; the handoff log in `DEVELOPMENT_WORKFLOW.md` stops at v0.51.0 | `PROJECT_STATUS.md` and `TASK_BOARD.md` added |
| 3 | `README.md` describes the game as of about v0.20 and contradicts itself (lists Combat, then says "Combat is not in this build"); its layout omits six source folders | Task R-1 |
| 4 | `KNOWN_ISSUES.md` is titled v0.80.0 but holds later entries; `PROJECT_OVERVIEW.md` scope and stage table are from v0.1.0 | Task R-2 |
| 5 | `oberverse-manifest.json` system map stops at about v0.20; `releaseDate` is 2026-10-13 | Task R-3 |
| 6 | The live site's branch is eleven commits behind (v0.103.5-era) | Owner's decision (O-2) |
| 7 | No git tags although the release procedure requires one per release | Task R-6 |
| 8 | Two validator warnings: doors `door_b_vane_house` and `door_b_collective` in Lanternside name key items that do not exist | Noted; may be intended as locked-for-now. Not changed |
| 9 | `docs/mockups/` is 114 MB of the repository | Left alone; they are the approved references |
| 10 | Proposal documents carry superseded release numbers | Already reconciled by `ROADMAP.md` sections 0 and 5; left as history |

## 5. Conflicting instructions and how they are resolved

- **Who does the work.** The prompt bank addresses one agent as architect, programmer, designer and tester. The owner's operating brief of 2026-11-12 sets a Fable-led organisation. `CLAUDE.md` says so; the prompts remain as task briefs and procedures.
- **Roadmap file name.** The brief's target structure names `docs/PROJECT_ROADMAP.md` and `docs/CHANGELOG.md`. Equivalents exist (`docs/ROADMAP.md`, root `CHANGELOG.md`) and many documents and a test read them, so they are reused, not duplicated (TD-16).
- **Pushing.** Earlier sessions pushed every commit and the README says every push redeploys the site. The brief forbids pushing without authorisation. The brief wins; noted in `CLAUDE.md`.
- **Fable agent file.** The brief asks for `fable-lead.md` and also that the lead must not be confused with a subordinate. The file exists as the main session's role (`claude --agent fable-lead`) and its description says not to delegate to it.

## 6. Verification

| Check | Result |
| --- | --- |
| `git status` before changes | Clean |
| `npm run check` before changes | Validator: 0 errors, 2 warnings. Tests: 1,318 of 1,318 passed, 0 failed (about 8 minutes) |
| Model aliases | `sonnet` → claude-sonnet-5-5, `haiku` → claude-haiku-5-5, `opus` → claude-opus-5-5, each confirmed by a one-line subagent call. `fable` is a documented alias for agent files in Claude Code 2.1.322; the lead session runs on it |
| Named agents (`sonnet-systems` etc.) | **Not verifiable in the creating session**: Claude Code does not load a `.claude/agents/` directory that did not exist when the session started. To be confirmed at the start of the next session |
| Smoke test | Not run (no game code changed) |
| Game code changed | None. Only `CLAUDE.md`, `.claude/`, and six new files in `docs/` |

## 7. What was deliberately not done

No source, test, tool or existing document was moved, renamed, rewritten or deleted. No `tests/` or `assets/` restructuring: both exist and work. No `.claude/settings.json`: making `fable-lead` the default agent for every session is the owner's choice.
