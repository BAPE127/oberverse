# 05 — World Expansion

**Purpose:** Add locations — districts, interiors, props and environmental interactions — that serve gameplay.

**Required input:** what to add (or "the next sensible area"), plus any constraints.

**Read first:** `docs/WORLD_BIBLE.md`, `docs/CONTENT_FORMAT.md` (Maps), `src/content/maps/*.js`, `src/world/tiles.js`, `src/content/props.js`, `src/engine/drawWorld.js` (prop drawing).

## Scope & constraints

- Every significant location needs a purpose: home/work, service, quest/activity, resource, social space, connection, or emergent-event opportunity.
- Compact and dense beats large and empty.
- New interiors: `roomTiles()`, a doorway back to the outdoor spot, `entry` spot, music + ambience ids that exist.
- Doors: lock with `key`, `owners`, `hours`, `trespass` as appropriate.
- New prop types need a draw case in `drawWorld.js` (or accept the generic box) and a `PROP_TYPES` entry.
- New interaction kinds go in `Game.interact` + validator `INTERACT_KINDS` + docs + tests.
- Keep existing spot names stable (schedules reference them).

## Deliverables

Map data, registration in `src/content/index.js`, areas for discovery, spots for NPC use, props with interactions, World Bible update, map preview checked (`npm run map -- <id>`).

## Testing

`npm run check` (validator checks door targets, spot walkability, schedule reachability); a test that the player can walk in and out; screenshot via `npm run smoke` or manual play.

## Must not change without justification

Existing map ids, spot names, door ids, area ids (saves store discovered areas).

## Report

Standard completion report, plus a short description of each new place and its purpose.
