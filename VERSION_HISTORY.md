# Version History

Milestones, compatibility and migration notes. The changelog lists details; this file records what each release means.

| Version | Date | Channel | Save schema | Milestone |
| --- | --- | --- | --- | --- |
| 0.20.0 | 2026-10-15 | development | 1 | Streets — four-tile roads, a joined-up road network, traffic lights, pavements |
| 0.19.0 | 2026-10-14 | development | 1 | By the Crate — crates, country orders, the armourer's workbench |
| 0.18.0 | 2026-10-13 | development | 1 | Hot Pursuit — police chases |
| 0.17.0 | 2026-10-13 | development | 1 | Route 1 — the bus and NPC traffic |
| 0.16.0 | 2026-10-13 | development | 1 | On the Road — cars, two dealerships, driving, theft |
| 0.15.1 | 2026-10-13 | development | 1 | Overwatch — OSINT terminal, interactive globe, zoomable world map |
| 0.15.0 | 2026-10-13 | development | 1 | OberPad — the journal becomes a tablet: business, stocks, notifications |
| 0.14.0 | 2026-10-13 | development | 1 | Gun Running — the global market, shipping, heavy weapons in use |
| 0.13.0 | 2026-10-13 | development | 1 | Pipecreek — fifth imported character, arms works, staff, research |
| 0.12.0 | 2026-10-13 | development | 1 | The Calculator Works — warehouses, Sal's parts and deliveries, the factory builder |
| 0.11.0 | 2026-10-13 | development | 1 | Sums of Anarchy — fourth imported character, the gang, calculators, customers |
| 0.10.0 | 2026-10-13 | development | 1 | Law & Order — third imported character, police, Wanted, jail and breakouts |
| 0.9.0 | 2026-10-13 | development | 1 | Personal Wrath — fixed out-of-reach attacks; oil and construction themes |
| 0.8.0 | 2026-10-13 | development | 1 | Debug Menu — testing console and toolbox |
| 0.7.0 | 2026-10-13 | development | 1 | The Oberverse Protects Its Own — imported characters are untouchable |
| 0.6.0 | 2026-10-13 | development | 1 | Hard Lessons — combat, weapons, NPC health and death |
| 0.5.0 | 2026-10-13 | development | 1 | Halvermouth — the city map (no residents yet) |
| 0.4.0 | 2026-10-13 | development | 1 | Mason's Os — second imported character, Westbrook district, property groundwork |
| 0.3.0 | 2026-10-13 | development | 1 | One Coast — Lanternside and the Ober Fields joined seamlessly |
| 0.2.0 | 2026-10-13 | development | 1 | Ober's Oil — first imported character, second district |
| 0.1.1 | 2026-10-13 | development | 1 | Just Open It — single-file game, no server needed |
| 0.1.0 | 2026-10-13 | development | 1 | Foundations of Lanternside — first playable build |

## 0.20.0 — Streets

Roads are four tiles wide and every one leads somewhere; traffic lights, pavement-keeping pedestrians, lighter through traffic and heavier car handling. Saves: everything outdoors moved, so saves from before 0.20.0 are shifted on load (the player, residents and cars on widened maps) and the buses restart on the new route. No schema change.

## 0.19.0 — By the Crate

The arms trade runs on crates and country orders; single weapons and ammo come from the armourer's workbench. Saves: `world.market.orders` is added on load (orders post the same day); stations keep their recipes (now crates); loose weapons already in a cage can still go to Lucas. No migration needed.

## 0.18.0 — Hot Pursuit

Police cruisers chase you while you're Wanted. Chases aren't saved (cruisers in pursuit are removed on load). No migration needed.

## 0.17.0 — Route 1

The No. 1 bus (ride it for real, 2 obols) and NPC traffic with carjacking. Saves: `world.transit` (bus positions) is created on first use; `player.riding` is new; traffic is regenerated each session. Older saves lose the avenue cars that stood in the lanes (unless you'd taken one). No migration needed. The Transportation update is complete.

## 0.16.0 — On the Road

Cars you drive, two dealerships and their salesmen, hitting people and car theft. Saves: `world.vehicles` is created on first use (every parked car in its place); `player.driving` is new. No migration needed. The bus and NPC traffic follow in 0.17.0.

## 0.15.1 — Overwatch

Presentation only: the terminal becomes an OSINT console with an interactive globe, and the map becomes one zoomable world map with building icons. Saves are unchanged.

## 0.15.0 — OberPad

The journal becomes a tablet that runs your arms business and Ober's Oil shares remotely and collects business notifications. Saves: `world.tablet` is created on first use; older saves load with an empty feed. No migration needed.

## 0.14.0 — Gun Running

The living world market (countries, wars, embargoes), shipping with insurance and heat, and usable RPGs, missiles and drones. Saves: `world.market` is added to older saves on load (the starting world). No migration needed. The Guns and Gun Running update is complete; politics and your own shipping company are planned next.

## 0.13.0 — Pipecreek

Lucas Eastrise (imported), Pipecreek Armory, Mill Road Yards, arms works with generated staff, workstations and research; wholesale to Lucas. Saves: `world.arms` and six containers are added to older saves on load; employees are respawned from `world.arms.staff`. No migration needed. The global market, shipping and heavy weapons in use follow in 0.14.0.

## 0.12.0 — The Calculator Works

Warehouses, Sal Vage's parts and deliveries, hand-crafting and the grid factory (machines, belts, inserter arms, power). Saves: `world.factory` and the six warehouse containers are added to older saves on load; no migration needed.

## 0.11.0 — Sums of Anarchy

Arthur Anderson (imported) and the Sums of Anarchy; calculators with temporary stat highs; Schedule I-style customers, orders and gang anger. Saves: `world.gang`, `player.buffs` and `player.tolerance` are added to older saves on load; no migration needed. Warehouses and production follow in 0.12.0.

## 0.10.0 — Law & Order

Chief Lawrence Order (imported) and Precinct 1: five officers patrolling all four areas, a criminal record and Wanted stars, bribes and fines, jail on death or arrest with four breakouts. Saves: `world.police` and the `ct_evidence` container are added to older saves on load; no migration needed. Being knocked out now sends you to jail instead of home.

## 0.9.0 — Personal Wrath

- **Fix:** the Wrath now triggers on any clear attack on a protected character, not only on blows that would have landed.
- **Content:** per-character Wrath themes (visual + audio). New imported characters choose a theme or get the default arcane one.
- **Save compatibility:** unchanged.

## 0.8.0 — Debug Menu

- **Tooling:** in-game debug menu and command console for testing; the same commands are callable from tests (`runCommand`).
- **Save compatibility:** unchanged; debug use is recorded in `flags.debug_used`, god mode in `player.god`.

## 0.7.0 — The Oberverse Protects Its Own

- **Rule:** imported characters cannot be harmed or killed unless the project owner marks them `killable: true`. Attacking one plays the Wrath cutscene and strikes the player down (respawn or reload).
- **Save compatibility:** unchanged.

## 0.6.0 — Hard Lessons

- **Systems:** real-time combat on the player's map (melee and guns), NPC health/knock-out/death, fight-or-flight reactions, witness consequences.
- **Design note:** any NPC can be attacked and killed, including story characters; death is permanent and fails the quests they gave. This is intentional (systemic sandbox).
- **Save compatibility:** schema 1 unchanged; new fields are optional and defaulted.

## 0.5.0 — Halvermouth

- **World structure:** first separately loaded region (`city`), joined to the coast by gateway doors instead of seams; the coast region stays seamless.
- **Content:** map-only build of the metropolis (districts, skyscrapers, civic buildings, slums) plus three interiors. Characters and systems come in later updates.
- **Save compatibility:** schema 1 unchanged; nothing new is stored.

## 0.4.0 — Mason's Os

- **Content:** second player-imported character (Mason Nails), three generated crew, the Westbrook Lots district west of Lanternside.
- **Systems:** construction shifts with crew goodwill; property groundwork (plots, blueprints, permits, runtime buildings). No plots yet by design — the project owner decides where.
- **Save compatibility:** schema 1 unchanged; new state is additive and defaulted on load. Verified against `tests/fixtures/save-schema1-v0.1.0.json`.

## 0.3.0 — One Coast

- **World structure:** outdoor maps can now form continuous regions. Lanternside (offset 0) and the Ober Fields (offset 63 tiles) share one seam column.
- **Save compatibility:** unchanged; player and NPC positions are still stored per map.

## 0.2.0 — Ober's Oil

- **Content:** first player-imported character (Sir Moneybucks) with ten generated employees and a new district.
- **Save compatibility:** schema 1 unchanged; additive state (`world.oil`, new NPCs, `fac_oil`) is defaulted on load. Verified against `tests/fixtures/save-schema1-v0.1.0.json`.
- **Behaviour changes in existing content:** impulses for Mags, Osric and Tibbs now actually fire; Osric sometimes stays late instead of inspecting the Point.

## 0.1.1 — Just Open It

- **Distribution change:** players open `index.html` directly (or a GitHub Pages link). It is generated by `npm run build` from `dev.html`, `styles.css` and `src/`.
- **Save compatibility:** unchanged (schema 1). Note: browsers keep `localStorage` per origin, so saves made while playing from a file and saves made on a GitHub Pages link are separate. Use Export/Import in the Load panel to move a save between them.

## 0.1.0 — Foundations of Lanternside

- **Status:** development build (not marked stable).
- **Roadmap coverage:** Stage 0 (discovery & architecture) and Stage 1 (playable foundation) complete. Early implementations of Stage 2 (world & navigation), Stage 3 (systemic RPG foundation, minus combat/equipment), Stage 4 (character simulation), Stage 5 (import pipeline — documentation, templates and engine support; no imported characters yet) and Stage 6 (audio and presentation).
- **Save compatibility:** introduces save schema 1. There are no earlier saves to migrate.
- **Content compatibility:** characters, containers and shops that are added to content later are created fresh when an older save is loaded (tested).
- **Verification:** see docs/TESTING.md for the checks run for this release.
- **Recovery point:** git commit tagged in history on branch `claude/funny-mayer-52dll8`.
