# Documentation rules

One home per kind of fact. Update the doc in the same change as the code.

| Fact | Home |
| --- | --- |
| Where the project stands now, what is next | `docs/PROJECT_STATUS.md` |
| Assignments in flight, backlog, blockers | `docs/TASK_BOARD.md` |
| Release plan and the owner's design decisions on it | `docs/ROADMAP.md` |
| Vision and design pillars | `docs/GAME_DESIGN.md` (index), `docs/PROJECT_OVERVIEW.md`, `docs/WORLD_BIBLE.md` |
| Which system lives where, its doc and tests | `docs/SYSTEM_REGISTRY.md` |
| How the code is built | `docs/ARCHITECTURE.md` |
| Why a technical choice was made | `docs/TECHNICAL_DECISIONS.md` |
| How one system works | its own doc (`docs/WAR.md`, `docs/CORPORATE.md`, …) |
| What changed, per version | `CHANGELOG.md` (root), `VERSION_HISTORY.md`, `src/core/releaseNotes.js` |
| What is missing or wrong | `docs/KNOWN_ISSUES.md` |
| What was actually tested | `docs/TESTING.md` |

- Never delete historical documentation (proposals, audits, old verification records). Mark it superseded and point to the current home.
- When two documents disagree, the code wins, then the newer dated owner decision; fix the stale one or note it in `docs/TASK_BOARD.md`.
- Keep entries short. No session diaries; the handoff is `PROJECT_STATUS.md` and `TASK_BOARD.md`.
