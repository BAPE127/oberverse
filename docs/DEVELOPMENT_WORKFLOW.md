# Development Workflow

## Start of every session

1. Read `README.md`, `docs/PROJECT_OVERVIEW.md` and this file.
2. Check `VERSION`, `oberverse-manifest.json`, the top of `CHANGELOG.md` and `docs/KNOWN_ISSUES.md`.
3. Pick the prompt for your task from `docs/prompt-bank/INDEX.md`.
4. Inspect the actual files involved. Do not trust memory or older documentation over the code.
5. Run `npm run check` **before** changing anything, so you know what was already passing.
6. Plan the smallest safe change.

## Making changes

- Prefer targeted edits over rewrites. Never replace a working system with an incomplete one.
- Keep simulation code DOM-free (see `docs/ARCHITECTURE.md`).
- Express consequences as content effects/conditions when possible, not one-off code.
- New IDs are permanent: never rename an ID that may exist in a player's save. Deprecate instead.
- Update documentation in the same change as the code it describes.

## Verification before committing

```bash
npm run check   # content validator + all tests
npm run smoke   # browser smoke test (Playwright + Chromium) — screenshots in tools/out/
```

Also play the changed feature in a browser (`npm start`). Record what was actually verified in `docs/TESTING.md` when it changes, and never claim a check you did not run.

## Versioning (semantic)

`MAJOR.MINOR.PATCH`:
- **MAJOR** — incompatible changes to core architecture, save format (without migration) or established systems.
- **MINOR** — new backward-compatible features, systems or significant content (a new character, district, quest line).
- **PATCH** — bug fixes, balance and small corrections.

The version must agree in **five** places (enforced by `tests/version.test.mjs`): `VERSION`, `package.json`, `oberverse-manifest.json`, `src/core/version.js` (`GAME_VERSION`), and the newest entries of `CHANGELOG.md`, `VERSION_HISTORY.md` and `src/core/releaseNotes.js`.

`BUILD_CHANNEL` is `development` until a release passes the full procedure below; only then set it to `stable` (manifest `buildChannel` too).

## Release procedure

1. `npm run check` passes.
2. `npm run smoke` passes; review the screenshots.
3. Manually play: new game → leave flat → talk to all three residents → buy something → complete at least one quest → sleep → save → reload → continue.
4. Save/load across schema versions using fixtures in `tests/fixtures/`.
5. Validator reports no missing assets or broken references.
6. Version display agrees with the manifest (title, pause, About).
7. Update `CHANGELOG.md`, `VERSION_HISTORY.md`, `src/core/releaseNotes.js`.
8. Record known issues in `docs/KNOWN_ISSUES.md`.
9. Commit and tag (`git tag v0.x.y`). This is the recoverable checkpoint.

## Git

- Work on a feature branch; commit in small, described steps.
- Never force-push over someone else's history.
- Don't commit `tools/out/` (screenshots) or `node_modules/`.

## Handoff notes

If a session ends mid-task, append a dated entry to the "Current state" section below: what changed, what is half-done, what to do next, known risks.

## Current state

- **2026-10-13 — v0.1.0.** Foundation complete and verified (see `docs/TESTING.md`). Next recommended steps, in order:
  1. Import the first player-supplied character (Stage 5) using `docs/prompt-bank/03-character-import.md` when the player provides one.
  2. Optional combat + a nonviolent alternative (Stage 3), equipment slots.
  3. Progression (stat growth through activities).
  4. A second district map and more interiors (Stage 7).
