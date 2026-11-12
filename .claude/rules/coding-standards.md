# Coding standards

- Match the file you are in: ES modules, 2-space indent, single quotes, semicolons, named exports, small pure functions where possible.
- Prefer a targeted edit to a rewrite. Do not reformat code you are not changing.
- Pure rules go in the domain folder (`src/corp`, `src/war`, `src/aero`, `src/politics`…); the thin system that attaches them to `Game` goes in `src/systems`; data goes in `src/content`; screens go in `src/ui`.
- Tunable numbers belong in content files (income in `src/content/income.js`), not scattered in code.
- Randomness uses the game's seeded RNG (`src/core/rng.js`), never `Math.random()` in simulation code. Reading state must not advance the dice.
- New UI uses the CSS variables in `styles.css`; no hard-coded colours.
- Comments say why, not what. Player-facing text is plain, warm and dry; no placeholder text ships.
- No new dependencies, build steps or generated files without Fable's decision recorded in `docs/TECHNICAL_DECISIONS.md`.
