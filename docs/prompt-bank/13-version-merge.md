# 13 — Version Merge

**Purpose:** Integrate changes from another copy/branch of the project into the canonical project without losing work.

**Required input:** which copy is canonical, and the source of proposed changes (branch, folder, archive).

**Read first:** both copies' `VERSION`, manifests, `CHANGELOG.md`; `docs/SAVE_FORMAT.md`; `docs/DEVELOPMENT_WORKFLOW.md`.

## Steps

1. Inspect both; produce a real diff (`git diff`, or `diff -ru` for folders). Don't assume the newer one is better.
2. Confirm which is canonical. The canonical project is authoritative.
3. Classify each difference: feature, fix, content, asset, docs, dependency, save-format impact, conflict.
4. Identify dependencies between changes and conflicts (same file/ID changed differently, divergent schemas, ID collisions).
5. Integrate incrementally, one group at a time, running `npm run check` after each.
6. Preserve working functionality, unique content, assets, docs and save compatibility from both sides. Resolve ID collisions by renaming the *unreleased* side only.
7. If schemas diverged, write migrations so saves from both lines load.
8. Test the integrated result (check, smoke, play).
9. Update version and docs.
10. If something cannot be reconciled safely, keep both (e.g. a branch or `archive/` folder) and explain.

## Constraints

Never blindly overwrite the canonical project. Never delete the source copy.

## Deliverables

Integrated project, merge notes in `VERSION_HISTORY.md`, changelog, known issues.

## Report

Standard completion report, plus a table: change → decision (taken / adapted / rejected / deferred) → reason; and unresolved conflicts.
