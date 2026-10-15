# Prompt 19 — Extend the living world

Use when adding residents, homes, jobs, police officers or beats, bus lines or stops, errand places or meet-ups, or signature cars — or when building NPC driving (the one part of the world-simulation brief not done yet).

Read first: `docs/WORLD_SIMULATION.md`, `src/content/life.js`, `src/sim/npcSystem.js`, `src/sim/npcTransit.js`, `src/sim/errands.js`, `src/systems/transit.js`, `src/systems/police.js`, `src/content/transit.js`, `src/content/signatureCars.js`, `tests/worldsim.test.mjs`, `tests/livingworld3.test.mjs`.

Rules:
- Every persistent character gets a home (`LIFE`) and a sleep block in it, or a justified `LIFE_EXCEPTIONS` entry. Never leave anyone homeless to save time.
- Behaviour is data: schedules, occupations, beats, lines, errands. Don't script a character around the simulation; add an exception with explicit states if you truly must.
- Nothing teleports in view. Off-screen work runs on the same clock with the same decisions, and is saved.
- Anything chosen "at random" for a character is a hash of who/what/day, never the shared RNG (other systems' tests depend on its sequence).
- Police know only what an officer sees or a witness tells.
- Migrations are idempotent and never hand the player anything.
- `npm run check` must stay green; add a test for every new behaviour, and extend the validator for every new kind of data.
