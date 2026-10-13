# 07 — NPC Simulation

**Purpose:** Extend schedules, decision-making, memory, relationships, knowledge propagation and emergent events.

**Required input:** the behaviour to add or change.

**Read first:** `docs/ARCHITECTURE.md` (NPC simulation, knowledge), `src/sim/*.js`, `src/systems/eventDirector.js`, `src/content/events.js`, `tests/simulation.test.mjs`, `tests/events.test.mjs`.

## Scope & constraints

- Both tiers (physical and abstract) must behave consistently; time skips must keep schedules, quest timers and events in agreement.
- No omniscience: information moves only through defined channels.
- Randomness only through `game.rng`, inside believable personality limits.
- Keep memory bounded; keep per-frame work small (abstract tier runs per game minute).
- Personality fields you introduce must change behaviour.

## Deliverables

Code and/or content changes; documentation of any new decision factors in `docs/ARCHITECTURE.md`; event templates with follow-ups for chains.

## Testing

Headless multi-day simulations with fixed seeds (assert locations/activities at times, information spread, event chains). Re-run all existing simulation tests. Check performance: a 3-day `run()` in tests should stay fast.

## Must not change without justification

`Knowledge.learn` semantics (fact vs rumour), memory caps without a save review, schedule format, the meaning of existing personality numbers.

## Report

Standard completion report, plus seeds used and observed behaviour summaries.
