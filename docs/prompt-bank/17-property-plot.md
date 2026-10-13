# 17 — Add a Property Plot

**Purpose:** Create a surveyed plot the player can pay Mason's Os to build on (home, rental flats or shopfront).

**Required input:** where (map and rough position), a plot name, which blueprints are allowed, and the land price — or "your choice" for any of these. Only create plots when the project owner asks.

**Read first:** `docs/PROPERTIES.md`; `src/content/properties.js`; the target map file; `npm run map -- <mapId>` output for clear ground.

## Steps

1. Pick a footprint of clear ground (no buildings, doors, water or walls; at least 5×4 tiles) away from roads and NPC routes. The door goes on the footprint's bottom row, with a walkable `outside` tile directly below it.
2. Add one entry to `PLOTS` in `src/content/properties.js` (see the shape documented there). Remove or move any decorative survey stakes or trees under the footprint in the map file.
3. If the plot is not in Westbrook, consider a second crew `build_*` impulse spot near it (the crew currently go to `westbrook:survey`).
4. `npm run validate` (checks the footprint, door, outside tile and blueprints), then `npm run check`, `npm run build`, `npm run smoke`.
5. In a browser, commission a build with plenty of money, get the permit from Osric, skip three evenings and check the finished building, its door and its interior.

## Must not change

Blueprint prices, the permit flow or save state shape (unless asked). Existing plots' ids (saves reference them).

## Docs to update

`docs/PROPERTIES.md` (list of plots), `docs/WORLD_BIBLE.md`, `CHANGELOG.md`, release notes and version (a MINOR bump if it is new playable content).

## Report

Standard completion report, including a screenshot description of the finished building.
