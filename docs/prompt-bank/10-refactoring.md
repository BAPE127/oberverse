# 10 — Refactoring

**Purpose:** Improve structure, clarity or performance while preserving behaviour and compatibility.

**Required input:** the area and the motivation (duplication, size, performance, a planned feature that needs room).

**Read first:** `docs/ARCHITECTURE.md`, the modules involved and their tests.

## Constraints

- Behaviour-preserving. If behaviour must change, split it into a separate, documented change.
- Incremental: keep the project runnable after each step; commit in small steps.
- Keep the DOM-free boundary and the declarative content formats.
- Preserve every public method used by UI, content or tests (or update all callers in the same change).
- Saves must load identically (run `tests/save.test.mjs` and the fixtures).

## Deliverables

The refactor; updated architecture docs; no new features smuggled in.

## Testing

Full `npm run check` before and after (identical results); `npm run smoke`; for performance work, before/after measurements.

## Must not change without justification

Save format, content formats, IDs, `version.js` constants.

## Report

Standard completion report, plus a before/after structure description and any measured gains.
