# 15 — Independent Technical Audit

**Purpose:** Evaluate architecture, correctness, maintainability, testing and documentation accuracy — and report, not fix (unless asked).

**Required input:** scope (whole project or areas) and depth.

**Read first:** everything in the INDEX "read first" list, then the code.

## Checklist

- **Architecture:** DOM-free boundary respected? Systems coupled only through the bus/game API? Any content logic hard-coded in systems?
- **Correctness:** run `npm run check`, `npm run smoke`; probe edge cases (midnight-wrapping schedules, time skips, locked doors at closing time, theft with/without witnesses, rumours vs facts, save/load mid-travel).
- **Simulation integrity:** can the clock, schedules, quest timers and events disagree? Any omniscience leaks (NPC knowing something without a channel)?
- **Persistence:** every piece of state that matters is serialised; unknown fields preserved; migrations and fixtures present.
- **Performance:** frame time with all NPCs; allocation in hot loops; abstract tier cost.
- **Content:** validator coverage; dead IDs; unreachable dialogue topics; repetition.
- **Docs accuracy:** does every claim in README/docs match the code? Are tests described in `docs/TESTING.md` real?
- **Security/privacy:** no network calls; safe handling of imported save files (no `eval`, no HTML injection of save data).
- **Accessibility/UX:** readable text, keyboard-only play, focus handling.

## Constraints

Evidence for every finding (file:line, command output). Separate verified findings from suspicions.

## Deliverable

```
## Audit report
Scope / commit audited:
Checks run (results):
Findings (severity: critical/high/medium/low, evidence, suggested fix):
Doc inaccuracies:
Strengths worth keeping:
Recommended priorities:
```
