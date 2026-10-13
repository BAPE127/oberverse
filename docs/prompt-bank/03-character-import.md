# 03 — Character Import

**Purpose:** Turn a player-supplied character (image + description) into a functioning resident, via an adaptive interview first.

**Required input:** the character image(s) and whatever description the player offers.

**Read first:** `docs/CHARACTER_IMPORT.md` (the full procedure), `docs/WORLD_BIBLE.md`, `docs/CHARACTER_REGISTRY.md`, `docs/CONTENT_FORMAT.md`, `docs/templates/`, one existing character (`src/content/characters/mags.js` + `src/content/dialogue/mags.js`).

## Scope & constraints

- **Interview before implementing.** 3–5 targeted questions per round, 1–3 rounds; allow skip / free description / "invent it".
- Use the image only for visual facts. Never infer personality, history, beliefs, pronouns or behaviour from appearance.
- Ask whether the image may be stored in `assets/`.
- Present the design preview from `docs/CHARACTER_IMPORT.md` §3 and let the player correct it. Then build it — unless essential information is missing.
- Fit the character into the existing world; you decide placement, but respect the player's wishes and boundaries.
- Build mechanics from shared systems; add new condition/effect types only with tests and docs.
- Imported characters are protected from harm by default (see `docs/CHARACTER_IMPORT.md` → Protection rule). Write their `wrath.line` and `wrath.color`; never set `killable: true` unless the owner explicitly says so.
- Existing fictional characters: keep them recognisable; write original lines; no copyrighted scripts.

## Deliverables

- `src/content/characters/<name>.js`, `src/content/dialogue/<name>.js`, registered in `src/content/index.js`.
- Schedule (24 h), impulses, relationships both ways (edit existing residents' relationships/opinions), knowledge, gifts, reactions.
- Motif + voice; registry entries.
- Optional quest/event content.
- `tests/character_<name>.test.mjs` (greeting, a mechanic, schedule location at two times, save/load round trip).
- `docs/characters/<id>.md`, registry row, manifest `importedCharacters`, changelog; MINOR version bump if releasing.

## Testing

`npm run check`, `npm run smoke`, and play: meet them, use every topic, trigger their mechanic, save, reload.

## Must not change without justification

Other characters' IDs or core personalities; save schema (characters are added without migration); unrelated systems.

## Report

Standard completion report, plus: interview summary, what was supplied vs. invented, open questions for the player.
