# Testing rules

Details and the verification record: `docs/TESTING.md`.

- `npm run check` = content validator + every `tests/*.test.mjs` (Node's built-in runner, no browser). The full suite takes about 8 minutes: run it once before a release-sized change and once after integration, not after every edit.
- While working, run targeted files: `node --test tests/<area>*.test.mjs`. Test files are named by area (`war_*`, `battle_*`, `corporate_*`, `aerospace_*`, `politics_*`, `strategic_*`, `save*`…).
- After changing `src/`, `styles.css` or `dev.html`: `npm run build`, then `node --test tests/build.test.mjs tests/version.test.mjs`.
- Anything visible: `npm run smoke` (Playwright, standalone `index.html`; `-- --dev` for `dev.html`). Screenshots go to `tools/out/` (not committed).
- A bug fix comes with a test that fails without it. A new rule comes with a test. A save change comes with a fixture and a migration test.
- Money changes: `node tools/econ-audit.mjs` (or `econ-audit-war.mjs`) before and after.
- Status words mean what they say: **implemented** (code exists), **tested** (automated tests ran and passed), **verified** (seen working in the built game), **partial**, **blocked**. Never report a check that was not run.
