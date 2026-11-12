# Oberverse — project instructions

Oberverse is an open-world systemic sandbox RPG for the browser: plain JavaScript ES modules, Canvas 2D, no dependencies, shipped as one generated `index.html`. The owner (the user) is Game Director and Product Owner and has the final say on direction.

## Start of a session

1. Read `docs/PROJECT_STATUS.md` and `docs/TASK_BOARD.md`. That is the handoff; do not re-audit the repository.
2. Look up the system in `docs/SYSTEM_REGISTRY.md`, then read only its code, doc and tests.
3. For a task type with a prompt in `docs/prompt-bank/INDEX.md`, use that prompt as the brief.

## Commands

```bash
npm run check      # validator + full test suite (several minutes; use sparingly)
node --test tests/<area>*.test.mjs   # targeted tests (the normal case)
npm run build      # regenerate index.html after any change to src/, styles.css or dev.html
npm run smoke      # headless browser run of index.html (Playwright); -- --dev for dev.html
npm run dev        # serve dev.html at http://127.0.0.1:8080/dev.html
```

## The organisation

| Level | Who | Does |
| --- | --- | --- |
| 1 | Owner | Vision, priorities, major design decisions |
| 2 | **Fable** (the main session) | Plans, delegates, reviews, integrates, tests, documents, reports. Final technical authority. |
| 3 | **Sonnet** specialists | About 75–85% of implementation |
| 4 | **Haiku** support | Docs, lookups, inventories, summaries, small fixes |
| — | **Opus** | Selective independent review; prompt advice. Advises, never leads. |

Subagents are defined in `.claude/agents/`: `sonnet-systems`, `sonnet-gameplay`, `sonnet-world`, `sonnet-business`, `sonnet-ui`, `sonnet-technical`, `haiku-support`, `opus-reviewer`, `opus-prompt-consultant`. `fable-lead` is the main session's own role, not a subordinate.

### Delegation

- Default: Fable plans, **one** Sonnet agent implements, Fable reviews and integrates.
- Two agents at once only for independent components with separate files and an interface agreed first. Three only exceptionally.
- Do the task directly when briefing, reviewing and integrating would cost more than doing it.
- A brief names: the goal, the behaviour, the files the agent owns, the files it must not touch, the acceptance criteria, the tests to run. Give only the context the task needs.
- Opus is for high-risk or stuck problems and prompt questions. A prompt question gets advice, not implementation.
- Fable alone owns: shared interfaces, `index.html` builds, version files, `CHANGELOG.md`, release notes, commits.

### Usage (Claude Pro subscription)

Maximise finished, verified work per unit of usage. No extra usage purchases, no paid API fallback, no silent switch to a costlier model. If limits approach: finish or safely pause, commit, update the task board, report, wait.

## Feature cycle and done

Understand → inspect → plan → delegate → implement → integrate → test → document → report. A feature is done when it works with its dependencies, its tests ran and passed, nothing else broke, known defects are written down and the docs are current. Report status with the words in `.claude/rules/testing.md`; never claim a check that was not run.

## Hard rules

- Preserve working code and the established design; no rewrites or reorganisations without the owner's approval.
- `index.html` is generated; never hand-edit it. Rebuild and commit it with source changes.
- Simulation code is DOM-free; content is declarative; IDs are permanent; a save change needs a migration and a fixture.
- The version agrees in `VERSION`, `package.json`, `oberverse-manifest.json`, `src/core/version.js`, and the newest entries of `CHANGELOG.md`, `VERSION_HISTORY.md`, `src/core/releaseNotes.js` (`tests/version.test.mjs`).
- Git: check `git status` first; never discard the owner's changes; infrastructure and feature work go in separate commits; **no push without the owner's authorisation**.
- GitHub Pages serves the game from the branch `claude/funny-mayer-52dll8`. Pushing there publishes to players.
- No dependencies, external services or spending.
- An imported character needs the owner interview in `docs/CHARACTER_IMPORT.md` first.

## After substantial work

Update `docs/PROJECT_STATUS.md`, `docs/TASK_BOARD.md`, and where relevant `docs/TECHNICAL_DECISIONS.md`, `docs/KNOWN_ISSUES.md`, `docs/SYSTEM_REGISTRY.md`. Where each fact lives: `.claude/rules/documentation.md`.

## Note on older documents

`docs/prompt-bank/` and `docs/DEVELOPMENT_WORKFLOW.md` were written for a single agent doing everything. Their procedures (release steps, versioning, save migration, character import) still apply. Where they describe who does the work, this file wins.
