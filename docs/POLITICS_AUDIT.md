# Politics: audit and baseline (v0.93.0, stage 1)

Written before the political system was built, at v0.92.0, so every later release can be compared with it. No gameplay is in this document; it records what exists, what the political system will read or write, and which tests it will touch.

## Baseline (v0.92.0)

| Measure | Result |
| --- | --- |
| Tests (`npm test`) | 946 pass, 0 fail |
| Content validator (`npm run validate`) | 0 errors, 2 warnings (both old: a Lanternside door whose key `item_collective_card` is not an item; one other door note) |
| Browser smoke (`npm run smoke`) | 51 of 51 |
| Countries / states / places | 11 countries, 77 states, 131 places (the Atlas, v0.92.0) |
| Persistent characters | about 140 NPC records (80 were counted when the proposal was written; banks, aerospace and others have been added since) |

## Dependency map (what the political system touches, and how)

| Area | Where it lives | Political system's relationship |
| --- | --- | --- |
| Wars and embargoes | **Written by** `src/systems/market.js` (`world.market.wars`, `countries[id].embargo`), **read by** `src/systems/geo.js`, `src/corp/geo.js`, the Economy app, bonds and the exchange | Stage 10 (Diplomacy) becomes the one writer. Until then politics reads only. |
| Government debt | `src/systems/bonds.js` (Halvermouth bonds at the policy rate), `src/systems/sovereign.js` (a rated bond per country, **including Sund's**) | **Settled: one bond for Sund.** The merge is done in the Economy release (v0.96.0), where a deficit first has to be borrowed; holdings are kept and moved onto the one record. |
| Police | `src/systems/police.js`, `src/content/life.js` patrols | Policies will change scalars (staffing, response delay, which offences are chased). Not in v0.93.0. |
| Farm, arms, aerospace, shipping | `farm.js`, `market.js`, `aerospace.js`/`src/aero/tenders.js`, `logistics.js` | Bounded multipliers read where a price or cost is already worked out (Economy release). Not in v0.93.0. |
| Exchange and generated companies | `src/corp/exchange.js`, `src/corp/sim.js` | Political news changes expected profit by sector through the existing function. Not in v0.93.0. |
| People | `src/content/characters/*.js`, `src/content/life.js` (`LIFE`: every persistent character needs a home), `src/content/homes.js` (flats), `src/sim/*` | Vegas and Susan are persistent NPCs with flats (this release). The ten staff roles per party are records only until the People release. |
| Tablet | `src/ui/tabletGroups.js`, `tabletHome.js`, `tablet.js` | A **Politics** app (read-only this release) in the Markets group: the home screen keeps its eight icons (a promise a test holds). |
| Saves | `SAVE_SCHEMA_VERSION = 1`; each system makes its record on first use (`world.politics`) | An old save loads unchanged and gains the record when it is first read. No migration step is needed. |
| Time | one real second = one game minute; 30-day corporate months; no calendar year | A term is 120 game days; the vote is in its last 30 (`src/politics/calendar.js`). |

## Existing tests the political system will touch (so far)

- v0.93.0: two tablet tests edited (`tests/tablet_groups.test.mjs`: the Markets group now lists Politics, and a search for "markets" finds five apps, not four).
- Later, from the proposal: tests that assert the arms market's war list as the only writer (v0.102 in the old numbering: Diplomacy), tests that count each country's bond (the merge), the tablet-group lists.

## Rules the political system keeps

- No random draw on a read. Every result is a function of the saved record and the day.
- One saved record, `world.politics`; nothing keeps a second copy of anything in it.
- Anything that pays or counts once is keyed so a reload cannot repeat it.
- The player is never required to take part; no policy is automatically good; neither party is a villain.
