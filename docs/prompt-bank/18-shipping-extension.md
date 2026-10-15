# Prompt 18 — Extend the shipping business

Use when adding ships, ports, contract types, or the later shipping stages (arms exports by your own fleet, piracy, warships, missions, the shipyard).

Read first: `docs/LOGISTICS.md`, `docs/SHIPS.md`, `docs/PORTS.md`, `docs/SHIPBUILDING.md`, `src/systems/piracy.js`, `src/systems/missions.js`, `src/systems/shipyard.js`, `src/content/logistics.js`, `src/systems/logistics.js`, `src/world/seaRoutes.js`, `tests/logistics.test.mjs`.

Rules:
- All numbers go in `src/content/logistics.js`. Ids (ports, ships, clients) are permanent.
- Money moves only through `Logistics.spend/earn` (they keep the ledger), and only on a state transition that can't happen twice.
- Never animate or re-roll a voyage: anything random is rolled at departure and stored on the voyage; position comes from `Logistics.position` and the game clock.
- One fleet: a future combat or mission system reads and writes the same vessel records — no parallel fleet state.
- New hulls and parts: keep the class rules in `HULLS[...].requires`; the validator proves each hull can be fitted out. Custom ships are recomputed from content — changing a part's numbers changes every ship built with it (by design).
- Playable combat (future): read `docs/LOGISTICS.md#towards-playable-naval-combat-future` first; an encounter must resolve through `Logistics.pirates` (or a sibling) exactly once.
- New ports must be coastal and reachable (the content test checks every route). New vessel states must be added to `TRANSITIONS`.
- Add tests to `tests/logistics.test.mjs` (or a new file) for every rule you add; run `npm run check` and the smoke tests; update the docs above.
