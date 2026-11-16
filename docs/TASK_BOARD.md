# Task Board

Current assignments, what is waiting, and what is blocked. Fable keeps it current; finished items move to `CHANGELOG.md` and leave this file.

**Updated:** 2026-11-12

## In progress

| # | Task | Agent | Notes |
| --- | --- | --- | --- |
| G-9 | 3D defect list (`RENDERING.md` 7.6), by the owner's priority | sonnet-ui / sonnet-technical | When the owner asks |

## Waiting on the owner

| # | Question | Why it matters |
| --- | --- | --- |
| O-10 | Publish v0.106.0 to the live site (the push to `claude/funny-mayer-52dll8` was blocked pending your word) | Players are on v0.105.0 |
| O-11 | `SPECIAL_OPERATIONS.md` §9: who hands out missions; does a mission take Sund time; lethal or not; which contract first | Shapes the mission foundation |
| O-8 | Play an attended rules-5 battle and report difficulty and feel (forest attack 13%, trench defence 85% headless) | Only headless battles have been measured |
| O-3 | War: destruction and coup is now v0.105.0 (the Graphics Update took v0.104.0) | — |
| O-6 | Add a world facing vector so keyboard interaction and auto-aim follow the walking direction (a small simulation change; `RENDERING.md` 2.5) | Owner's approval required by the brief |
| O-4 | Roadmap open questions 2, 3, 4, 6, 7 (`ROADMAP.md` section 6) | 2–4 affect battle rules; none blocks 12a |

## Ready (in suggested order)

| # | Task | Agent | Notes |
| --- | --- | --- | --- |
| R-1 | Bring `README.md` up to v0.103.11: "What's in this build", the project layout, and remove the line "Combat is not in this build" | haiku-support, Fable reviews | Docs only. Source: `SYSTEM_REGISTRY.md`, `CHANGELOG.md` |
| R-2 | `KNOWN_ISSUES.md`: correct the title version; `PROJECT_OVERVIEW.md`: mark the 0.1.0 scope and stage table as historical | haiku-support | Docs only; delete nothing |
| R-3 | `oberverse-manifest.json`: update the `systems` map and `releaseDate` (2026-10-13) | haiku-support | Check `tests/version.test.mjs` for fields it reads first |
| R-4 | ~~v0.105.0 stage 12a~~ done in v0.106.0: destruction | Fable plans; sonnet-gameplay (battle rules), then sonnet-ui (drawing) | Read `WAR.md`, `PROPOSAL_WAR_TACTICAL.md`, `src/battle/`. Opus review of the battle-sim change is justified (determinism: `src/battle/hash.js`) |
| R-5 | ~~v0.105.0 stage 12b~~ done in v0.106.0: government response and the coup campaign | Fable plans; sonnet-systems + sonnet-business | Touches politics, strategic map and budget; plan after 12a |
| R-6 | Tag releases in git (none exist; v0.104.0 is untagged) | Fable | The release procedure asks for it; none exist |

## Backlog (from the roadmap and known issues, not scheduled)

- v0.106.0 War: migration and release; v0.107.0–v0.115.0 Post-War Expansion (plan only until the owner says go).
- War art still to redraw (`ROADMAP.md` section 7).
- Reload re-rolls the world's dice (cause not pinned down; `KNOWN_ISSUES.md`).
- Corporate gaps (`CORPORATE_ACCEPTANCE.md`); NPC driving; Halvermouth residents; tablet on touch devices.

- The anti-air test in `tests/battle_fire.test.mjs` had its seed key changed (`AAx` → `AAy`) when cover was lowered: it is seed-sensitive (±1 win); make it robust over several seeds.
- `workbench` is declared twice in `src/content/props.js` (the later, w:3, wins); delete one after checking maps.

- Smoke test: the war-terminal block failed once in three runs on 2026-11-13 and passed on rerun; find the timing dependency.

- v0.106.0 follow-ups: tanks in the open-world streets for the Army's armour wave; a hand-made Crown Quarter battle map for the coup's decisive battle; decrees on the budget screen and unrest under a junta; playtest a coup attended.

- Smoke: `battle_city_heliOverRoof` failed once in three runs on 2026-11-16 and passed on rerun (timing on software GL).
- Neumina: the Underworks level; tower lobbies and mission floors; neon signage and holographic billboards; traffic and air-cars; crowds.

## Blocked

None.
