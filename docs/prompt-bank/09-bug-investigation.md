# 09 — Bug Investigation

**Purpose:** Reproduce, diagnose, fix and verify one specific defect.

**Required input:** the symptom, steps to reproduce if known, version, and ideally an exported save (`.json`).

**Read first:** `docs/KNOWN_ISSUES.md`, `docs/ARCHITECTURE.md`, the code paths named by the symptom.

## Steps

1. Reproduce. Prefer a headless test (`tests/helpers.mjs`: `newGame`, `run`, `setTime`, `besideNpc`). For visual/UI bugs, use the browser (`npm run dev` for live source; reproduce in the built `index.html` too) or extend `tools/smoke-test.mjs`. For save bugs, load the provided save through `SaveManager.parse`.
2. Write a failing test that captures the bug.
3. Find the root cause (not just the symptom). Check whether other callers share it.
4. Fix minimally.
5. Run the new test and the full suite; play the scenario.

## Constraints

No unrelated refactors. Don't weaken or delete tests to get green. If the fix changes save data, use prompt 11.

## Deliverables

Fix + regression test; `docs/KNOWN_ISSUES.md` updated (remove if fixed, or document limits); changelog entry under Fixed; PATCH bump at release.

## Report

Standard completion report, plus: reproduction steps, root cause, why the fix is correct, regression test name.
