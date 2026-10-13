# 04 — Character Expansion

**Purpose:** Add depth to an existing character — dialogue, activities, relationships, mechanics — without changing who they are.

**Required input:** the character id and the requested direction (or "deepen generally").

**Read first:** the character's profile and dialogue files, `docs/CHARACTER_REGISTRY.md`, `docs/WORLD_BIBLE.md`, `docs/CONTENT_FORMAT.md`, related quests/events (`grep -rn "<npc id>" src/content`).

## Scope & constraints

- Stable traits stay stable; express change through moods, memories, relationships and new topics.
- Match the established voice (re-read 20+ existing lines first). Each character must stay distinct.
- Prefer conditional content that reacts to world state (quest stages, facts known, moods, relationships, time).
- New mechanics use shared systems; personality numbers you add must be read by something.
- Avoid repetition: add variants; use `repeat` for re-asked topics.

## Deliverables

New/updated topics, greetings, ask-about entries, barks, impulses or schedule tweaks, reactions, opinions; optional quest/event; tests for any new mechanic or condition-dependent branch; registry & world-bible updates for any new canon.

## Testing

`npm run check`; a test exercising each new conditional branch; play the conversation in-browser.

## Must not change without justification

The character's id, core personality numbers, existing quest outcomes that saves may reference, other characters' voices.

## Report

Standard completion report, plus a list of new canon facts introduced.
