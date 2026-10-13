# 06 — Quest & Minigame Development

**Purpose:** Create quests, jobs and activities that use existing systems and allow multiple approaches.

**Required input:** the quest idea or the character/area it should involve.

**Read first:** `src/content/quests.js`, `src/systems/quests.js`, `docs/CONTENT_FORMAT.md` (Quests, Conditions, Effects), the involved characters' files, `tests/quests.test.mjs`.

## Scope & constraints

- Define objectives as outcomes ("get inside", "find out", "decide who to tell"), not mandatory step lists.
- Provide at least two genuinely different approaches built on systems (social/persuasion, economic, stealth/ownership, tools/environment, investigation/knowledge, reputation). Each approach should have different consequences.
- Don't allow every approach everywhere — approaches must follow from the world (who has keys, who's watching, what's for sale).
- Failure should change the world and stay recoverable where reasonable.
- Hints appear only when the player knows the enabling fact (`hints: [{ if: { playerKnows } }]`).
- Minigames: build as UI panels over game state with deterministic, testable logic in a DOM-free module.

## Deliverables

Quest data (stages, journal text, objectives, hints, markers, triggers, outcomes, failures), dialogue hooks, any items/facts/events needed, tests for each approach and each outcome.

## Testing

`npm run check`; one test per approach and outcome (see `tests/quests.test.mjs` patterns); play-through in browser.

## Must not change without justification

Existing quest ids, stage ids and outcome ids (saves and conditions reference them).

## Report

Standard completion report, plus an approach/consequence table.
