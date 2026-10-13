# 16 — Prompt Bank Maintenance

**Purpose:** Keep these prompts accurate when procedures, structure or tooling change.

**Required input:** what changed (or "review everything").

**Read first:** `docs/prompt-bank/INDEX.md` and all prompts; `docs/DEVELOPMENT_WORKFLOW.md`; `package.json` scripts; current folder structure.

## Steps

1. For each prompt, verify every file path, command and procedure it mentions still exists and is correct.
2. Update prompts in the same change as the procedure they describe.
3. Add a prompt when a task recurs that no prompt covers well; add it to the INDEX table with a "use when".
4. Keep each prompt actionable: purpose, inputs, read-first, scope/constraints, deliverables, testing, must-not-change, docs to update, report format.
5. Remove nothing silently; mark superseded prompts and point to replacements.

## Constraints

Prompts describe the *actual* project. No aspirational instructions that the code can't support.

## Deliverables

Updated prompts and INDEX; a note in `CHANGELOG.md` under Documentation.

## Report

Standard completion report, plus a list of prompts changed and why.
