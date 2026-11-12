# Task Board

Current assignments, what is waiting, and what is blocked. Fable keeps it current; finished items move to `CHANGELOG.md` and leave this file.

**Updated:** 2026-11-12

## In progress

| # | Task | Agent | Notes |
| --- | --- | --- | --- |
| G-1 | Isometric view, phases 2–3: projection, baked ground, sort, buildings roofed/open/faded, input and aim (`RENDERING.md`) | sonnet-ui | Started 2026-11-12 |
| G-2 | Phases 4–7 (people and props, vehicles/combat/Wrath, battles, test and optimise) | queued | After G-1 is reviewed |

## Waiting on the owner

| # | Question | Why it matters |
| --- | --- | --- |
| O-2 | Should the live site (Pages, branch `claude/funny-mayer-52dll8`, at v0.103.5-era) be brought up to v0.103.11? | Players see a build eleven commits old |
| O-3 | v0.104.0 (War: destruction, coup) waits behind the isometric view, by the owner's priority of 2026-11-12 | — |
| O-4 | Roadmap open questions 2, 3, 4, 6, 7 (`ROADMAP.md` section 6) | 2–4 affect battle rules; none blocks 12a |

## Ready (in suggested order)

| # | Task | Agent | Notes |
| --- | --- | --- | --- |
| R-1 | Bring `README.md` up to v0.103.11: "What's in this build", the project layout, and remove the line "Combat is not in this build" | haiku-support, Fable reviews | Docs only. Source: `SYSTEM_REGISTRY.md`, `CHANGELOG.md` |
| R-2 | `KNOWN_ISSUES.md`: correct the title version; `PROJECT_OVERVIEW.md`: mark the 0.1.0 scope and stage table as historical | haiku-support | Docs only; delete nothing |
| R-3 | `oberverse-manifest.json`: update the `systems` map and `releaseDate` (2026-10-13) | haiku-support | Check `tests/version.test.mjs` for fields it reads first |
| R-4 | v0.104.0 stage 12a: destruction | Fable plans; sonnet-gameplay (battle rules), then sonnet-ui (drawing) | Read `WAR.md`, `PROPOSAL_WAR_TACTICAL.md`, `src/battle/`. Opus review of the battle-sim change is justified (determinism: `src/battle/hash.js`) |
| R-5 | v0.104.0 stage 12b: government response and the coup campaign | Fable plans; sonnet-systems + sonnet-business | Touches politics, strategic map and budget; plan after 12a |
| R-6 | Tag releases in git from v0.104.0 on | Fable | The release procedure asks for it; none exist |

## Backlog (from the roadmap and known issues, not scheduled)

- v0.105.0 War: migration and release; v0.106.0–v0.114.0 Post-War Expansion (plan only until the owner says go).
- War art still to redraw (`ROADMAP.md` section 7).
- Reload re-rolls the world's dice (cause not pinned down; `KNOWN_ISSUES.md`).
- Corporate gaps (`CORPORATE_ACCEPTANCE.md`); NPC driving; Halvermouth residents; tablet on touch devices.

- `workbench` is declared twice in `src/content/props.js` (the later, w:3, wins); delete one after checking maps.

## Blocked

None.
