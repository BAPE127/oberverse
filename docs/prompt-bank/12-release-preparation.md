# 12 — Release Preparation

**Purpose:** Turn the current state into a versioned, documented, recoverable release.

**Required input:** the target version (or ask: patch/minor/major per `docs/DEVELOPMENT_WORKFLOW.md`).

**Read first:** `docs/DEVELOPMENT_WORKFLOW.md` (Versioning, Release procedure), `CHANGELOG.md`, `VERSION_HISTORY.md`, `docs/KNOWN_ISSUES.md`, `docs/TESTING.md`.

## Steps

1. `git status` clean; note the commit.
2. `npm run check` and `npm run smoke` — record exact results.
3. Manual play-through (see workflow) — record what you actually did.
4. Save/load: current saves and every fixture.
5. Validator: no missing assets/broken references.
6. Update the version in: `VERSION`, `package.json`, `oberverse-manifest.json` (+`releaseDate`), `src/core/version.js`; release notes in `src/core/releaseNotes.js`; `CHANGELOG.md` (move Unreleased → version); `VERSION_HISTORY.md` row + notes.
7. Decide channel: `development` unless every check passed and the user wants stable.
8. Update `docs/TESTING.md` verification record and `docs/KNOWN_ISSUES.md`.
9. Re-run `npm run check` (version tests).
10. Commit "Release vX.Y.Z" and tag `vX.Y.Z`.

## Constraints

Do not mark stable with failing or unrun checks. Do not include unrelated changes.

## Deliverables

Version bump everywhere, docs, tag.

## Report

Standard completion report, plus the verification record exactly as written to `docs/TESTING.md`.
