# Architecture rules

Full description: `docs/ARCHITECTURE.md`. Decisions and their reasons: `docs/TECHNICAL_DECISIONS.md`.

- Plain JavaScript ES modules, **no dependencies**, no framework, no network in gameplay. Players open one generated `index.html`.
- `index.html` is **generated** by `npm run build` from `dev.html`, `styles.css` and `src/`. Never edit it by hand. `tests/build.test.mjs` fails when it is stale.
- Simulation is DOM-free: `src/game`, `src/sim`, `src/systems`, `src/dialogue`, `src/world`, `src/save`, `src/content`, and the pure domain modules `src/corp`, `src/aero`, `src/politics`, `src/war`, `src/battle`, `src/casino` must run in Node. Only `src/ui`, `src/engine`, `src/audio` and `src/main.js` touch the browser.
- All state lives on the `Game` object (`src/game/game.js`). Systems talk through the event bus (`game.bus`).
- Content is declarative: requirements are conditions, consequences are effects (`docs/CONTENT_FORMAT.md`). The only interpreters are `src/sim/conditions.js` and `src/game/effects.js`.
- Money moves only through the ledger and payment layer (`src/corp/ledger.js`, `src/systems/corporate.js`). Wars and embargoes have one writer (politics diplomacy).
- IDs are permanent. Never rename one that can exist in a save; deprecate instead.
- A save-format change needs a migration (`src/save/migrations.js`), a fixture (`tests/fixtures/`) and an entry in `docs/SAVE_FORMAT.md`. Never edit past migrations.
- Simulate by relevance: physical tier near the player, abstract tier elsewhere. Do not add per-frame work for off-screen things.
- No rewrite of a working system without the owner's approval and an entry in `docs/TECHNICAL_DECISIONS.md`.
