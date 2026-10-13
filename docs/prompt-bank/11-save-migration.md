# 11 — Save Migration

**Purpose:** Change the save format without destroying anyone's progress.

**Required input:** the data change and why it is needed.

**Read first:** `docs/SAVE_FORMAT.md`, `src/save/*.js`, `Game.serialize`/`Game.loadState` in `src/game/game.js`, `tests/save.test.mjs`, `tests/fixtures/`.

## Steps

1. Identify the current schema (`SAVE_SCHEMA_VERSION`) and confirm fixtures exist for every older schema.
2. Prefer additive changes that need no migration (new optional fields with defaults in `loadState`/`validateSave`).
3. Otherwise: bump `SAVE_SCHEMA_VERSION` (+ manifest `saveSchemaVersion`), append `{ from, describe, up }` to `MIGRATIONS`. Never modify older migrations.
4. Make `up()` total: handle missing/odd fields from real-world saves; preserve everything it doesn't understand.
5. Extend `validateSave` for the new shape.
6. Add a new fixture for the *new* schema; keep old fixtures.
7. Test: every old fixture migrates, validates and loads with inventory, money, quests, relationships, memories, flags and discovered areas intact.

## Constraints

Never silently drop data. A non-migratable change is a MAJOR version bump and must keep the old loader path or a documented export tool.

## Deliverables

Migration, validation, fixtures, tests, `docs/SAVE_FORMAT.md` schema history, changelog + version history migration notes.

## Report

Standard completion report, plus a field-by-field mapping old → new and the fixtures tested.
