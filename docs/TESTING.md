# Testing

## Automated

| Command | What it does |
| --- | --- |
| `npm test` | Runs every `tests/*.test.mjs` with Node's built-in test runner. Fully headless: the whole simulation runs without a browser. |
| `npm run validate` | Content reference validator (`tools/validate-content.mjs`). |
| `npm run check` | Both of the above. |
| `npm run smoke` | Opens the standalone `index.html` via `file://` (no server — exactly as players do), drives it in headless Chromium via Playwright, fails on any page error or engine warning, and writes screenshots to `tools/out/`. `npm run smoke -- --dev` runs the same checks on `dev.html` through the dev server. Requires Playwright (a global install is fine). |
| `node tools/make-save-fixture.mjs` | Writes a representative save for the *current* schema to `tests/fixtures/`. Run once per new schema and commit; never regenerate old fixtures. |

### Test files

| File | Covers |
| --- | --- |
| `version.test.mjs` | Version agreement across VERSION, package.json, manifest, game, release notes, changelog, version history. |
| `clock.test.mjs` | Time parsing, wrap-around windows, day/night, pausing. |
| `world.test.mjs` | A* and cross-map routing, wall collision, door transitions, locks/hours/owners, interaction targeting. |
| `dialogue.test.mjs` | Greetings, distinct voices, topic effects, bounded Ask-about (secrets, unknowns), knowledge boundaries, gifts with diminishing returns, gossip trading, locked choices, moods vs persuasion, condition evaluation. |
| `simulation.test.mjs` | Schedules cover 24 h, a full simulated day in the abstract tier, physical walking on the player's map, NPC chats spreading information, rumour vs fact, observation, bounded memory, impulsive deviation, sleep/time-skip consistency. |
| `quests.test.mjs` | The Dark Lamp's three entry approaches (permission, theft + later discovery + confession, caught red-handed, hatch, witnessed hatch), both resolutions, The Lucky Spanner, job expiry & recovery, shops & pricing. |
| `events.test.mjs` | Bang → citation chain gated by information flow, sell-out → irritable Osric, gull heists, witness-only crimes. |
| `save.test.mjs` | Round-trip of rich state, backup fallback on corruption, validation/repair, migrations, forward-compatible content, import/export, settings. Loads the schema-1 fixture. |
| `build.test.mjs` | `index.html` matches a fresh build; the page is self-contained (no module scripts, external files); the bundle parses and includes every module once. |
| `character_moneybucks.test.mjs` | Sir Moneybucks's tiers, schedule, invitation, refinery shifts, investing, the Ledger, the strike, the mystery, saves. |
| `character_mason.test.mjs` | Mason's import, puns and Pun of the Day, always-friendly rule, schedules and physical routes, construction shifts and goodwill, contracts board, the property lifecycle on a test plot, the Westbrook seam, old-save compatibility. |
| `world_halvermouth.test.mjs` | Halvermouth: separate region, gateway travel both ways, required buildings/districts/slum, reachability of every open door and interior, opening hours, saves. |
| `combat.test.mjs` | Weapon variety, punching + health bar, flee vs fight-back, the player being beaten, witnesses, knock-outs and waking, killing (permanent, quests fail, saves), buying/loading/shooting a gun, walls stopping bullets, gunfire panic, weapons in the world, old saves. |
| `wrath.test.mjs` | Protection of imported characters (and only them), the Wrath freezing the world, five strikes, rising again, every weapon type triggering it, `killable: true` lifting it. |
| `market.test.mjs` | Countries and shippers, prices (wants, war, saturation, hostility), shipping rules, arrival and payment, losses with insurance, embargo heat and enemy seizure, wars starting and ending with embargoes, saves; RPG blasts sparing imported characters, a direct hit calling the Wrath, missiles and drones never targeting them, the cruise missile's delay, debug commands. |
| `arms.test.mjs` | Lucas and Pipecreek, the pitch and the licence, the Yards and works sizes, terminal orders, station placement and staffing, applicants and bunks, staff staying in their works, research, a staffed assembly line into the export cage, payroll and quitting, wholesale and Lucas's budget, save/load, Lucas's Wrath, the new guns and recipe integrity. |
| `factory.test.mjs` | Warehouses, signs and doors; Sal's shops and unlocks; hand-crafting the full chain; placement rules; arms, belts, machines; a full parts-to-calculator line; power; backed-up belts and full outputs; deliveries; running while away; save/load as props; the machine panel; debug commands. |
| `gang.test.mjs` | The Sums of Anarchy cast, calculators (highs, comedowns, tolerance, heal, energy crash), Grit, Minnie's shop and counter, samples and stealing, orders, deliveries, referrals, missed orders, dealing and the police, anger tiers, ambushes and hunts, truce, hurting the crew, Arthur's Wrath, gang-police insults, jail confiscation, saves, debug commands, the Abacus. |
| `police.test.mjs` | The police cast (imported chief, armed killable officers, beats in all four areas), the lax chief, calls and dispatch, bribes and fines, pursuit and cuffing, surrender, death → jail, serving a sentence, all four breakouts, the LAW Wrath → jail, killing an officer, Wanted lapse and record decay, saves, debug commands, walkable precinct and cells. |
| `debug.test.mjs` | Debug console: give/take by id or name, money/health/energy/heal/god, weapons and ammo, time/skip/teleport/stats/rep/flags, reviving the dead and knocked-out. |
| `casino_rules.test.mjs` | The Phonograph Grand's games as pure rules: the deck and shuffle, every poker hand, kickers and ties, best of seven, short hands; roulette coverage and payouts (every bet's fair odds, the zero), multi-bet settlement, a fair wheel; blackjack aces, naturals, the peek, busts, pushes, soft 17, double, split, split aces, illegal actions, the shoe. |
| `casino_system.test.mjs` | The resort's maps and lifts (private floors, NPC-only lift doors, who can get where), the staff's hours, the cage (rate, minimum, overdraft, no cashing out seated, the ledger), debit and settle-once, seats and limits, the host's arrival (and skipping it), Morganius roaming, roulette and blackjack chip accounting over many rounds, save/load mid-hand and with chips on the layout. |
| `aerospace.test.mjs` | Aerospace (v0.55.0): Meridian on a new game, the five-aircraft rule (tenders, bids, contracts — no back door), pipelines use every bill of materials once, margins, buying Roost once (never free on an old save), materials before work, delivery and payment once each, persistent aircraft entities, save/load mid-production, the rival within capacity and paying for its materials, bids ranked by priorities, MRDN trading and pricing, satellites only operational after commissioning, everyone's own home, the Park, runway and launch complex. |
| `aerospace_shipping.test.mjs` | Aerospace materials in your own ships (v0.56.0): only with a shipping line (Meridian never; local suppliers truck), consignments sail on the real voyage system and aren't in stores until they land, the internal charge within 0–5% with goods paid in full, no free money (the charge cancels across the group, voyages paid once, capital excluded), delays move ETAs, orders and affected units, busy ships and hold sizes respected, the carrier fallback at market rates and the wait policy, save/load mid-voyage, cargo lost to pirates. |
| `aerospace_halls.test.mjs` | Halls and bays on the map (v0.57.0): hall states and opening times, slots that fit, a bay needing a free suitable slot, building a hall (cost, days, upkeep, offer discount), doors locked until built, Meridian's fixed halls and its ×1.5 extra bays, migration of old saves (nothing charged, nothing lost), save/load. |
| `aerospace_staff.test.mjs` | People and quality (v0.57.0): headcounts and wages for three roles, engineer and inspector drag with floors, experience gain/dilution and its effect on speed and quality, training costs and diminishing returns, the quality breakdown adding up, inspection log, Meridian hiring and training. |
| `aerospace_config.test.mjs` | Product configuration (v0.57.0): groups per product, `configure` (whole lots of materials the line uses, days, price within 1.4–1.7× cost, quality, needs, spec, effects), customers' wishes fixed by tender id (not the dice), config travelling tender → contract → unit → aircraft, research gating, the five-aircraft cap. |
| `aerospace_events.test.mjs` | Reputation and events (v0.57.0): the ledger adds up and clamps, streak multipliers, bonuses, government orders / constellations / breakthroughs / expansion offers / audits / milestones fire only on their conditions and cool-downs, decisions and their outcomes, minimum-reputation tenders, loser reports, old-save migration. |
| `aerospace_flight.test.mjs` | Starling Field (v0.58.0): the aircraft state machine, the field geometry against the map, every aircraft leaving from every stand on either runway (continuous, in order, off the map) and arriving, stands, the queue (one on the runway at a time), a departure over game time, reload mid-departure, old saves, Meridian's own sorties, the convoy, the field's sound, the terminal's field status. |
| `aerospace_launch.test.mjs` | Launches (v0.58.0): a sequence fixed when it starts, its phases, the clock, smoke as a function of the time, shake, the crawler's way on the map, rollout, one rocket on the pad at a time, a countdown booked when it ends, a loss at its moment, the roll deciding the outcome, reload mid-countdown, cancelling, the terminal's pad status. |
| `corporate_integration.test.mjs` | The brief's 20.5 (v0.80.0): all four businesses under a parent, a manager each, budgets, autonomy, 62 days on the real systems; twelve claims checked against ledgers, logs and the saved state. About 90 seconds. |
| `transaction_integrity.test.mjs` | Brief 17.1 (v0.80.0): unique names and tickers; every morning service run twice changes nothing; loans bounded by what stands behind them; split purchases; save after every transaction type is exact and consistent; eighteen refusals that move nothing. |
| `save_migration_corporate.test.mjs` | Brief 17.2 (v0.80.0): a v0.59.0 save keeps balances, shares and businesses and is granted nothing; ten weeks of play; save, load and the oldest schema. |
| `milestones.test.mjs` | Milestones from the records (each rule and its near miss), awarded once and kept; the exchange's trade record and watchlist. |
| `robbery.test.mjs` | Bank robbery (v0.79.0): the pure state machine and its bounds; configured hauls; a hold-up end to end with the loot paid once through repeats and a reload; sealing, four days, restocking, reopening and a bounded second robbery; a night raid; alerts that come to nothing; the Lariat bank; the front door at night; the market reaction. |
| `robbery_separation.test.mjs` | The absolute creditworthiness rule (brief 14.1): control-game proof that every financial answer is identical after a robbery, while sealed and after reopening (both banks); what does change; source scans in both directions. Checked by mutation. |
| `banks_physical.test.mjs` | Staffed banks (v0.78.0): seven people with homes, beds, sleep blocks and registry rows; streets and halls exactly their old sizes; both banks staffed at their spots in hours and at home at night; doors by hours, staff list and staff-only office; counters opening the right apps; dialogue and combat temperaments. |
| `sovereign.test.mjs` | Foreign government bonds (v0.77.0): the pure rules (trait, strain and its caps, bands, day counter, recovery, issue size); nothing before the arms market; eight deterministic issues rated by cause; trading and coupons; a war's downgrade and its recovery; delayed payments, owed and repaid, restructuring once and the new issue after the pause; collateral and the sale lock. |
| `geo_effects.test.mjs` | Geopolitics, second part (v0.76.0): the bond premium (basis points, bounded, ramps); your own part prices against the cost index; government bond yields and value with the policy rate untouched; managers' budget requests (one at a time, nothing changed until approved) and the expansion hold through the real judgement; an embargo that begins after a tender is posted. |
| `geo.test.mjs` | Geopolitics (v0.75.0): phase/severity/indices/sentiment rules (bounds, ramp, recovery, exposure, capacity); records made once with stable ids and the market not started by them; milestones, ceasefire, lifting and reloads that never stack or lose a shock; costs and demand in the companies' days and the exchange's fair prices; the Economy overview. |
| `business_loans.test.mjs` | Loans to companies (v0.74.0): limit and rate rules; funded companies only and refusals that change nothing; a loan is cash not revenue, interest a cost and principal not, net assets unchanged, accounts reconcile; arrears with nothing seized, managers' freeze, the bank collecting; personal and parent guarantees. |
| `lending.test.mjs` | Loans (v0.73.0): the pure rules (advance rates, quarter-point rate, quote, a month's accounts); nothing before a first loan and refusals that change nothing; a loan from signing to its last instalment (fixed rate, repaid to the obol); arrears at the penalty rate with no seizure and borrowing closed until cleared; the sale lock on bonds, OBRO and the exchange route; record effects and the state round trip. |
| `tablet_groups.test.mjs` | The tablet's groups (v0.72.0): which groups and apps a game has as it grows, each app in one group, every earlier app still there; badges by app (only what is new, cleared by reading); search by name or group. |
| `credit.test.mjs` | Corporate bonds (v0.71.0): the pure rating, spread, recovery and issue-size rules; one issue per priced listed company, once, at the coupon the rule gives, none before the exchange; buying (par, a twentieth, refusals changing nothing), coupons once a month, thirty-six and the face; the rating following the books and the price the rating; default once at the recovery rate, a takeover at par; a repaid issue replaced a month later; saves. |
| `first_bank.test.mjs` | The physical bank (v0.70.0): the door leads to a hall exactly the building's size with its way out and a place to stand outside; the hours; the bond desk and rate board opening Bonds and Bank; the vault and counter giving messages; the street around it unmoved. |
| `bonds.test.mjs` | Government bonds (v0.69.0): the premium curve, the coupon, the cash flows and the value (par at issue, falling and rising with the rate, never wild); nothing made before a purchase; the bounds and refusals; coupons once a month and never early, twelve and the face and no more, after a gap each missed one once; value and sale with the spread, a round trip costing only the spread; saves; a coupon fixed at issue while the offers follow the rate. |
| `bank.test.mjs` | The policy rate (v0.68.0): the pure rule (target, steps, holds, limits, the words); the three effects exactly nothing at neutral and bounded; nothing made before the first meeting; the first meeting on day 91, once a month, once after a long sleep and a reload; a distressed world lowering the rate, a busy one raising it, a long run inside its limits by quarter-points; the rate reaching loans, interest and valuations; no way to set it. |
| `exchange.test.mjs` | The exchange (v0.66.0): the pure rules (shares for a worth, the price step and floor, the fee, the cap, the blocks); listings made once at a price that fits their worth; prices following the books within the mood and identical in two games, with no RNG; buying and selling (the fee each way, the cap, the cost kept, refusals changing nothing); monthly dividends once, none for shares not held; failure and takeover settled once; the three older shares read and traded through their own rules (identical to calling them directly); the portfolio's honesty about unknown costs; saves; an old save; and (v0.67.0) Ober's Oil under the exchange's rules — the fee each way, the 5% cap, the cost kept, the price a step toward the refinery's figure with no RNG, a strike pulling the price down over days — Chuckie's Cheese's cost kept, and an old save with OBRO shares unchanged. |
| `management_treasury.test.mjs` | Treasury (v0.65.0): the pure move rule (top-up, the parent's reserve, partial, dust, sweep order, never while owing others, protected minimum); policy bounds; a top-up through the group's own transfer with total cash conserved and the subsidiary's months untouched; the budget as a hard stop; the ask-above queue and re-judging; nothing without a policy, budget, officer, permission or group; saves; repeated moves where every obol that moved existed. |
| `management_plans.test.mjs` | Bids and plans (v0.64.0): the pure bid price, plot, port and free-cell rules and the two new permissions; bids at the owner's margin (a margin, a budget, a person who may sign, one at a time, the open limit, queued below the margin and placed at the ceiling when approved, never below cost, nothing drawn, planning moving no RNG or stock); plan validation; a farm plot, a port, an aerospace facility and bay; an arms station (ordered, delivered, placed from the dock, the recipe, no worker, one at a time, power and no-free-place logged once); saves; nothing happening when nothing is authorised. |
| `management.test.mjs` | Managers on their own (v0.63.0): every branch of the judgement in order; the arms par and order rules; a deterministic hire choice; nothing created or spent with no budget; arms reorders paid from the works's account and attributed; no order for an unstaffed station or a stocked dock; the monthly budget as a hard stop; the owner's purchases not counting; the approvals queue (once, approve, decline, expiry) and re-judging at approval (a changed need, budget, funds or person); unfunded businesses never touching the wallet; jobs that do not decide; aerospace planning moving no RNG or stock and paying exactly the quote; auto-buy left alone; hiring (budget, monthly cap, cost, authority, queue, level); the HR director's reach; the save. |
| `personnel.test.mjs` | People (v0.62.0): the market made once from a saved seed, the same after save/load and not made by loading; weekly turnover (once a week, bounded after a gap, no number reused); hiring (made once, fee once, refusals change nothing); job limits; reassigning; wages paid once a day from the employer's own account in each business's own books, funded and unfunded, across a save; unpaid twice and they resign; severance once; skills growing from results only; promotion rules; authority bounds; arms staff counted once; parent wages in the consolidated statement; openings and the worth of a hire; an old save with no market. |
| `personnel_effects.test.mjs` | What people do (v0.62.0): nobody hired changes nothing and creates nothing; aerospace materials price and overhead, arms parts price and station speed (zero with no worker at the station), shipping upkeep paid, farm sale revenue — each shown as money paid or output made, within its ceiling, and nothing for a beginner; two managers with different strengths giving different results; a parent's executive at half strength with the sum capped; an unpaid or departed manager giving nothing; the effect looked up once a day. |
| `corporate_group.test.mjs` | The parent company and subsidiaries (v0.61.0): ownership rules (no circles, no second parent), policy bounds, free formation and its name, owner ↔ parent flows with total cash conserved, atomic joining (stake in kind, opening capital, all-or-nothing), the wallet guards on subsidiaries, transfers conserving cash and never being trading income, joining with enough money leaving the next days unchanged and with none having real consequences, leaving, save/load, an old save with no group. |
| `corporate_loans.test.mjs` | Intercompany loans and distributions (v0.61.0): loans are transfers not revenue, bounds, monthly interest and instalments with both sides' books agreeing, clearing a loan, missed payments, early repayment, distributions from profit that is in cash above the reserve (once, under save/load, independent of the wider world), policies and bounds, protected liquidity and the override, jobs after a long gap. |
| `corporate_consolidation.test.mjs` | Consolidation (v0.61.0): the deferred-freight pool (`icStep`), a real freight charge eliminated and not counted as group profit until used, released when used, moving money never changing the group's result, intercompany balances cancelling, cash shown as parent / each / group / distributable, group value without double counting, contribution and risk, the parent's ledger, and a group of all four businesses run two months on the real systems and saved in the middle. |
| `corporate_accounts.test.mjs` | Company accounts (v0.60.0): unfunded draws on the wallet and counts its flows, funded pays only from its cash and refuses what it cannot cover, buying a business is equity in kind, every business routes through its account, funded aerospace and arms pay from theirs, shares never touch a company, an old save has no corp state. |
| `corporate_funding.test.mjs` | Funding (v0.60.0): only owned businesses with money you have, contributions logged and moving money once, distributions bounded and refused while it owes, closing an account, arrears paid first from income, a funded aerospace firm's cash flow reconciling with its own account, save/load. |
| `corporate_identity.test.mjs` | Names and the registry (v0.60.0): name validation (trim, length, characters, clashes), a record and a naming prompt on founding (once), default names, rename history, no shared names across the whole registry, unique tickers, a real v0.59 save loading with identity records and nothing moved. |
| `corporate_world.test.mjs` | The wider world (v0.60.0): about 45 companies in ten sectors with unique names and tickers, deterministic from the seed, made once and unchanged by loading, history and character, a day once a day (bounded catch-up), demand shared and the player's sales taken off the top, failure and merger rules, bounded population, two years in bounds. |
| `corporate_paths.test.mjs` | Every business path from a funded company (v0.60.1): ports, ships, a naval mission's guard, land, fencing, animals, the co-op, a second works, parts, wholesale sales, the aerospace firm — the wallet never moves, a poor company is refused. |
| `corporate_metrics.test.mjs` | Figures, value and rankings (v0.60.0): figures/growth/value/rank/shares as pure functions, internal charges eliminated, the aerospace figures being the books' own, valuation never making money, unavailable data shown as missing, zero for a business that sold nothing, sector tables, rivals squeezed by the player's sales, compare, rank history, an old save ranked at once. |
| `aerospace_orbit.test.mjs` | Satellite services (v0.59.0): the markets and coverage, what a network sells (never more than it carries or than anyone wants), ageing and storms, losses by hash (halved by hardening and a platform), orbits and what the ground station sees, forecasts for every product, support fees and warranty, replacement tenders, an own satellite built, launched and earning (with its asset wearing away), ordering rules, insurance, storms, price swings, debris decisions, auto-replace, the dishes' pass, saves. |
| `aerospace_research.test.mjs` | The research tree (v0.59.0): its shape (needs exist, no cycles, a branch each), the layout (no overlaps, right of what it needs), effect and unlock wording, research days, the queue (three deep, prerequisites, removal cascades), the lab never idle, waiting for money (said once), the operations projects doing what they claim. |
| `aerospace_achievements.test.mjs` | Achievements (v0.59.0): the list is sound, a fresh company has none, earned once and paid once, each kind of metric, networks and orbit income from the fleet and the books, overtaking Meridian, the rival earns none, real deliveries feeding the counters, saves. |
| `aerospace_reports.test.mjs` | The financial reports (v0.59.0): thirty-day months (two years), cash categories, cash flow reconciled with the wallet, months adding up to the whole, the balance sheet, segments adding up to the deliveries, the headline numbers, CSV quoting, old books migrated. |
| `casino_rogue.test.mjs` | The Spade's Gambit (and its magic, v0.54.0: the Phantom, every Marvel, every Spell, the Gift): seeded runs, the scoring and its fixed order (hand Curios in held order, card Curios per card), every Ink, the Curios, the Twists, a run's flow (lost, won Tricks and Sparks, Finales clearing Acts, the outright win), every card in exactly one place, the Cabinet's prices and limits, the books (buy-in once, paid once, a run kept across leaving and save/load), a balance range for a greedy bot. |
| `character_morganius.test.mjs`, `character_octavius.test.mjs` | The two imported casino characters: looks, protection and Wraths, floating and card-magic states, schedules, dialogue, the cage topic, signature cars and weapons, saves. |
| `content.test.mjs` | Validator passes and catches injected errors, songs compile into whole bars, every major character has motif/voice/personality, **no network or external AI usage anywhere in `src/` or `index.html`**. |

## Manual testing with the Debug menu

Press ` in game (or Pause → *Debug menu*). Useful recipes: `weapons` then `tp halvermouth` for combat; `money 1000` for shops and property; `time 22:00` for night lighting; `revive all` after combat tests; `god` to watch fights without dying; `npcs` to find someone. Saves made after using it carry `flags.debug_used = true`.

## Verification record — v0.61.1 (2026-10-29)

- `npm run check` — **686/686 tests passed** (2 new in `corporate_group`); `npm run smoke` — 26/26.
- Parity re-run on the current code (Node, 20 game days, all four businesses): identical to v0.59.0 line for line.

## Verification record — v0.87.0 (2026-10-31)

- New: `hq_officers.test.mjs` (9 tests). Smoke +2. The validator's rule "no beds outside homes" was met by marking the quarters a dwelling. No existing test edited.
- Browser (headless Chromium): three officers at their desks in the centre at 10:00 with their name tags and barks; the staff quarters at 20:00 with the cots and the officers off duty; a conversation with one; 0 page errors. Screens: `docs/mockups/v087-*.png`.

## Verification record — v0.86.0 (2026-10-31)

- New: `hq.test.mjs` (9 tests). Smoke +2. Placement fallout found and fixed by the suite and the validator: two of the Grand Hotel's parked limousines stood on the first site chosen for the tower, and a police patrol point (`patrol_beat_eastend_1`, y=19) ran along the row above; both sites were moved, and the three buildings got map icons. No existing test edited.
- Browser (headless Chromium), real clicks: the Group app lists the three offices; **Buy › shows the terms and spends nothing; Buy took exactly 25,000 from the parent**; the door opened; walked to and into the small office, the centre and the tower; 0 page errors.

## Verification record — v0.85.0 (2026-10-31)

- Smoke +3 (Business opens on a summary; its fold opens the arms console; Standing likewise); and the v0.83.0 loan check no longer assumes a 5,000 amount exists (it depends on the share price; it failed once, honestly). 36/36 three times in a row. No existing test edited.
- Browser (headless Chromium), real clicks: Business summary → fold → the console, a console tab clicked, the fold stayed open; Standing summary → fold; Stocks chart fold, then **Buy 1 share (0 → 1)**; all 22 apps opened in turn with 0 page errors; the home screen at 520 and 1100 px wide. Words/controls: Business 248/15 → 62/5, Standing 155/6 → 54/6, Stocks 206/15 → 189/15.

## Verification record — v0.84.0 (2026-10-30)

- `tablet_home.test.mjs` +1 (no old page imported directly; each drawn inside a fold); smoke +3 (Management summary short, its fold opens the full page, Exchange opens on holdings). No existing test edited.
- Browser (headless Chromium), real clicks: Group — found a parent, **Pay in 10,000 (−10,000)**, **Bring in** showed the blockers and warnings with Cancel first, confirm made it a subsidiary, the fold opened the full page; Management — a pending request showed with Approve and Decline, **Decline** removed it; Personnel — See candidates opened the fold on the role; the Milestones, World News and Exchange folds; the fold stayed open on reopening; 0 page errors. Words/controls before → after: Management 1,286/50 → 53/5, Group 606/50 → 169/7, Personnel 623/17 → 131/9, World News 545/5 → 113/5, Milestones 361/5 → 105/5, Exchange 320/8 → 52/5, Companies 314/11 → 93/5, Intelligence 213/24 → 56/5, Customers 370/6 → 62/6.

## Verification record — v0.83.0 (2026-10-30)

- New: `tablet_home.test.mjs` (3 tests: the home icons for a new game and for a game with businesses, every icon opens an app that exists and every app has a way in, at most eight icons). `tools/smoke-test.mjs` gained five checks (home shows icons and under 120 words; a loan shows its terms before money moves; Accept signs it; the back arrow). No existing test edited.
- Browser (headless Chromium), real clicks: search → Bonds, back, Bank icon → Rates, Loans → Borrow → 12 months → 5,000 → terms (money unchanged) → Accept (+5,000) → listed on time → Repay (−5,000) → Bonds → Buy 1,000 (−1,000) → held with Sell; the Companies and Foreign views; the bell and back; 0 page errors. Words and controls (same game, empty portfolios) before → after: Home 188/25 → 50/14, Rates 225/3 → 73/4, Loans 366/11 → 81/8 (companies 92/11), Bonds 1,283/62 → 109/10, 132/13, 134/13.

## Verification record — v0.82.0 (2026-10-30)

- New: `income.test.mjs` (5 tests: the shifts and quests through the real systems, the day-3 arithmetic, the quest texts, the Lucas share and the crop and contract multipliers with the multiplier switched, and a scan that the old literals are gone). Existing tests edited: `character_mason`, `character_moneybucks`, `arms` (see the changelog).

## Verification record — v0.81.0 (2026-10-30)

- New: `aerospace_supply.test.mjs` (10 tests; see the changelog). Mutation checks: the cap removed → the cap test fails; the dispatcher's `reserved`/`repositioning` guard removed → the three-loads-on-one-ship test fails with the dispatcher error.
- Parity against v0.80.1 (`d9598d3`): identical line for line (the run's orders are small, so the cap never binds).
- Browser (headless Chromium), a game with the line and the firm: the Supply page draws, a real order from the button spent 7,441 obols and said it comes in your own ship, Details opens, a 60-lot slider shows 3 loads, 279 ◎ freight (under the cap) and 4,998 ◎ saved; 0 page errors. Screen: `docs/mockups/v081-supply.png`. Differences from the approved mockup: the terminal's own dark/amber look rather than the tablet's, the first shortage open and the rest one line each, route prices include the whole order, and the fleet strip states the cap.

## Verification record — v0.80.1 (2026-10-30)

- Morganius's elbow solver: `tests/morganius_arms.test.mjs` (4 tests; two fail against an inverted solver). Browser (headless Chromium): all eleven poses rendered before and after; the live Spade's Gambit scene played through three hands (a card mid-throw, the cascade, scoring), 0 page errors. Screens: `docs/mockups/v0801-morganius-arms.png`.

## Verification record — v0.80.0 follow-up corrections (2026-10-30, no version change)

A review of v0.80.0 found wording and test-quality faults; no game rule changed.
- **Existing tests edited in the whole 0.73–0.80 series, stated once so that no release line is read as "all earlier tests unedited"**: `tablet_groups` (0.73 Loans, 0.75 Economy and the news badge, 0.80 Milestones), `exchange` (0.75, its twin game), and `business_loans` (0.77.1, the arrears test, after the cash sweep was removed).
- Test claims made honest: `corporate_integration` test 12 now says the *group's own records* go on identically (the world's dice do not, see KNOWN_ISSUES); test 4 says "never more than once a day" rather than "exactly once"; the vacuous `cond ? … : true` in tests 8–9 is a real assertion; `exchange` asserts no player business or central bank is on the board; `robbery_separation` no longer reads a shipping "reputation" that does not exist.
- Robbery wording corrected: the separation is that no financial rule, figure or record reads the robbery, shown by source scans and a control game with the world held still; the shared random sequence is drawn by a police call or a combat bark like any action. Faction standing with the Civic Office (−15) is stated as a social effect: only Osric's permit dialogue and shops owned by that faction read it, and none is.
- Browser (headless Chromium), v0.80.0 build, a game with arms, shipping, aerospace and a parent group: all 17 tablet apps (Home, Business, Ships, Farm, Aerospace, Companies, Group, Personnel, Management, Milestones, Exchange, Stocks, Economy, Intelligence, Bank, Bonds, Loans) and the five journal tabs rendered, then the First Bank hall, the Governor's office and the Lariat State Bank hall at 10:30 with their staff present — **0 page errors**.

## Verification record — v0.80.0 (2026-10-30)

- `npm run check` — **872/872 tests passed** (20 new: 8 `corporate_integration`, 6 `transaction_integrity`, 3 `save_migration_corporate`, 3 `milestones`); one earlier test was edited (`tablet_groups`, for the Milestones app joining its group). `npm run smoke` — 26/26.
- The loan-stacking test was **mutation-checked**: with the old limit it fails, with the fix it passes.
- Browser (headless Chromium): the Milestones app, the Exchange with a ★ and "Your trades", and a bond's schedule line; no page errors.

## Verification record — v0.79.0 (2026-10-30)

- `npm run check` — **852/852 tests passed** (14 new: 9 in `robbery`, 5 in `robbery_separation`; content validation 0 errors); every earlier test passes unedited. `npm run smoke` — 26/26.
- **The separation tests were mutation-checked**: with a deliberate `lending standing −10` inside the robbery's loot function, four of five fail; with lending's collateral switched to count the robbery's premium, two fail; restored, all five pass.
- **Parity** against v0.78.0 (`55cf3f9`): both runs identical line for line (no robbery, so nothing differs).
- Browser (headless Chromium): a hold-up at the First Bank at 10:30 (Prudence "Help! Help!", Cyrus "Run!", Bertram "You want a fight? You've got one!", "Someone is calling the police!"), the vault paying 250,000 obols and 25 bars once, and the Economy app's Banks and security section (police on the scene, vault 150,000 of 400,000, the news line); no page errors.

## Verification record — v0.78.0 (2026-10-30)

- `npm run check` — **838/838 tests passed** (7 new in `banks_physical`; content validation 0 errors); every earlier test passes unedited. `npm run smoke` — 26/26.
- **Street layout**: every street's size and every building's position identical to v0.77.1 (compared building by building).
- **Parity** against v0.77.1 (`3f0d8a2`): your money, cash and staff lines identical; two lines differ — Meridian's share price and the managers' reorder quotes — because seven more people walking about take more draws from the shared random sequence, so the arms market's wars begin and end on different days. (The shared sequence is identical at the start of a new game: 0.846716 in both.)
- Browser (headless Chromium): the First Bank at 10:30 with Prudence at the grille, Cyrus at the bond desk and Bertram by the vault; the Governor at his desk; the Lariat State Bank with Hollis at the loan desk, Dottie at the window and Clint by the door; no page errors.

## Verification record — v0.77.1 (2026-10-30)

- `npm run check` — **831/831 tests passed**; `npm run smoke` — 26/26. Two of the new tests were run against the v0.77.0 code and fail there, as they should.
- **Parity**: identical to v0.77.0 (no company loan exists in the runs; the changes touch loans, a delayed bond and Meridian's bidding).
- Browser (headless Chromium): choosing a 25,000 loan shows the terms (7.75%, 2,245 first instalment, 1,049 interest, 26,049 in all) and signs nothing; *Accept* signs it; no page errors.

## Verification record — v0.77.0 (2026-10-30)

- `npm run check` — **829/829 tests passed** (6 new in `sovereign`); every earlier test passes unedited. `npm run smoke` — 26/26.
- **Parity**: both runs — nobody hired and managers hired over 25 days — are **identical to v0.76.0 (`1719fc7`)** line for line (the issues are market data: nothing moves until you buy). (Against v0.59.0 the runs differ only by the wars' effects introduced in v0.75.0–v0.76.0, as recorded there.)
- Browser (headless Chromium): the Bonds app with the eight countries (ratings AA–BB, causes shown beside each price), buying 10,000 of Varnistan's bond (BB, 96.0 per 100, 7.75%) through the real button, and the Economy app's country rows; no page errors.

## Verification record — v0.76.0 (2026-10-30)

- `npm run check` — **823/823 tests passed** (6 new in `geo_effects`); every earlier test passes unedited. `npm run smoke` — 26/26.
- **Parity** against v0.75.0 (`7b1e680`) with managers hired over 25 days: money, cash and staff lines identical; the managers' quotes and Meridian's price differ, as intended (costs now carry the wars).
- Browser (headless Chromium): the Bonds app showing "Added by wars and embargoes +0.26%" on day 60; a manager's budget request in the Management app with its reason and the Approve/Decline buttons; no page errors.

## Verification record — v0.75.0 (2026-10-30)

- `npm run check` — **817/817 tests passed** (7 new in `geo`; `exchange` and `tablet_groups` edited as the changelog says); `npm run smoke` — 26/26.
- **Parity** (deliberately no longer identical to earlier releases, because events now exist from day one): against v0.74.0 (`3dd9b1c`) with managers hired, every line is identical — the player's businesses' money, cash and staff — **except Meridian's share price** (the new sentiment); against v0.59.0 with nobody hired, again only the Meridian price line differs.
- Browser (headless Chromium): the Economy app with the war and the embargo from the first morning (ten per cent in force, ramping in), the sector table, who is exposed, the bank and the headlines; no page errors.

## Verification record — v0.74.0 (2026-10-30)

- `npm run check` — **810/810 tests passed** (6 new in `business_loans`); every earlier test passes unedited. `npm run smoke` — 26/26.
- **Parity**: nobody hired — identical to v0.59.0 (`b05b986`); managers hired and deciding — identical to v0.73.0 (`c299a56`) over 25 days (no company loan, so no new code does anything).
- Browser (headless Chromium): the Business loans section for an unfunded company, a funded one borrowing 25,000 through the real button with a personal guarantee (7.25% fixed), and after a missed instalment (in arrears, guarantee shown, your record down 4, the managers' freeze stated); no page errors.

## Verification record — v0.73.0 (2026-10-30)

- `npm run check` — **804/804 tests passed** (6 new in `lending`; `tablet_groups` edited only to list the new Loans app); every other earlier test passes unedited. `npm run smoke` — 26/26.
- **Parity**: nobody hired — identical to v0.59.0 (`b05b986`); managers hired and deciding — identical to v0.72.0 (`0207dce`) over 25 days (without a loan nothing in the new code runs but the sale guards, which pass).
- Browser (headless Chromium): the Loans app empty, after holding a bond, after borrowing 25,000 through the real button (7.75% fixed, 2,245 the first month), the Bonds app refusing a sale of the pledged bond, and the app after a missed instalment (arrears at 12.8% plus a warning in the feed); no page errors.

## Verification record — v0.72.0 (2026-10-30)

- `npm run check` — **798/798 tests passed** (3 new in `tablet_groups`); every earlier test passes unedited. `npm run smoke` — 26/26 (it opens the tablet).
- No game rule changed (a UI-only release), so no parity run was needed beyond the suite: the same simulation code runs as in v0.71.0.
- Browser (headless Chromium): the group bar with badges, the Home launcher, the search finding Bonds and opening it, the app bar of a group, the Journal; no page errors. A stray "null" at the top of Home (a group of one app has no app bar) was found and fixed.

## Verification record — v0.71.0 (2026-10-30)

- `npm run check` — **795/795 tests passed** (6 new in `credit`); every earlier test passes unedited. `npm run smoke` — 26/26.
- **Parity**: nobody hired — identical to v0.59.0 (`b05b986`); managers hired and deciding — identical to v0.70.0 (`eee2e4a`) over 25 days (issues are market data: no money moves until a purchase, and the companies' own records are untouched).
- Browser (headless Chromium): the Bonds app with the corporate section after the exchange had priced the listed; buying 10,000 of an AA company's bond through the real button (6.5% a year, due day 1082); no page errors.

## Verification record — v0.70.0 (2026-10-30)

- `npm run check` — **789/789 tests passed** (4 new in `first_bank`); every earlier test passes unedited. `npm run smoke` — 26/26.
- **Parity**: nobody hired — identical to v0.59.0 (`b05b986`); managers hired and deciding — identical to v0.69.0 (`1136c23`) over 25 days.
- Browser (headless Chromium): the bank seen from the street at ten in the morning (the hall visible through the front, the player at the door), the hall from inside, and the bond desk opening the tablet at Bonds through the real interaction (E); no page errors.
- Found while building: a first, larger interior (24 × 14) made the street grow to fit it and four existing tests failed — two signature cars ended against a wall, one test of through traffic and one of a customs run — because hand-placed coordinates in the content are in the grown street's coordinates. The hall was remade at the building's own size; the street, the cars and the roads did not move.

## Verification record — v0.69.0 (2026-10-30)

- `npm run check` — **785/785 tests passed** (6 new in `bonds`); every earlier test passes unedited. `npm run smoke` — 26/26.
- **Parity**: nobody hired — identical to v0.59.0 (`b05b986`); managers hired and deciding — identical to v0.68.0 (`4f36221`) over 25 days (nobody holds a bond, so nothing is created).
- Browser (headless Chromium): the Bonds app, buying 10,000 of a 1-year and 100,000 of a 3-year bond through the real buttons, the holdings after a rise in the policy rate to 6.5% (worth less than paid), selling back at a loss of 4,255 on 100,000 — the app's note says so; no page errors.
- Found while writing the tests: my own arithmetic for a rounded coupon and a "nothing left to pay" bond were wrong (not the code); a bond with its last coupon due today still pays it today.

## Verification record — v0.68.0 (2026-10-30)

- `npm run check` — **779/779 tests passed** (7 new in `bank`); every earlier test passes unedited. `npm run smoke` — 26/26.
- **Parity**: nobody hired — identical to v0.59.0 (`b05b986`); managers hired and deciding — identical to v0.67.0 (`9aabbe8`) over 25 days. The scripted games end before the bank's first meeting on day 91; from day 91 a game that leaves 5% differs from v0.67 in valuations and prices **by design**.
- Browser (headless Chromium): the Bank app before the first meeting and after twelve months with a busy spell (rate 2.25%–5.25%), the effects and the record; no page errors.
- Found while building: deciding *before* the wider world's day made the first meeting after a long sleep read a stale month (sales "−96%"); the bank now decides after the world's day, on the world as it stands.

## Verification record — v0.67.0 (2026-10-30)

- `npm run check` — **772/772 tests passed** (3 new, 2 changed on purpose in `exchange`, now 12); every other test passes unedited, including the Ober's Oil and Moneybucks tests (their dividends and purchases are insensitive to the fee and the smoothed price).
- **Parity**: nobody hired — identical to v0.59.0; managers hired and deciding — identical to v0.66.0 (`d0dba2c`) over 25 days (neither holds Ober's Oil, so the price change does not show there; it is covered by the tests above).
- Browser (headless Chromium): Ober's Oil's Stocks screen with the rules line and a purchase (159 obols, 2 fee), the Exchange board and panels for OBRO and CHZ; no page errors.
- Found by reading the code before changing it: **Chuckie's Cheese already had a fee, a cap and a smoothed price**, so 0.66.0's statement that it had none was wrong; corrected in this release.

## Verification record — v0.66.0 (2026-10-30)

- `npm run check` — **769/769 tests passed** (9 new in `exchange`); every earlier test passes unedited. `npm run smoke` — 26/26.
- **Parity**: nobody hired — identical to v0.59.0 (`b05b986`); managers hired and deciding — identical to v0.65.0 (`cf3c138`) over 25 days, so the exchange (created on the first morning of the wider world) moves no money and uses no game RNG.
- Browser (headless Chromium): the Exchange app with the board over twenty-odd days of prices, a company panel, buying 10 and selling 1 through the real buttons with the fee, and Meridian's panel under its own rules; no page errors.
- Found while building: the first test of a price floor used a price whose step did not reach it; Meridian's ticker is on the content record, not the company's; the first listing prices (about 0.2–3.5 obols at the companies' own share counts) were too small to trade, so the exchange keeps its own share count per listing.

## Verification record — v0.65.0 (2026-10-30)

- `npm run check` — **760/760 tests passed** (8 new in `management_treasury`); every earlier test passes unedited. `npm run smoke` — 26/26 (no new smoke checks).
- **Parity**: nobody hired — identical to v0.59.0 (`b05b986`); managers hired, budgets set and the v0.63 decisions happening, **no treasury policy** — identical to v0.64.0 (`d174124`), including the whole decision log. Treasury changes nothing until a policy is set.
- Browser (headless Chromium): the Treasury budget and policy controls, setting a floor and ceiling through the real button, a chief financial officer topping a subsidiary up from the parent (60,000 from 20,000), the status line and the log; no page errors. (The reserve control was exercised by the suite, not by hand.)
- Found while building: a manager without the permission is not a *candidate* for the decision, so there is no refusal line for it — the status note says what is missing instead; the first test of the reserve forgot the recruiting fee the parent had already paid.

## Verification record — v0.64.0 (2026-10-29)

- `npm run check` — **752/752 tests passed** (13 new in `management_plans`); every earlier test passes unedited. `npm run smoke` — 26/26 (no new smoke checks).
- **Parity**, three runs: (1) nobody hired — identical to v0.59.0 (`b05b986`); (2) five people hired, businesses funded, no budgets — identical to v0.62.0 (`f883496`); (3) the same with **v0.63 budgets set and the managers' decisions actually happening** (reorders and hires queued, then lapsing) — identical to v0.63.0 (`a408883`), money, orders, staff and the whole decision log — so the new bids and plans change nothing until a margin or a plan is set.
- Browser (headless Chromium): the Management tab with the margin box, the contracts and expansion budgets, approving a farm-plot plan through the real form, a farm manager buying the plot from the farm's account, the plan's status, the log; no page errors. The bid and arms-station flows are tested by the suite, not by hand in the browser.
- Found while building: the plot "next to yours" rule had to be eight tiles (the real lanes between the fields are six to seven, not three); `arms.place` overrides the factory's and had to pass the dock through; a bid test that built its ceiling from a different quote exposed that a ceiling below cost is (correctly) never bid.

## Verification record — v0.63.0 (2026-10-29)

- `npm run check` — **739/739 tests passed** (19 new in `management`); every pre-existing test passes unedited **except one assertion in `personnel`** (the farm's list of openings now also names a farm supervisor, deliberately). `npm run smoke` — 26/26 (no new smoke checks).
- **Parity**, two runs: (1) a scripted 20-day game with nobody hired matches v0.59.0 (`b05b986`) exactly; (2) a scripted 25-day game with five people hired (managers at all four businesses), the businesses funded and **no budgets set** matches v0.62.0 (`f883496`) exactly — money at each fifth day, orders, purchase orders, staff and wages — so stage 7 does nothing until a budget is set.
- Browser (headless Chromium, the built `index.html`): the Management tab empty; budgets set through the real buttons; a general manager hiring a farm supervisor within budget; a procurement manager's 28,060-obol reorder queued, then approved with the button and paid; the log; no page errors. An earlier version of this stage's tests had wrongly expected the actor total to exclude the hiring fee of the person themselves (the same person id is noted against hires) — the tests now compare the change.
- Not covered by an automated test: the Management screens themselves (checked by hand, as with the other tablet apps).

## Verification record — v0.62.0 (2026-10-29)

- `npm run check` — **720/720 tests passed** (34 new: `personnel` 23, `personnel_effects` 11); the existing suite passes **unedited** after the effect hooks were added. `npm run smoke` — 26/26 (no new smoke checks; the Personnel app was checked by hand in the browser).
- **Parity**: a scripted 20-day game (all four businesses bought, parts ordered, plots bought) run on this build and on a worktree of v0.59.0 (`b05b986`) with nobody hired printed identical money, market prices and shipping ledger.
- Browser (headless Chromium, the built `index.html`): the Personnel tab with Openings, Candidates (filters, an offer through the real button, three-way comparison), Staff (manage, promote and move options following the chosen job), Payroll; no page errors. Found and fixed in this check: a tab name clashing with the existing journal "People" tab (now "Personnel"); Promote offering a parent-only job at an arms works; Openings recommending an executive for a manager's job.
- Not covered by an automated test: the Personnel screens themselves (checked by hand, as with the Group and Companies apps).

## Verification record — v0.61.0 (2026-10-29)

- `npm run check` — **684/684 tests passed** (43 new across `corporate_group`, `corporate_loans`, `corporate_consolidation`); the existing suite passes **unedited** after the account changes. `npm run smoke` — 26/26 (no new smoke checks this release; the Group app was checked by hand in the browser).
- Browser (headless Chromium, the built `index.html`): the Group app with no parent, founding it (the naming panel opening after the tablet closes), a funded parent with four subsidiaries (capitalise / lend / send up / policy controls, a loan with its repayment line), the statements (separate and consolidated with the elimination note and check line, cash, value, who contributes, the parent's ledger, recent transfers), and the Companies app showing no money buttons for a subsidiary; no page errors. A stale naming prompt could swallow a waiting one (found in this check) — fixed.

## Verification record — v0.60.1 (2026-10-29)

- `npm run check` — **641/641 tests passed** (6 new in `corporate_paths`); `npm run smoke` — 26/26.
- Parity re-run on the shipped code (Node, 20 game days, all four businesses bought and run): identical to v0.59.0 line for line. Audit of every `player.money` use in `src`: one business path found on the wallet (naval missions) and fixed.
- Save size (Node): a new game 87 KB (was 105), 145 KB after 400 days (was 206).
- Browser (headless Chromium, the built `index.html`): the naming panel after each business founded through its real interface (Lucas's dialogue, Fleet Command's Buy button, the aeroworks sale panel, the Land Office closed with Esc); no page errors.

## Verification record — v0.60.0 (2026-10-29)

- `npm run check` — **635/635 tests passed** (56 new across `corporate_accounts`, `corporate_funding`, `corporate_identity`, `corporate_world`, `corporate_metrics`); the 579 existing tests pass **unedited** after the payment layer. `npm run smoke` — 26/26 (no new smoke checks this release; the Companies and Intelligence apps were checked by hand in the browser, below).
- Parity (Node, 20 game days, all four businesses bought and run): wallet and ledger figures identical to v0.59.0 at every step.
- World (Node, three seeds × two years): 46–54 companies alive, no company with negative cash or runaway capacity, newcomers every few months in busy sectors, occasional failures; each save/load round trip identical to the digit.
- Browser (headless Chromium, the built `index.html`): the naming panel after founding (rejecting a too-short name, accepting a good one, the next business's prompt following), the Companies app (unfunded and funded, with arrears), Intelligence (arms ranking with the owner's company ringed, a selected rival with the comparison, energy with Ober's Oil unranked); no page errors.

## Verification record — v0.59.0 (2026-10-28)

- `npm run check` — **579/579 tests passed** (49 new across `aerospace_orbit`, `aerospace_research`, `aerospace_achievements`, `aerospace_reports`); `npm run smoke` — 26/26 (new: the aerospace terminal draws every page).
- Simulation (Node, 60 game days, Meridian alone): unchanged — 47 deliveries, 5 launches; satellites it built for customers pay it a few thousand a day in support. An own satellite ordered for Meridian was built, launched and earning in about three weeks.
- Browser (headless Chromium, the built `index.html`): the Orbit page (the Earth turning, orbits, ringed own satellites, the ground station's beams, every market card, the ordering sheet, the fleet), the dishes on the map leaning toward a pass, the Research tree with a project under way and two queued, the Standing page with achievements, every Books tab. No page errors. Screenshots: `docs/mockups/v059-*.png`.

## Verification record — v0.58.0 (2026-10-26)

- `npm run check` — **530/530 tests passed** (30 new across `aerospace_flight` and `aerospace_launch`); `npm run smoke` — 25/25.
- Simulation (Node, 60 game days, Meridian alone): unchanged economics (the departures and launches add minutes, not money); 5 launches, 47 deliveries, no exceptions.
- Browser (headless Chromium, the built `index.html`): an aircraft pushed back, taxiing, rolling (runway 27 and 09), climbing; a sortie of the test Kestrel and its landing (final, touchdown, braking, taxi in); a rocket on the crawler, on the pad, the countdown board, ignition by day and night, lift-off, the trail, stage separation, a loss; a convoy on the service road and Meridian Way; the terminal with a countdown running. No page errors. Screenshots: `docs/mockups/v058-*.png`.

## Verification record — v0.57.0 (2026-10-24)

- `npm run check` — **499/499 tests passed** (37 new across `aerospace_halls`, `aerospace_staff`, `aerospace_config`, `aerospace_events` and `unitLook`); `npm run smoke` — 25/25.
- Simulation (Node, 60 game days, Meridian alone): stays near break-even with the new staff and quality rules; MRDN price tracks fair value; option margins 1.47–1.60× their cost.
- Browser (headless Chromium, the built `index.html`): the West Works and the north plot as building sites, the same halls built (frame, crane, then finished), walking into a built hall (and being refused at a site: "Still a building site"), the floor with nine bays, the Hangar page (people, quality, halls), tender configuration chips, the Standing page with a decision to take, an audit alert on the overview. No page errors. Screenshots: `docs/mockups/v057-*.png`.

## Verification record — v0.56.1 (2026-10-22)

- `npm run check` — **462/462 tests passed** (1 new in `aerospace.test.mjs`: `unitLook` matches the bays in the world); `npm run smoke` — 25/25.
- Browser (headless Chromium, the built `index.html`, 1440×900, 1280×800 and 760×900): the new Operations screen — the floor with four bays (a Meadowlark mid-build with welders, two idle, one under construction), a unit's card with its build stage by stage, every page (tenders, contracts, supply, hangar, books, Meridian), a sealed bid placed through the composer, ⏭ next morning running the clock, Esc back to the floor, the read-only MRDN board before buying Roost, the narrow layout. No page errors. Screenshots: `docs/mockups/v0561-*.png`.

## Verification record — v0.56.0 (2026-10-22)

- `npm run check` — **461/461 tests passed** (8 new in `aerospace_shipping.test.mjs`); `npm run smoke` — 25/25.
- Scenario (Node): with one ship, the Gullwing Lass sailed empty to Kingsfjord, loaded 18 units, sailed, landed and trucked them to stores; internal charge 95 (5%, empty leg) against 1,907 a carrier would charge, voyage costs 823, group saving 1,084. Consignments with no free ship fell back to the carrier after 24 h at the market rate.
- Browser (headless Chromium, the built `index.html`): the Supply tab with both companies owned (shipping mode and policy, savings, consignment cards, purchase orders naming the ship, manual orders with carrier and own-ship landed costs), the dashboard, the Books group table, Fleet Command with the laden ship selected. No page errors. Screenshots: `docs/mockups/v056-*.png`.

## Verification record — v0.55.0 (2026-10-22)

- `npm run check` — **453/453 tests passed** (14 new in `aerospace.test.mjs`); `npm run smoke` — see the commit.
- Simulation (Node, 60 game days, Meridian alone): ~94 units delivered (9 late), revenue ≈ 34M against costs ≈ 31M, bays 90–100% busy (light bays ~40%), the share price following fair value smoothly; ~70 ms of CPU per game day.
- Browser (headless Chromium, the built `index.html`): the Cut, Starling and Derrick Row, Roost Aeroworks (Billie's half-built Skylark in its bay), Meridian's forecourt and apron, final assembly with airliners in primer on their jigs, space systems (a rocket on cradles, clean rooms), the runway and tower, the launch complex and pad, the boneyard, night; buying Roost Aeroworks from the sale sheet; every tab of the aerospace terminal. No page errors. Screenshots: `docs/mockups/v055-*.png`.

## Verification record — v0.54.0 (2026-10-22)

- `npm run check` — **439/439 tests passed**; `npm run smoke` — 25/25.
- Browser (headless Chromium, the built `index.html`): roulette (his arrival with circles at his palms; three bets; a spin he watches) and blackjack (he flicks each card to its place; the hole card turns) with the big Morganius; the Spade's Gambit: the deal-in (cards in flight on arcs, trailing sparks), a hand with the Phantom, a Golden, the Lucky Seven and an Hourglass, Conjuring cast with W (a Marvel appeared between his hands), a pair with the Phantom playing as an Ace scored step by step, a Trick won → Morganius's Gift (a Golden J♥ taken) → the Cabinet (with a Spell and a Marvel for sale) → the next Trick's shuffle and deal. No page errors. Screenshots: `docs/mockups/v054-*.png`.

## Verification record — v0.53.1 (2026-10-19)

- `npm run check` — all tests passed; `npm run smoke` — 25/25 (new: panel text stays light after a themed panel — it fails, reading rgb(45, 36, 51), with the fix taken out).
- A contrast scan in headless Chromium: every panel (pause, inventory, map, settings, saves, about, debug, both car showrooms, the cage, the logbook, a shop, a container, a letter, a message, the lift's choices, contracts, invest, exchange, ledger, farmland, livestock, struck down) and every tablet app, each opened after the others, and the dialogue box; every visible text node's colour against the background it actually sits on. Before: the cage, the logbook and the showroom titles under 1.5:1. After: nothing under 3.2:1 except Fender's white-on-stripes banner, which now has an outline.

## Verification record — v0.53.0 (2026-10-19)

- `npm run check` — **435/435 tests passed**; `npm run smoke` — 24/24.
- Browser (headless Chromium, the built `index.html`): the casino floor at 21:00 → "Sit down — Morganius's Table" with E → the Gambit's start card (rules, payout table, record) → bought in (200 → 175 chips) → chose a pair with the number keys (the preview read "One pair 12 × 2 → about 32", matching the rules) → played: the cards slid to the felt and scored step by step (+2, +2, 16 × 2) → three plays → a Trick won → Morganius's Cabinet (three Curios, two Inks, a Rehearsal; Sparks 7) → bought, on to the Feature → left with Esc: the Gambit kept ("play"), chips unchanged. No page errors. Screenshots: `docs/mockups/v053-*.png`.

## Verification record — v0.52.0 (2026-10-19)

- `npm run check` — **424/424 tests passed**; `npm run smoke` — 24/24.
- Browser (headless Chromium, the built `index.html`): new game → the casino floor at 17:10 (Octavius at the cage, Brock on watch) → bought chips at the cage through the panel → sat at the Gilded Wheel with E (the "Sit down" prompt; the host's arrival caption) → the first-person scene: three bets placed by clicking the layout, a spin — the ball settled in the pocket the system drew (6, black) and the loss was settled and shown → left with Esc (seat and position restored) → sat at Blackjack Table One, dealt: a natural, paid 3:2 → the Grand Lobby and Market Street by day and at 21:30 (the marquee lit, the forecourt with the Long Distance and the Last Trick) → Morganius performing on the floor at night → both new Wraths (cards; security and lawyers). No page errors.

## Verification record — v0.51.0 (2026-10-18)

- `npm run check` — **391/391 tests passed**; `npm run smoke` — 24/24.
- Browser at night (22:00, 21:00, 23:00): Canal Row, inside the Kettle & Crumb, Halvermouth — no page errors; the darkness flat, the lamp pools dithered only at their edges, the café lit from inside with its light on the pavement. Frame timing at night: sprinting across Halvermouth and walking through Lanternside, at most one frame over 16.8 ms (on arriving). Measured `drawLighting` at about 1.3 ms a frame (it was 4.5 ms with the first version's per-frame dither pass, and that dither also screen-doored the whole darkness — both fixed before release). Shop fronts: the Kettle & Crumb, the gun shop, Lariat Mercantile. Screenshots: `docs/mockups/v051-*.png`.

## Verification record — v0.50.0 (2026-10-18)

- `npm run check` — **391/391 tests passed** (2 new in `pixelart.test.mjs`: every resident paints in every facing and frame, asleep or angry, inside the person sprite's box; every ordinary car model and the bus has a body, glass, head- and tail-lamps and tyres (and a pickup its bed) and nothing outside its outline).
- Browser: a sheet of 24 residents in four facings and a walk cycle, and every car model at five headings with the two buses (`docs/mockups/v050-people.png`, `v050-cars.png`), rendered from the source modules through the dev server; the café and the Civic Square junction in the game — no page errors; sprinting and walking across Halvermouth and Lanternside, no frame over 16.8 ms. Fixed while testing: the standing pose was mid-stride; height scaling blurred figures (now leg length); window glints made stripes.

## Verification record — v0.49.0 (2026-10-18)

- `npm run check` — **389/389 tests passed** (1 new in `pixelart.test.mjs`: every prop on every map that has a sprite paints, by day and by night and with every fence connection, inside its sprite's box — it caught a razor wire, a statue plaque, the water tower's roof and the silo's dome spilling out of theirs).
- Browser: Civic Square, the Quay, the junction by the square (the lights changing), the flat, the café, the Sumps, the rodeo grounds and the windmill at Lariat — no page errors; sprinting across Halvermouth and Lanternside, no frame over 16.8 ms. Screenshots: `docs/mockups/v049-*.png`.

## Verification record — v0.48.0 (2026-10-18)

- `npm run check` — **388/388 tests passed** (1 new in `pixelart.test.mjs`: Westbrook (a beach and a river) and the Kettle & Crumb built chunk by chunk are pixel for pixel the same as built whole — no seams).
- Chunk build time (Node): about 5–8 ms for a chunk of 8×8 tiles (the first one also makes the noise). Browser: sprinting east across Halvermouth and south through Lanternside — no frame over 16.8 ms, no page errors.
- Fixed while testing: water near a map's edge went dark in a straight line (past the edge counted as land; now the neighbouring map is looked into); a turquoise/navy seam where a beach met a grassy bank (the shallows now go by the distance to the sand alone); the noise broke at the seam between two maps (now sampled in world coordinates); the floors were too grimy (grime is now per place).
- `npm run smoke` — 24/24. Screenshots: `docs/mockups/v048-*.png` (Canal Row, Lighthouse Point, the Westbrook beach and river, the gun shop, a Lariat street, the Grand Hotel).

## Verification record — v0.47.0 (2026-10-18)

- `npm run check` — **387/387 tests passed** (6 new in `seamless.test.mjs`: every building on the six streets has its room laid over it, exactly its size, in its region, with a walk-through door; walking into the Kettle & Crumb and out again crosses seamlessly and keeps walking; a locked door stops you from the street and you can still leave from inside; cars stop at the door; Mags walks out of the café onto the square without a jump; a 0.46 save loads with you on the same spot of the grown street). Tests that named street coordinates now go through `grown()` (`tests/helpers.mjs`); the Osric citation test pins the hourly bang's cooldown so a second random bang can't change Tibbs' mood.
- Fixed while testing: NPCs walked half as fast with a 1-second step (they stopped at every waypoint) — Osric reached lunch late; NPCs next door froze mid-walk while you slept (they counted as on screen).
- `npm run smoke` — 24/24. Browser: the Kettle & Crumb from Canal Row (Mags at the counter), the Herald in Halvermouth, a Lariat house and the chapel — no page errors. Screenshots: `docs/mockups/v047-*.png`.

## Verification record — v0.46.0 (2026-10-17)

- `npm run check` — **381/381 tests passed** (1 new in `vehicles.test.mjs`: from Canal Row by the Kettle & Crumb, driving west for 5 s takes you into Westbrook — it failed before the fix, stuck at x = 1.1; the pixel-ground test now expects world resolution and half-unit detail).
- Reproduced first in a script: westward on Canal Row's southern lane the car stopped at tile 1.1 against Lanternside's edge; after the fix it crossed into Westbrook. (On the next lane up it stopped behind traffic waiting at x 20.7 — not a wall.)
- Browser: Canal Row, Market Street, the Kettle & Crumb and the seven signature cars — 60 fps, no page errors; people about a tile tall; the ground's fine detail; the cars' details legible. Screenshots: `docs/mockups/v046-*.png`.

## Verification record — v0.45.0 (2026-10-17)

- `npm run check` — **380/380 tests passed** (4 new in `specials.test.mjs`: every special weapon is stashed in an owned home container with its ammo and has a sprite, and the new cases stand in their homes; every imported character (signature-car owner) has a signature weapon, and every weapon in the game has a sprite; the Pythagorean's three rounds fly at exactly −36.87°, 0° and 36.87° and the Tinfoil Ray hits two people in a line; the Gavel stuns, the Old Harpoon reels a target in, the Pigeon Launcher sends one running, the Golden Handshake pays 2 obols).
- Browser: the seven signature cars together at the Moneybucks Estate in pixel art; a hotbar of the Gavel, Pigeon Launcher, Plumb Line, Tinfoil Ray, Cheddar Blaster, Old Harpoon, Pythagorean and Golden Handshake; the Pythagorean fired — no page errors. Fixed while testing: long guns came out tiny in the hotbar (icons are now drawn at one pixel per art pixel and scaled up by the page). Screenshots: `docs/mockups/v045-*.png`.

## Verification record — v0.44.0 (2026-10-17)

- `npm run check` — **376/376 tests passed** (3 new in `gunplay.test.mjs`: a revolver shot puts a bullet in flight, kicks the camera, ejects a case and draws blood, and both end up on the ground; an NPC's bullet takes time to arrive, hits a player standing still and misses one who sidesteps; you step into a swing and the dead leave a pool). The older combat, police and gang tests pass unchanged with NPC shots now flying.
- Browser: three revolver shots across Civic Plaza — the gun held out toward the crosshair, the bullet streak, cases by your feet, no page errors. Fixed while testing: cases landed two tiles away (they now start from the ground and fly slower). Screenshot: `docs/mockups/v044-gunplay.png`.

## Verification record — v0.43.0 (2026-10-17)

- `npm run check` — 373/373 (no game logic changed); `npm run smoke` — 24/24.
- Browser: the title screen; Civic Plaza at 22:00 (banded lamp pools); the inventory, the OberPad, the Kettle & Crumb's shop and a conversation with Mags in the navy style; Yard 1's terminal unchanged — no page errors. Fixed while testing: the inventory's stat and item cards kept their cream backgrounds under light text (unreadable) — now dark; a first try reset the terminals' buttons to the browser's defaults (they are now simply left out of the restyle). Screenshots: `docs/mockups/stage5-*.png`.

## Verification record — v0.42.0 (2026-10-17)

- `npm run check` — **373/373 tests passed** (2 new in `pixelart.test.mjs`: every character draws in pixel art facing every way, walking and asleep, with finite coordinates; the hotbar has an icon for fists and every weapon in the game).
- Browser, side by side with `docs/mockups/mock-street.png`: Civic Plaza with a revolver, bat and shotgun in the hotbar, Canal Row (Mags seen behind the Kettle & Crumb's counter), Market Street — 60 fps, no page errors. Fixed while testing: a building's back wall cut off the heads of the people inside (they now stand in front of it); the first build failed on an import cycle (held weapons are now passed in). Screenshots: `docs/mockups/v042-*.png`.

## Verification record — v0.41.0 (2026-10-17)

- `npm run check` — **371/371 tests passed** (2 new in `towers.test.mjs`: Vantage Point's lobby opens at noon and shuts at night; its lift offers floors 12, 23 and the roof, rides there and back, floors are aloft over Halvermouth and the roof has its helipad; the Atlas Rooms' and Harbourline's stairwell lifts reach their roofs; every tower floor has a lift; the Oil Tower is still appointments only). Validator: 0 errors (it learned the `lift` interaction).
- Browser: Vantage Point from the street (a roofless lobby), the lobby (two lifts, reception), the Sky Lounge (glass walls, the city below), the helipad roof, the Atlas Rooms' roof — 60 fps, no page errors. Fixed while testing: you arrived standing on top of the lift doors (now a tile in front); the roofs had the Ober Oil tank on them (now water butts); the city below was too small to read (now larger, less haze). Screenshots: `docs/mockups/stage4-*.png`.

## Verification record — v0.40.0 (2026-10-17)

- `npm run check` — **369/369 tests passed** (1 new in `pixelart.test.mjs`: every ordinary building on every map draws with nothing above its walls; every cutaway piece of furniture sits inside the walls; the Kettle & Crumb's cutaway has its counter).
- Browser: the Kettle & Crumb from Canal Row (its counter, tables and tiled floor), Market Street (Dinah's counter and tables, the pawnshop's shelves, display and counter), Pecan Street in Lariat (houses) and the Sumps' shacks — 60 fps, no page errors. Fixed while testing: wall tops were near-white on pale buildings (now a shade of the wall); Lariat's houses got shop shelves (now a bed, wardrobe and stove). Screenshots: `docs/mockups/stage3-*.png`.

## Verification record — v0.39.0 (2026-10-17)

- `npm run check` — **368/368 tests passed** (2 new in `pixelart.test.mjs`: every map's pixel ground builds at 16 art pixels a tile with whole-pixel rects and Lanternside gets its centre line; every prop on every map draws in pixel style or falls back without throwing).
- Browser: Halvermouth, Lanternside (Canal Row) and the Kettle & Crumb at 60 fps, no page errors — kerbs, centre lines on 4-lane roads, the tiled café floor, back wall with wainscot, the new counter, tables, chairs, shelf, oven, display case, plant, trees, lamps, flowerbed, hydrant. The first tree was a rounded square; redrawn as three clumps. Screenshots: `docs/mockups/stage2-*.png`.

## Verification record — v0.38.0 (2026-10-17)

- `npm run check` — 366/366 (no logic changed); `npm run smoke` — 24/24.
- Browser: Civic Plaza, Market Street, the Kettle & Crumb and a row of every car model — the world pixelated at even pixel sizes, 60 fps; shop signs ("RIALTO · PICTURES", "MARKET HALL", "BANK") crisp after the text fix (they were illegible on the first try); the new HUD. Screenshots: `docs/mockups/stage1-*.png`.

## Verification record — v0.37.0 (2026-10-16)

- `npm run check` — **366/366 tests passed** (5 new in `factorio.test.mjs`: inserters/sorters walkable and on a worker's path, an older save's solid inserter fixed on load; a wooden chest fills to exactly 100 from an iron one, opens as your container, and returns its contents when picked up; a filter inserter idles unset, offers what the chests hold, then moves only its item; a sorter routes springs right and steel straight, then splits 10 → 5/5 unfiltered; a belt carries you > 50 px in 1.5 s; filters and chest contents survive a save).
- Browser: built chest → inserter → belts → sorter (springs off down a belt into a chest, steel straight on into another) plus a filter inserter in Yard 1 Works; all drawn and running, no page errors.

## Verification record — v0.36.0 (2026-10-16)

- `npm run check` — **361/361 tests passed** (6 new in `homes.test.mjs`); validator 0 errors with the new rules (and the bed rule was proved live: a test plants a cot in the café and the checker catches it — on the first run it didn't, because a comment had swallowed the error call; fixed).
- Browser: at 11 Gullwing Row's door the prompt offers a break-in; with a crowbar, forced it — Mabel saw, a call went in; inside Mags's flat (bed, stove, dresser, cookbooks). Fixed during testing: the choices panel didn't know the homes system ("target[method] is not a function"); hired hands couldn't get back into the works after a night at the Lodging House (the works door now admits its own staff).

## Verification record — v0.35.2 (2026-10-16)

- `npm run check` — **354/354 tests passed** (1 new: a car nosed into the Kettle & Crumb's wall and floored never centres inside the building, ends clear and lets you out; overlapping another car you can still back away). The test fails on v0.35.1. Two older tests (`streets`, `pursuit`) relied on the bug — a car started off the map, and a pull-over staged among the plaza's lamp posts — and were moved onto real roads. (The first push of this fix went out with those two failing; corrected in the next commit.)
- Reproduced first: a Pipit overlapping the café wall, accelerator held, spent 19 frames centred inside buildings. After the fix: 0, headless and in the browser (holding W for 3 s; E got out). Exit sweeps (Lanternside, every map edge) still 0 failures.

## Verification record — v0.35.1 (2026-10-16)

- `npm run check` — all tests pass (3 new regression tests; both bus tests fail on the old code).
- Browser: boarded the No. 1 at the Yards and got off at the next stop (Mill Road), the No. 2 in Lariat at noon, and the No. 2 at 22:45 riding past closing time to Justice Way — all with the E key. Got out of cars (Pipit, Bullion, Tempest) by the Kettle & Crumb.
- Sweeps: getting out at every drivable spot (5 models × 12 angles) on Lanternside, and along every outdoor map's edges — 0 failures (6 before the fix, in Halvermouth and the Yards).

## Verification record — v0.35.0 (2026-10-15)

- `npm run check` — **351/351 tests passed** (4 new in `livingworld3.test.mjs`: errands vary over 40 days within the region and are deterministic; Rosa and Lorna choose the same place on a meet day and both walk there; a call goes reported → responding → investigating → closed, through a save mid-investigation, the witness telling the officer, the officers back on their beats; the checker catches a one-sided meet-up and an unknown errand); validator 0 errors.
- `npm run smoke` — 24/24.
- Browser: a call placed in Halvermouth, officers responding, the incident marked on the world map. No page errors. Found and fixed during testing: incidents never closed when the officers' own routine ended the dispatch first (closing is now by "nobody attending").

## Verification record — v0.34.0 (2026-10-15)

- `npm run check` — **347/347 tests passed** (5 new in `signatureCars.test.mjs`: one car per imported character, each parked on clear ground out of every lane, unique plates; older saves gain them once; dealers refuse them and the owner minds; the Gavel saluted and the Paranoia unseen by an officer with a clear view; the Landlubber sails 30% faster than its road top speed while a Pipit can't enter the water); validator 0 errors with the new rule.
- `npm run smoke` — 24/24.
- Browser: all seven cars rendered together (checked by eye), and the Landlubber driven across the Yards harbour leaving spray. No page errors. Found and fixed: "Look at the The Landlubber" (names dropped their "The"); the Landlubber's sea speed was capped at its road speed; the Hypotenuse's fourth wheel floated outside its triangle (now a three-wheeler).

## Verification record — v0.33.0 (2026-10-15)

- `npm run check` — **342/342 tests passed** (6 new in `worldsim.test.mjs`: two lines, every stop on its route with a place to wait, the No. 2's hours; an older save's buses kept and the new line's added; Wade's round trip on the No. 2 phase by phase; a passenger through a save (once, hidden, gets off); Quinn always the quick way on the No. 1; the player riding the No. 2 to Lariat and paying 3 obols); validator 0 errors with the new transit rules.
- `npm run smoke` — 24/24.
- Traced by script: Wade walks from the parlour to the Church Street stop, boards at 19:16, reaches Justice Way at about 19:55 and walks on to the plaza; the ride home leaves at 21:29. Quinn rides Westbrook Row → Civic Plaza on the No. 1 and comes back the same way round. Found and fixed: passengers boarding a No. 1 going the long way round (via the Yards); buses and stops all painted "1". (A bus waiting forever turned out to be waiting for the test's player, standing in FM 38.)
- Browser: the world map with both routes drawn, a No. 2 at the Cotton Street stop. No page errors.

## Verification record — v0.32.0 (2026-10-15)

- `npm run check` — **336/336 tests passed** (5 new in `worldsim.test.mjs`: every character has a home or exception and the checker catches a homeless or doubled-up resident; the four flats, tenants asleep in their own, private doors; an officer walking a beat on screen (≥3 waypoints, >20 distinct tiles) and off; a conversation pausing and resuming a beat, and a save keeping the place on it; every officer's beat and the cruiser). Two tests updated (the crew's flats; a voyage test's robust wait). Validator 0 errors with the new rules.
- `npm run smoke` — 24/24.

## Verification record — v0.31.0 (2026-10-15)

- `npm run check` — **331/331 tests passed** (4 new in `farming.test.mjs`: pastures, stock by area and kind, animals drawn; feeding, produce, hunger and losses; cattle growth, auction demand and overnight recovery; the books, the herd through a save and back on the map, Wes and the feed; the Co-op test now expects demand); validator 0 errors.
- `npm run smoke` — 24/24.
- Browser: a pasture with a dozen calves grazing, the Hoof & Horn sale ledger, the tablet's Farm app with plots, feed, prices and the books. No page errors.

## Verification record — v0.30.0 (2026-10-15)

- `npm run check` — **327/327 tests passed** (5 new in `farming.test.mjs`: plots, buying once; by hand vs. with a tractor parked by the field; growth, harvest once, the Co-op, spoiling; the field redrawn as the crop grows and the price band; saves, older saves, the three tractor tiers, shops and people); validator 0 errors. `logistics.test.mjs`'s export test made robust to en-route delays.
- `npm run smoke` — 24/24.
- Browser: Red Dirt's lot and dealership panel (tractor previews), buying a plot and a Longhorn, tilling and planting corn with it (33 minutes each), the corn growing in the field, the plot panel. No page errors.

## Verification record — v0.29.1 (2026-10-15)

- `npm run check` — **322/322 tests passed** (1 new: Lariat's grid reachable from the gate, fields all on field tiles and none on the creek, no per-frame crop props, no street furniture on roads/buildings/water/fields, two junctions with lights and crossings, the arch and the North Gate's gateposts and sign, no sea-wall border); validator 0 errors.
- `npm run smoke` — 24/24.
- Browser (headless Chromium): the whole of Lariat rendered in one image before and after; close-ups of the arch, Main & FM 38, Cotton & FM 38, the cotton field and Halvermouth's North Gate; the world map. 60 fps over the cotton field (the per-frame stalks are gone). Fixed from the runs: the arch's beam floating above its posts, an overflowing sign on the one-tile ridge, a lamp and a tree in the road, a front walk that ran to the map edge. No page errors.

## Verification record — v0.29.0 (2026-10-15)

- `npm run check` — **321/321 tests passed** (13 new in `lariat.test.mjs`: Chuckie imported and protected with the stampede Wrath; Lariat reachable through the North Gate with every door, hideout and the paddock reachable on foot; a new game's cows loose at their hideouts; Chuckie's quest states and no repeated intro; the lasso always in stock and buying it advancing the quest; no rope without a lasso, roping first starting the quest; a roped cow following at walking pace and coming home in the paddock (capacity 55% → 64%); waiting outside interiors, not chasing you across the county, and staying roped through a save; the reward paid once, also after a load; production, dividends once a day and the price toward fair value; the anti-exploit limits; an older save gaining the dairy; the company board and markers; a cow crossing the North Gate with you); validator 0 errors (it now also rejects duplicate ids).
- `npm run smoke` — 24/24.
- Browser (headless Chromium, 1280×800): Main Street, the dairy yard and paddock, Bessie at her hideout and in conversation (cow portrait), Chuckie in conversation (photo portrait), five interiors, the exchange on CHZ and the tablet's Stocks app, the world map with Lariat north of Halvermouth, and Chuckie's Wrath frame by frame. Fixed from the runs: Bessie's hideout was in the middle of Dairy Road (moved behind the diner); the dividend per share read 0.000 (now per 100 shares); a roped cow fell behind a walking player (she now trots to catch up, never faster than your sprint). No page errors.

## Verification record — v0.28.0 (2026-10-15)

- `npm run check` — **308/308 tests passed** (4 new in `geography.test.mjs`: capitals on land; every port on land, on the coast, near its capital and reachable by sea; 22–45% land, coastlines far longer than a disc's, over 60 landmasses, the Morrow archipelago; deterministic); validator 0 errors. The existing sea-route tests pass on the new coasts.
- `npm run smoke` and `npm run smoke -- --dev` — 24/24 each.
- Browser (headless Chromium, 1440×900): an equirectangular preview of the whole world with every port and capital marked; the arms terminal's globe (Market tab) with true coasts, borders and the hovered country lit, opening in under 0.1 s and running at ~48 fps; Fleet Command's chart at default and zoomed in, dragged; sending a ship along the new coasts. Fixed from the runs: a wrap-around bug that smeared land in strips across the ocean, too many single-pixel islands, a stale reference left over from the dot matrix. No page errors.

## Verification record — v0.27.0 (2026-10-15)

- `npm run check` — **304/304 tests passed** (4 new in `boarding.test.mjs`: on every stock ship and every hull fully fitted, from either side's gangway the way below and every fitting are reachable; below decks every interactive fitting is reachable and the way up exists; mooring, the gangway, the wheel and logbook, casting off with you aboard; aboard through a save, and hiding a ship you're on); validator 0 errors.
- `npm run smoke` and `npm run smoke -- --dev` — 24/24 each.
- Browser (headless Chromium, 1440×900, real keyboard): five ships moored across three berths (the Gullwing Lass and the Bluecap container ship at Mill Road, the Brig at Sund, the Destroyer and the Starwake at Meridian), each life-size with its fittings; walked west off the pier, up the gangway and onto the Gullwing Lass's deck; walked north into the bridge door and arrived below decks; took the wheel ("You take the Gullwing Lass's wheel. She's alongside at Mill Road Docks…") and read the logbook. Fixed from the runs: decks split by the bridge or by fittings on narrow hulls (now a port-side walkway on every deck), a part's footprint spilling across the gap around the bridge, the skiff's gangway blocked (an open deck now), warship bridges drawn black (`shade()` on an already-shaded colour). No page errors.

## Verification record — v0.26.0 (2026-10-15)

- `npm run check` — **300/300 tests passed** (4 new in `shipbuilder.test.mjs`: layouts never change numbers and survive keel, launch and reload; broken layouts fall back; attachment points per hull; every part drawn and every stock ship's fit drawn without errors); validator 0 errors.
- `npm run smoke` and `npm run smoke -- --dev` — 24/24 each.
- Browser (headless Chromium, 1440×900, real mouse): a contact sheet of all 23 stock ships and all 35 parts; in Fleet Command → Shipyard, chose the freighter hull, dragged a diesel engine from the tray onto a point and the integrated bridge onto another, clicked container bays, a crane, a reefer and a generator into free points; the meters, requirements, performance and bill updated; Buy 7 missing parts, Lay the keel → "The Freighter No. 1 is on the slip — 4.8 days"; Slips & yards showed the build; after 8 days it launched with its layout and is drawn side-on in Fleet. Fitted a destroyer (turbine, turbo-generator, guns, missiles, radar, sonar, bridge, comms, armour — 10/10 points, 4/8 mounts) and a sailing trader (sails, topsails, hold, crow's nest). Fixed from the runs: parts too small against long hulls (proportions stylised), the sea spilling outside the frame, oversized bridges on small craft, the hull number over the point labels. No page errors.

## Verification record — v0.25.0 (2026-10-15)

- `npm run check` — **296/296 tests passed** (5 new in `fleetcommand.test.mjs`); validator 0 errors.
- `npm run smoke` and `npm run smoke -- --dev` — 24/24 each.
- Browser (headless Chromium, 1440×900, real mouse): bought the company from the full-screen sale view; the home drawer's "Best jobs" sent the Gullwing Lass with one click; ⏭ Next event ran the clock to its departure; wheel zoom; opened on Mill Road Docks — contracts with the protection fold-out (guards, insurance, suggested escort, other ships), a mission sent with its pre-picked three-ship team; Fleet, Buy (cargo, warships, ports), Shipyard and Ledger sheets; Esc leaves a sheet, then closes; the tablet's Ships app opens it and closing returns to the tablet; "Send to…" then hovering Sund Harbour showed the dashed route and "7 h · costs 29", clicking sent the ship. Fixed from the runs: blocky land (now sampled at 0.5° and smoothed), the paper theme's white hover on dark buttons, "null" printed by an optional line, a misleading "no ship can take it" (now the real reason). No page errors.

## Verification record — v0.24.0 (2026-10-15)

- `npm run check` — **291/291 tests passed** (8 new in `shipyard.test.mjs`); validator 0 errors (now proving every hull can be fitted out).
- `npm run smoke` and `npm run smoke -- --dev` — 24/24 each.
- Saves tested across the expansion (logistics, naval and shipyard tests): a ship docked, under way, loading and on a contract; a convoy at sea; a stored pirate encounter pending; a warship on a mission; the shipyard under construction; a ship on the slip — each reloaded and resolved exactly once.
- Browser (headless Chromium, real mouse): commissioned the Mill Road shipyard — scaffolding on the quay and daily progress reports; when ready, the slipway; the Shipyard page's designer (freighter hull, six parts, maroon and gold paint; incompatible parts greyed with reasons; "✔ Seaworthy"); "Buy missing parts" then "Lay the keel" → "The Freighter No. 1 is on the slip — 4.5 days"; the hull drawn on the slipway at 22%; launched to berth 1 with its parts on deck. Fixed from the runs: a bollard and lamp stood on the slipway. No page errors.

## Verification record — v0.23.0 (2026-10-15)

- `npm run check` — **283/283 tests passed** (10 new in `naval.test.mjs`); validator 0 errors (now including the logistics registries).
- `npm run smoke` and `npm run smoke -- --dev` — 24/24 each.
- Simulated (node): unescorted risk from Mill Road — Sund and Lirre 0.8% (worst: a delay), Coup Cove 18% through the Pallas blockade and Reach (worst: captured), Varn 10% through its war zone; a frigate escort cut Coup Cove to 13% (worst: cargo) and added Fleet communications; mission estimates spread by ship type (a distress call ~95% for a frigate; a deterrence sweep ~20% for a frigate, ~70% for a battleship).
- Browser (headless Chromium): the Warships page with sail ships drawn under canvas; a contract's assign box with guards, insurance and escort choices and the risk line ("risk high (13%) · worst case: the cargo seized · through the Free State of Pallas blockade, the Pallas Reach"); the chart with pirate waters, war zones and the convoy; the Missions page with an estimate ("even odds (about 41%) · fitness 27/100"); the schooner and galleon at their Yards berth. Fixed from the runs: contract rows showed a fixed "risk low" label regardless of route (now the route's actual risk). No page errors.

## Verification record — v0.22.0 (2026-10-15)

- `npm run check` — **273/273 tests passed** (4 new own-fleet export tests in `logistics.test.mjs`); validator 0 errors.
- `npm run smoke` and `npm run smoke -- --dev` — 24/24 each.
- Browser (headless Chromium): with a licence, Yard 1 Works and Ober & Sons, an order of 12 crates for Lirre showed "⚓ Gullwing Lass — 2.2d · costs 143" in the FILL form (Morrow Blue Line would have charged ~1,320); SHIP 12 CRATES loaded and sailed it; the contact list read "⚓ GULLWING LASS · ETA 44H" and the globe drew the voyage along its sea lane. No page errors.

## Verification record — v0.21.0 (2026-10-15)

- `npm run check` — **269/269 tests passed** (13 in `logistics.test.mjs`, 5 in `character_ober.test.mjs`); validator 0 errors.
- `npm run smoke` and `npm run smoke -- --dev` — 24/24 each.
- Browser (headless Chromium, real keyboard and mouse): the Yards docks (Quay Road, cranes, bollards, three berths, the Salty Ober); Captain Ober on the quay in his peaked cap with his portrait in dialogue; "I hear the company's for sale" → the sale sheet (price, ports, ship, access) → Buy (120,000 → 80,000) → the Overview; Chart, Fleet, Contracts, Brokerage and Ports pages; after buying a Bluecap, both ships drawn at berth 1 with name boards; the tablet's Ships app with a contract under way, hovering the ship on the chart showed its route, progress, ETA and cargo; attacking Captain Ober played the kraken Wrath to his last line. Fixed from the runs: the dialogue box covered the sale sheet (now hidden while a panel it opened is up, and its topics are rebuilt after); the kraken's eye covered the banner (it now opens in the whirlpool); the chart's land looked tiled. No page errors.

## Verification record — v0.20.0 (2026-10-15)

- `npm run check` — **251/251 tests passed** (11 new in `streets.test.mjs`; transit, world, Halvermouth and quest tests updated for the widened coordinates); validator 0 errors.
- `npm run smoke` and `npm run smoke -- --dev` — 24/24 each.
- Browser (headless Chromium, real keyboard): at Bank Row × Precinct Row the four-tile roads, crossings and four traffic lights cycled; a westbound car waited at red and moved off on green; a pedestrian crossed on the green man. Driving east and steering hard, the wheel turned in, the handbrake let the tail out (slip 0.26 rad at 268 px/s) and laid tyre marks. Wellhead Circle, Lamplighter Circle, the Yards gate on Mill Road, the East Gate and the city's turning circles render as places, not dead ends. Over ~20 s among traffic the only sounds were the engine and a door — no horn. Fixed from the runs: the city ambience's synthetic horn beeps (removed) and the siren on cruisers driving away (off); new statues all read "FOUNDER" (now labelled). No page errors.

## Verification record — v0.19.0 (2026-10-14)

- `npm run check` — **240/240 tests passed** (market and arms tests rewritten for crates; new: crate content and order limits, the workbench, `crates`); validator 0 errors.
- `npm run smoke` and `npm run smoke -- --dev` — 24/24 each.
- Browser (headless Chromium, real mouse): the Market tab listed open orders (e.g. Varnistan 21× Crate of 9mm Pistols at 1,297 per crate, expiring Day 4); FILL opened the shipper form; SHIP 21 CRATES booked it ("Morrow Blue Line will deliver 21 crates to Varnistan in 2 days: 27,237 obols on arrival"). E at the armourer's workbench opened it; Make on the 9mm Pistol used the dock's parts, passed 30 minutes and put one pistol in the pack. Fixed from the runs: stray "null" lines in the Market tab. No page errors.

## Verification record — v0.18.0 (2026-10-13)

- `npm run check` — **237/237 tests passed** (7 new in `pursuit.test.mjs`); validator 0 errors.
- `npm run smoke` and `npm run smoke -- --dev` — 24/24 each.
- Simulated chases (node): at ★★★ two cruisers converged and rammed, and sitting still got you pulled over; floored east in a Corsair at ★, the Halvermouth cruiser was left behind at the gate and a fresh one picked you up in Westbrook. Browser (headless Chromium): in a stolen Pipit at ★★ by Civic Plaza a cruiser arrived with its light bar flashing, rammed, and the HUD showed "🚓 ×1 in pursuit" and "PULLED OVER — drive!", then jail. Fixed from the runs: a cruiser could turn into a tree and stay wedged (turning is now collision-checked and wedged cars can move free); cruisers cut across Civic Plaza (roads now much cheaper than plazas); a cruiser stuck behind traffic stopped for the player (cruisers pass through traffic; stuck = not moving, not low speed); pinned against the canal with the throttle down counted as "moving" (real ground speed); new cruisers kept spawning after you'd lost them. No page errors.

## Verification record — v0.17.0 (2026-10-13)

- `npm run check` — **230/230 tests passed** (7 new in `transit.test.mjs`); validator 0 errors.
- `npm run smoke` and `npm run smoke -- --dev` — 24/24 each.
- Browser (headless Chromium, real keyboard and mouse): at the Gullwing Road stop, E showed the bus times; "Wait for the bus" brought the No. 1 in three minutes later; E boarded it (12 → 10 obols); the HUD showed the direction and next stop; the bus drove west through Westbrook, through the gate into Halvermouth and stopped at the East End by the Grand Hotel, with city traffic on the streets; the world map showed stops and buses. Fixed from the runs: buses crept and lurched when something stood in the road (a steady look-ahead plus braking distance, and a short hold). No page errors.

## Verification record — v0.16.0 (2026-10-13)

- `npm run check` — **223/223 tests passed** (12 new in `vehicles.test.mjs`); validator 0 errors.
- `npm run smoke` and `npm run smoke -- --dev` — 24/24 each.
- Browser (headless Chromium, real keyboard and mouse): Fender's lot with Marty and three display cars; E on Marty, "I'm looking for a car" opened the dealership panel; Buy put a Pipit on the forecourt; E got in; W drove onto Westbrook Row, the car reached 26 mph, and driving west through the gate arrived in Halvermouth with the car; night driving showed headlights; the Beaumont showroom and panel rendered. E on Marty's Dray → Hotwire → the bar filled while standing still → driving it, with "Marty saw that!". Fixed from the runs: cars were too small beside people (scaled up 35%); the car couldn't reach a region gate (its nose hit the map edge first); rust patches drawn off the body; walking into doors was blocked by the car check. No page errors.

## Verification record — v0.15.1 (2026-10-13)

- `npm run check` — **211/211 tests passed** (3 new in `worldmap.test.mjs`); validator 0 errors.
- `npm run smoke` and `npm run smoke -- --dev` — 24/24 each.
- Browser (headless Chromium, real mouse): the terminal in Yard 1 Works with three shipments (sea, air, sea) showed the monitor frame, CONTACTS with progress bars and the globe with routes, ambient traffic and wars; sweeping the mouse found a shipment and showed its tooltip (operator, destination, 8× 9mm Pistol, value, 14%, ETA 62h, insured); hovering land showed Varnistan with its inbound rifles; dragging and the wheel turned and zoomed it; F6 opened the market. The tablet's Business app showed the same console. The world map fitted the whole world (Yards, Halvermouth, coast, joined by roads), zoomed to Halvermouth street level with icons and names, and hovering showed "🛡️ Ironclad Securities — Security firm". Fixed from the runs: a crash when the first animation frame's timestamp preceded the start time; the prompt read "root@undefined"; the active command tab lost its text on hover. No page errors.

## Verification record — v0.15.0 (2026-10-13)

- `npm run check` — **208/208 tests passed** (7 new in `tablet.test.mjs`); validator 0 errors.
- `npm run smoke` and `npm run smoke -- --dev` — 24/24 each (the J check now expects the OberPad).
- Browser (headless Chromium, real mouse): J on a new game opened the OberPad with no Business app and an empty feed. After buying a works, ordering parts, shipping pistols to Teshvar, buying Ober's Oil shares and skipping days, the HUD showed "📱 9 new"; clicking it opened Home with the delivery, shipment, news, dividend and share-move notifications. Business showed the Yard 1 Works globe and tabs; ordering ×10 steel from Parts worked remotely. Stocks showed the price chart, and Buy 5 took the shares from 10 to 15. Fixed from the run: the status bar vanished after a trade; the chart drew too small; the Overview still said the market "opens soon". No page errors.

## Verification record — v0.14.0 (2026-10-13)

- `npm run check` — **201/201 tests passed** (12 new in `market.test.mjs`); validator 0 errors.
- `npm run smoke` and `npm run smoke -- --dev` — 24/24 each.
- Browser (headless Chromium, real mouse): the Market tab listed news, buyers (Varnistan and Caldera at war, Pallas embargoed) and prices; choosing Teshvar, Stork Air Charter and insurance and clicking All on two items quoted 9,720 obols value / 2,916 fees, and "Ship it" booked it (the globe shows the route). In Mill Road Yards an RPG (after a reload) hit Al Gebra and Max Imum with Mason Nails standing beside them: Al and Max hurt, Mason untouched, no Wrath; a Hornet dove at Dee Nominator; a Longbow's reticle counted down and struck. Scorch marks and camera shake visible. Fixed from the run: one explosion produced a stack of identical police-call toasts (calls now merge per scene). No page errors or game warnings.
- Audio rendered offline: `sfx_explosion` 0.89; `sfx_rocket` and `sfx_drone` were too quiet (0.15, 0.06) and were raised (0.47, 0.28). Not listened to by ear.

## Verification record — v0.13.0 (2026-10-13)

- `npm run check` — **189/189 tests passed** (14 new in `arms.test.mjs`); validator 0 errors.
- `npm run smoke` and `npm run smoke -- --dev` — 24/24 each.
- Browser (headless Chromium, real keyboard and mouse): Pipecreek Armory with Lucas at the counter; E at the counter opened his shop and buying a pistol set the pitch flag; his dialogue opened with portrait. Mill Road Yards rendered. In Yard 1 Works, B placed six workstations, an arm and belts by clicking; three hired staff were auto-assigned and walked to their stations; a barrel was made in the first minutes. The terminal: rotating globe with countries, borders and routes; Staff, Research, Parts and Market tabs. F on Lucas played the arms Wrath (crates, missile, drones, SOLD tag). Fixed from the run: a stray "null" line on the terminal. No page errors or game warnings.
- Audio: `sfx_wrath` (arms) and `sfx_crate` rendered offline; peaks 0.37–0.93. Not listened to by ear.

## Verification record — v0.12.0 (2026-10-13)

- `npm run check` — **175/175 tests passed** (13 new in `factory.test.mjs`); validator 0 errors.
- `npm run smoke` and `npm run smoke -- --dev` — 24/24 each.
- Browser (headless Chromium, real keyboard and mouse): bought Warehouse 7 at its FOR SALE sign through the choices panel; pressed B; picked tools from the build bar; placed an arm (rotated with R), a soldering station, a second arm and a 12-belt line ending in the output crate by clicking tiles; right-clicked a belt away and placed it back; Esc left build mode. In real time the arm fed parts from the input bay, the station soldered cores, they rode the belt (sliding between tiles) into the output crate. The workbench menu listed what could be hand-crafted. Fixed from the run: the build bar's buttons were unclickable (the HUD layer ignores the mouse; the bar now takes it); item names were lowercased in the workbench menu. No page errors or game warnings.
- Performance: 382 fully loaded belts across two warehouses — a whole skipped day (sleeping) in ~0.4 s; belts are simulated in one downstream-first pass.

## Verification record — v0.11.0 (2026-10-13)

- `npm run check` — **162/162 tests passed** (21 new in `gang.test.mjs`); validator 0 errors.
- `npm run smoke` and `npm run smoke -- --dev` — 24/24 each.
- Browser (headless Chromium, real keys): the Abacus with Arthur at his desk and Minnie at the bar; E at the counter opened Minnie's shop with all six calculators; talking to Ray in the Sumps and choosing "Try this — on the house" won him as a customer (anger 12); a calculator high showed on the HUD; Journal → Customers listed everyone with Ray's paged order; at anger 60 Al Gebra jumped the player in the Sumps; F on Arthur played the maths Wrath (frames checked through to UNDEFINED). Fixed from the screenshots: the counter blocked talking to Minnie (now the counter serves you); "Likes the The Brick" wording; falling digits lingering over the finale. No page errors or game warnings.
- Audio: `sfx_wrath` (maths) and `sfx_digit` rendered offline; peaks 0.53–0.88. Not listened to by ear.

## Verification record — v0.10.0 (2026-10-13)

- `npm run check` — **141/141 tests passed** (20 new in `police.test.mjs`); validator 0 errors.
- `npm run smoke` and `npm run smoke -- --dev` — 24/24 each.
- Browser (headless Chromium, real F key): standing at Chief Order's visitor chair and attacking triggered the LAW Wrath; frames checked across the timeline (banner and orbiting badges/cuffs/stamps, squad cars, the gavel, paperwork stamped GUILTY behind dropping bars); the struck-down card's *Wake up (in a cell)* put the player in the cell block with the HUD showing time left. Outdoors at ★★, Sgt. Case gave chase, the cuffing bar filled and the player was arrested. Fixed from the screenshots: the cuffing label overlapped name tags (moved under the player); the long banner touched the screen edges (narrower). No page errors or game warnings.
- Audio: `sfx_wrath` (law), `sfx_ram` (car and gavel) rendered offline; peaks 0.43–0.92. The render caught `sfx_ram` scheduling its squeal before time zero (a crash at a fresh audio clock) — fixed. Not listened to by ear.

## Verification record — v0.9.0 (2026-10-13)

- Bug report from the owner: attacking Sir Moneybucks showed nothing. Reproduced in Chromium by walking up to him at his real haunts and pressing F: in the dining room the closest the player can stand is 63 px (the table is in the way) while a fist reaches 46 px — the swing silently missed. Earlier tests always stood the player adjacent. Fixed and covered by two regression tests (across-the-table swing; a near-miss bullet).
- `npm run check` — **121/121 tests passed**; validator 0 errors.
- `npm run smoke` and `npm run smoke -- --dev` — 24/24 each.
- Browser: real F-key attacks on Sir Moneybucks (dining room, study) and Mason (excavator cab) all triggered their themed Wrath; frames captured across the timeline for both themes (aura, first strikes, finale). No page errors or warnings.
- Audio: all three `sfx_wrath` themes, `sfx_gusher` and `sfx_beam` rendered offline in Chromium; peaks 0.71–0.89 (no clipping). Not listened to by ear.

## Verification record — v0.8.0 (2026-10-13)

- `npm run check` — **118/118 tests passed** (5 new in `debug.test.mjs`); validator 0 errors.
- `npm run smoke` and `npm run smoke -- --dev` — 24/24 each.
- Browser (headless Chromium, real keyboard): ` opened the menu with the console focused; typed `money 777`, `give pistol`, `health 35` (all applied); Up recalled the last command; clicked *All weapons*; searched "feather", set qty 3 and clicked Give; teleported to Halvermouth from the map list; Esc closed the menu; letters typed into the console did not move the player or trigger attacks; the Pause menu shows the Debug entry. No page errors or game warnings.

## Verification record — v0.7.0 (2026-10-13)

- `npm run check` — **113/113 tests passed** (5 new in `wrath.test.mjs`); validator 0 errors.
- `npm run smoke` and `npm run smoke -- --dev` — 24/24 each.
- Browser (headless Chromium), with a real F-key attack: on Mason at the construction site (orange) and on Sir Moneybucks at the Quay (gold), frames captured across the timeline — runes and banner (1.9 s), first lightning strike (3.45 s), the strike storm (3.9 s), the pillar and embers (5.15–5.9 s), the last word on black (8.5 s), the *struck down* card; clicking *Rise again* woke the player at home at 08:00 the next day with half their money and the HUD restored. No page errors, no game warnings, no audio failures.
- Audio: `sfx_wrath`, `sfx_thunder` and `sfx_gunshot` rendered through an `OfflineAudioContext` in Chromium; the score sounds for ~7 s and peaked at 1.34 (clipping) — lowered to 0.91 before release. Not listened to by ear.

## Verification record — v0.6.0 (2026-10-13)

- `npm run check` — **108/108 tests passed** (10 new in `combat.test.mjs`), stable across three runs; validator 0 errors (2 intentional warnings).
- `npm run smoke` — 24/24; `npm run smoke -- --dev` — 24/24.
- Browser playtest with real input (headless Chromium): pressed F next to Mags → she took 9 damage, her health bar appeared and she fought back (player 100 → 74 over 2.5 s); bought a pistol, 9mm rounds, a shotgun and shells through the gun-counter shop panel by clicking; equipped from the inventory; R reloaded (12/12 · 8); two mouse-aimed clicks across the Civic Office hit Osric (100 → 39) who fled; a knock-out shows him lying down with "KNOCKED OUT" under his bar. No page errors, no game warnings.
- Not verified: feel/balance over long play, phones/touch (no touch controls for combat), audio by ear.

## Verification record — v0.5.0 (2026-10-13)

- `npm run check` — **98/98 tests passed** (6 new in `world_halvermouth.test.mjs`); validator 0 errors (2 intentional warnings).
- `npm run smoke` — 24/24; `npm run smoke -- --dev` — 24/24. (The smoke test caught a regression during this build — a roof variable moved out of scope broke the chimneys on ordinary houses — fixed before release.)
- Browser walkthrough (headless Chromium): walking west from Westbrook's gate loads Halvermouth at the East Gate; screenshots of the plaza (day and night), Bank Row and Ober's Oil Tower, the Financial District at night, Precinct Row, Iron Row, the Sumps (day and night), the Docks, all three interiors, the city map tab and the coast map's gateway arrow. No page errors, no game warnings. 60 fps measured in the plaza and on Bank Row.
- Not verified: phones/tablets (large ground layer), Firefox/Safari, audio by ear.

## Verification record — v0.4.0 (2026-10-13)

- `npm run check` — **92/92 tests passed** (13 new in `character_mason.test.mjs`); validator 0 errors (2 intentional warnings).
- `npm run smoke` (standalone `file://`) — 24/24 passed; `npm run smoke -- --dev` — 24/24 passed.
- Property lifecycle verified headlessly on a **test-only plot** (contract → Osric permit → 3-day build at 18:00 → building + door on the map → interior furniture by blueprint → survives save/load; rental pays 8/day). No real plots exist, so the finished-building path has not been seen in a browser; `Game.rebuildMaps()` was exercised in Chromium with no errors.
- Browser screenshots (headless Chromium): Mason in the excavator cab at 11:00 with Dee and Barnaby on site; Westbrook Row and the canal basin; Mason's portrait in dialogue; the site office and the contracts board ("No plots surveyed yet"); the crew at home in the Plumb Line at 20:00; the stitched region map. No page errors.
- Not verified: Firefox/Safari; GitHub Pages (deploys automatically on push); audio by ear (songs compile-tested only).

## Verification record — v0.3.0 (2026-10-13)

- `npm run check` — **79/79 tests passed** (3 new seam tests); validator 0 errors.
- `npm run smoke` (standalone `file://`) — 24/24 passed.
- Browser walkthrough: holding D from x 57.8 in Lanternside crossed into the Ober Fields at x 0.9 with no fade or jump (positions logged every 250 ms); the region map and minimap draw both maps stitched. No page errors.
- Not verified: Firefox/Safari; GitHub Pages (deploys automatically on push).

## Verification record — v0.2.0 (2026-10-13)

- `npm run check` — **76/76 tests passed** (incl. 14 in `character_moneybucks.test.mjs`); **validator 0 errors** (2 intentional warnings).
- `npm run smoke` (standalone `index.html` via `file://`) and `npm run smoke -- --dev` — **24/24 each**, no page errors or engine warnings.
- Scripted browser walkthrough of the new content, no errors: walking east into the Ober Fields through the road exit; the estate and fields by day; Sir Moneybucks's study, dialogue with the supplied portrait, the share register opened from dialogue, a full Ledger match; the relit lighthouse and canal slick at night.
- Ledger balance (simulation, 4–6k matches): naive play wins ~45%; reading tells wins ~50–53%, rising with Wits.
- Frame rate with 14 residents: ~57–60 fps at 1600×900 in headless software rendering.
- Not verified: audio by ear; Firefox/Safari; GitHub Pages hosting.

## Verification record — v0.1.1 (2026-10-13)

- `npm run check` — **62/62 tests passed; validator 0 errors.**
- `npm run smoke` against `file://…/index.html` with no server running — **24/24 passed**, including saves persisting across a page reload and Continue resuming the game.
- `npm run smoke -- --dev` against `dev.html` — passed.
- Not verified: GitHub Pages hosting itself (Pages must be enabled in the repository settings; the page uses only relative, self-contained content, so no differences are expected), Firefox/Safari `file://` behaviour.

## Verification record — v0.1.0 (2026-10-13)

Actually run in the development container (Node 22, Chromium via Playwright 1.56):

- `npm run check` — **59/59 tests passed; validator 0 errors** (2 intentional warnings: the Vane house and Collective Hall doors have no obtainable key).
- `npm run smoke` — **21/21 checks passed, no page errors, no engine warnings** (run 3× consecutively): title + version, new game, reading the letter, leaving the flat on foot, inventory/journal/map panels, dialogue with Mags and topic list, dialogue → shop hand-off and purchase, returning to the conversation, Ask-about box, wardrobe container, sleeping until morning, quick save/quick load restoring state, night lighting, pause menu version.
- Frame rate: steady ~60 fps at 1600×900, day and night, in headless software-rendered Chromium (rAF measured over 2 s each).
- ESLint (no-undef, unreachable code, duplicate keys): 0 errors.
- Screenshots reviewed by eye: title backdrop, flat, outdoors (day and night), café dialogue, shop, map with fog.

Bugs found and fixed by this verification: double-started vibrato oscillators (audio exception on every note), Esc closing a conversation instead of the shop opened from it, `notifyKind` logged as an unknown effect.

Not verified in this session:
- Audible quality of music/SFX (headless browser; synthesis code ran without errors, but no human listened).
- Firefox and Safari.
- Very long play sessions (multi-day real-time memory/performance).
- Touch devices (not supported yet).
