# 14 — Emergency Recovery

**Purpose:** Restore a working state after corruption, a failed change, or an interrupted session.

**Required input:** what is broken (symptoms), what was being attempted, any error output.

**Read first:** `docs/DEVELOPMENT_WORKFLOW.md` ("Current state" handoff notes), `git log`, `git status`, `docs/KNOWN_ISSUES.md`.

## Steps

1. **Stop and preserve.** Before touching anything: `git stash` or copy the working tree to a dated backup folder; export any player saves.
2. Find the last known-good point: tags (`git tag`), commits whose message says checks passed, `docs/TESTING.md` records.
3. Diagnose on a branch: run `npm run check` at the broken state and at the last good commit; bisect if needed (`git bisect`).
4. Choose the least destructive fix: complete the half-done change, revert the specific bad commit (`git revert`), or restore specific files — not a blanket reset.
5. Player saves: never delete. Use `.bak` slots, `SaveManager.parse` to see validation errors, and migrations/repairs rather than editing JSON by hand where possible.
6. Verify: check, smoke, play.
7. Document what happened in the handoff notes and `docs/KNOWN_ISSUES.md`.

## Constraints

No force-push over shared history. No deleting work you haven't preserved.

## Deliverables

A working project, a preserved copy of the broken state, an incident note.

## Report

Standard completion report, plus: cause, what was preserved where, what was restored, data at risk.
