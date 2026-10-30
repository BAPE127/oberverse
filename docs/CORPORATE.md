# The Corporate Empire (v0.60.0 onward)

**v0.61.0 "Under One Roof"** added stage 5 — the parent company and subsidiaries (see *The group* below).

The Oberverse is becoming one connected economy: the player's four private businesses, the companies of the other countries, parent groups, managers, markets, a central bank, wars. It is built in staged releases (see `docs/CORPORATE_AUDIT.md` for the audit, the owner's decisions and the roadmap). **v0.60.0 "Own Account"** is the foundation: stages 2–4 (company accounts, identity, the registry, generated competitors, finance and rankings).

## What exists now

| Piece | Where | What it does |
| --- | --- | --- |
| **Company accounts** | `src/corp/ledger.js`, `src/systems/corporate.js` (`game.corp`) | The one place the four businesses move money: `cashOf`, `canAfford`, `pay`, `receive`, `found`. |
| **Funding** | `contribute`, `distribute`, `unfund` | The owner puts money in (a logged capital contribution) and takes it out. |
| **Identity** | `src/corp/identity.js` | Names, validation, the player's four companies' defaults. |
| **Registry** | `src/corp/registry.js`, `game.corp.registry()` | Every company in one list: the owner's four, the listed (OBRO, CHZ, MRDN), the freight carriers, the generated. |
| **The wider world** | `src/content/corporate.js`, `src/corp/sim.js`, `src/corp/generate.js` | About 45 generated companies in ten sectors, made once and kept, run one day at a time. |
| **Figures, worth, rankings** | `src/corp/metrics.js`, `metricsOf`, `sectorTable`, `placeOf`, `compare` | The same figures for every company, read from the books each keeps. |
| **Tablet** | `src/ui/corpApp.js`, `src/ui/corpIntel.js` | **Companies** (names and accounts) and **Intelligence** (rankings) apps; a naming panel when a business is founded. |

## Company accounts

A company is `arms`, `shipping`, `aerospace` or `farming`. Its account is **unfunded** until the owner pays money in:

- **Unfunded** (every company in an old save, and every new one): the business spends the owner's wallet exactly as it always did. Its flows are only *counted* (by 30-day month, two years kept) so its books can be told apart.
- **Funded**: the business pays from its own cash alone. A discretionary purchase it cannot afford is refused (the buttons check `canAfford`). A bill that must be met (upkeep, the aerospace firm's costs) that it cannot cover becomes **arrears** — a debt, paid first out of what next comes in. Nothing is ever received for nothing, and nothing silently overdraws the account.
- **Founding** is the owner's act: buying the licence, the shipping company, the aeroworks or the first plot comes out of the wallet and is recorded as **equity in kind** (an asset brought in at cost), not as the company's spending. Later works, ports, plots are the company's capital spending.
- **Personal money never passes through**: shares (OBRO, CHZ, MRDN) and their dividends, a day's labouring and the casino stay on the wallet.
- Invariant (tested): a funded account's cash = contributed − distributed + inflows − outflows, and the owner's wallet + the company's cash is unchanged by funding.

## The wider world

- **Made once.** On first need (a new game, or loading a save without them) `ensureWorld` builds the companies from a salt kept in the save and `warmupDays` (120) of history, then saves the full records. Loading never makes them again; content changes never alter a company that exists.
- **Character is a hash** of the salt and the company's id: size, speciality, strategy, risk, management, standing, efficiency, price level. The numbers it starts with follow from those.
- **Demand is shared.** Each sector has a *pool* (what its customers buy a day, drifting up with a slow cycle; the arms pool reads the real arms market's incomes and wars). The player's own revenue and Meridian's come off the top; the rest is shared by capacity, standing and price (`allocate`). A player who wins business leaves less for everyone else.
- **Every company pays its way**: cost of goods, fixed costs, interest; borrows up to a limit, repays when flush, builds when busy and rich, sheds when idle, pays owners 30–40% of a month's profit if it can spare it.
- **Entry, mergers, failure**: a busy sector may draw a newcomer (cooldown, caps); a distressed company is bought by a strong one in its sector at a price the buyer pays and with its debt taken on; one short of cash for 45 days is wound up — its plant sold at 40% of book to its lenders, who take the loss. Caps: 60 alive, 90 records.
- **Catch-up is bounded**: at most 30 days are lived when time has passed unseen.

## Figures, worth and rankings

Every company is read into the same record (`metricsOf`): revenue, operating profit, net income, margin, growth, cash, debt, capex, estimated value. **A figure a company's books do not keep is `null` and shown as "—", never zero or a guess.** How each is counted is stated (`basis`): aerospace — its books; arms, shipping and farming — what actually moved through the company's account (cash basis; shipping's charges from its sister aerospace division are *internal* and left out); generated companies — their own books; Chuckie's Cheese — today's run-rate; Ober's Oil and the carriers — nothing kept.

**Estimated value** = net assets + a sector multiple of a year's profit (half weight for a loss, never below a third of net assets, and only as far trusted as the months shown: six months fully). It is an opinion and **never creates cash**; the screens say so. Rankings are by revenue, net income, margin, growth, value or share, for last month, this month so far or the last twelve months; each month's standing of the owner's companies is written down (24 kept). `compare` says figure by figure who leads.

## State (in the save)

`world.corp` (created on first use; see `docs/SAVE_FORMAT.md`; `people` since v0.62.0): `accounts` (per company: `funded`, `cash`, `contributed`, `distributed`, `inKind`, `flowIn`, `flowOut`, `arrears`, `log`, `months`), `companies` (identity records), `generated` (the world's companies, with their `months` rows), `gen` (salt, id counter, last day, entry cooldowns, news), `rankHistory`.

## The group (v0.61.0)

`game.corp.group` (`src/systems/group.js`; pure rules in `src/corp/group.js` and `src/corp/consolidate.js`); the **Group** tablet app.

- **Parent company**: free to form, starts with nothing, has an account (always funded) and its own ledger (`state.parent`, `state.accounts.parent`). Only one. It is not a business: it is not in the registry or any ranking.
- **Subsidiary** = a business with a `{ owner: 'parent', sub, stake: 1 }` edge in `state.ownership`. Wholly owned (the stake field is for later). `canOwn` refuses circles, a second parent, self-ownership. **Joining is one step** (`join(id, { opening })`): the owner's stake so far becomes the parent's investment *in kind* (no cash), the business converts to its own account, and the opening capital moves from the parent's cash — or nothing happens. `joinPreview` says first what it spends a day and what happens with too little. An arms business must own a works first (otherwise its first works would be a founding purchase from the wallet).
- **Money path** (enforced in code, not only in the UI): owner → parent (`contribute('parent')`) → subsidiary (`capitalise`, or `lend`) and back by `distribute…`/`repayLoan`/`returnCapital`; the parent → owner by `distribute('parent')`. `contribute`, `distribute`, `unfund` and `found` all refuse a subsidiary. A subsidiary `spinOut`s only with no loans and no arrears; its cash stays in it.
- **Transfers** (`transfer(from, to, n, kind)`): one synchronous step moving cash between two accounts (`xferOut`/`xferIn`, part of the reconciliation invariant), numbered and logged in `state.transfers` (400 kept). They are never posted as sales or costs. The only intercompany items that reach a company's *months* are interest (`ic_interest`) and dividends (`dividend_in`), classed as intercompany, not trading.
- **Loans** (`state.loans`): the parent lends at `CORP.baseRate + 1%` (settable), equal principal instalments; each closed month the borrower pays a month's interest on the outstanding and an instalment, from what it has, unless it owes others (then the miss is counted). Never revenue.
- **Distributions**: per subsidiary, by policy (`POLICY_DEFAULT`: keep 5,000, protected minimum 2,000, +1,000 reserve while it owes the parent, keep 50% / send 50%, loans first) from the *month's trading result less interest paid to the parent*, sent only from cash above the reserve plus next month's loan service, and never while it owes others. `distributeNow` is the manual route: below the protected minimum it needs `override`, which is recorded (`breaches`), alerted and leaves the subsidiary with what is left.
- **Monthly jobs** (`dailyTick` → `runMonth(m)`): loan interest and instalments, each subsidiary's distribution, the freight pool snapshot; keyed by `state.group.jobs.month` and per-subsidiary `dist[id].m`, so each closed month runs once whatever is saved, loaded or slept through (at most the last three after a very long gap). They do not depend on the wider world existing.
- **Consolidation** (`consolidated(period)`): each member's own statement (sales, from-the-group income, costs, to-the-group interest, result) and the consolidated one. Eliminated: dividends within the group; interest between its members (it cancels); and the **freight charge** between shipping and aerospace. Aerospace capitalises that charge into stores and expenses it only when the stores are used, while shipping books it at once — so `icStep` keeps a pool of what aerospace still holds (`U`, read from its stores, orders in transit and unfinished units), splits it into what was there before both joined (`P`, never deferred) and what has been charged since (`G`, deferred), releases `P` first, and the cost released from `G` each month is `E`. **Consolidated net = Σ separate results − dividends − (R − E)**, with a check line on screen. A charge with nothing used changes the group result by nothing; with everything used, charges eliminated equal costs released.
- **Value**: `groupValue()` = the parent's cash + what it is owed + its stake in each subsidiary at that subsidiary's value, whose net assets already take off what it owes the parent. Capital and loans inside the group leave it unchanged. (Values have a floor and cannot be negative, so the sum is exact only for companies not close to nothing.)
- **Not in this release**: the parent has no debt or interest expense yet (those ledger lines read 0; its management expenses are the wages of the people hired for it since v0.62.0); no selling, closing or part-owning a subsidiary.

## People (v0.62.0)

`game.corp.personnel` (`src/systems/personnel.js`; pure rules in `src/corp/people.js`; content in `src/content/personnel.js`); the **Personnel** tablet app.

- **The market** (`state.people`, created when the app is first opened or someone is hired): about 24 candidates, each a pure function of the saved `salt` and its number (`makeCandidate`) — the same save has the same people, and nothing uses the game's RNG. Weekly (`weekly`): three to five leave, new ones arrive up to the pool size; after a long gap the turnover is bounded, and numbers are never reused.
- **Jobs** (`ROLES`): 7 executive (parent only), 10 manager and 9 staff (a business). Each lists the skills it needs (a candidate must average 35+ in them), a pay band, a limit per employer, and its **effects**. One person holds one job at one employer at a time (`checkPlacement`).
- **Offers** (`offer`): accepted at or above `floorPay` (the asking pay × (0.85 + 0.15 × negotiation/100)); the recruiting fee (10 days' wage) is paid once from the employer through `payFor`, the person starts when their notice (0 / 7 / 14 days) ends, and the candidate leaves the market. **Dismissal** pays 5 days' severance once; the record stays.
- **Payroll** (`payroll`, 19:05 each day, once per employer per day — `state.people.pay[employer]` is the day last paid): each employer pays the people it has the cash for, in order of engagement; the rest are unpaid, lose heart, and resign on the second day. `payFor` pays in each business's own way — aerospace through its wages line, shipping through `spend`, farming through its ledger, the parent as an expense — so each business's books and the account agree, and an **unfunded** employer draws on your wallet as the rest of it does.
- **Growth** (`review`, month's end): the employer's result for the closed month against the average of the three before it; a good month with the person paid in full is experience, and every third adds a point to the weakest skill their job needs (≤ 6 points a career, ≤ 90). Nothing else changes a skill. **Promotion** needs 60 days in the job, two good months and the skills for the higher job; it raises the wage 15%.
- **Effects** (`effectsOf`): per effect, `cap × skill factor ((average of the effect's skills − 20) / 70, 0–1) × dependability (0.6–1.0 by reliability) × reach`, summed over the people at the employer who are at work and paid, and held to the **ceiling** (`EFFECT_CAPS`: materials 8%, parts 10%, overhead 10%, arms speed 10%, upkeep 12%, farm price 8%). A parent's executive acts on each subsidiary at half strength (`EXEC_REACH`). Applied where the money is paid or the output made: `aerospace.supplierPrice` and `fixedCosts` (the player's firm only, never Meridian), `arms.speedMult` (read by `rate`, which is zero without a worker at the station; `rate` also drives the research lab, so research is faster too) and `partsMult` (the order price), `logistics.daily` (upkeep paid), `farm.unitPrice` (what a sale fetches — crops at the co-op and herds at auction; it is also the quote shown before selling). Cached per day and per roster change.
- **Authority** (`setAuthority`): a spending limit, an ask-above limit, and may hire / borrow / transfer / sign contracts / expand, bounded by level (staff cannot borrow or transfer). Stored and shown; **not enforced by anything until stage 7**.
- **Arms staff** are listed through `armsFloor` as a view of `arms.state.staff` — not copied; the works still hires, pays and dismisses them with its own generator. **Aerospace crews** stay head-counts (a line in Payroll).
- **Worth** (`benefit`, `spendPerDay`): what a hire would save or earn a day from the business's own recent spending; **it is frequently less than the wage** in a small business, and the app says so. The case for managers in this stage is the groundwork — people, pay, results, authority — and the effects above; what they decide for themselves is stage 7.
- **Not in this release**: managers acting on their own, budgets, approvals, policies and alerts about people (stage 7); morale beyond loyalty and being paid; hiring through an agency or at a place in the world; part-time and fixed-term contracts; training; poaching by generated companies.

## Managers on their own (v0.63.0)

`game.corp.management` (`src/systems/management.js`; the pure judgement in `src/corp/management.js`; data in `src/content/management.js`); the **Management** tablet app. Nothing runs or is created until a budget is set.

- **A decision** is `decide(kind, business, person)`: quote what it would cost now (nothing changes), `judge` it, and then carry it out, queue it or refuse it. `judge` fails in this order: not at work and paid → their job does not make this decision (`DECIDES`) → a hire without the permission to hire → the business has no account of its own → nothing to spend → the monthly hire cap → **no budget set** → over the month's budget → above their spending limit → the account cannot cover it; then above the ask-above limit → **queue**; otherwise **execute**. `owner: true` (the owner approving) lifts only the ask-above limit.
- **Budgets** (`state.management.budgets[business][category]`): monthly (the ledger's 30-day month), per category (`materials`, `hiring`), set by the owner, **zero by default**. `spent` counts only what decisions by people spent — each decision's cost when it executes (a hire: fee and `hireBand` = 30 days' wage), not the owner's own purchases — and keeps three months. Requests hold no budget; approval re-checks it, so several approvals cannot together pass the cap.
- **Funded companies only**: managers act for a business only if it has an account of its own (or is a subsidiary). An unfunded business never has its owner's wallet drawn on by a manager, whatever the budget says; the app and an alert say so.
- **Approvals** (`pending`, `approve`, `decline`): one waiting request per kind and business, 30 at most, lapsing after 7 days. Approving **re-plans and re-judges** (the need, the quote, the supplier's stock, the budget, the cash, the person) and executes what is needed *now*, not what was asked for; if the need is gone it says so.
- **Reorders**: `planArms` — per works, `armsPar` (a part used by a staffed — assigned — station is held at 8 hours of the stations that use it) and `planArmsOrders` (below half of par counting the dock and what is on order → order up to par, ≤ 60 of a part); executed through `arms.order`, so the price, payment and delivery are the arms system's own. `planAero` — per material, the shortfall of open units after free stock, the best supplier, priced by `aerospace.orderCost` (the same computation `order` uses, with nothing changed: no RNG, no supplier stock); executed through `aerospace.order` after `reserveShortfalls`. **Only while auto-buy is off.**
- **Hires**: `planHire` — the business's own Openings, the person's reach (a general manager: staff jobs at their own business; an HR director at the parent: staff and manager jobs at the subsidiaries), candidates who suit and are available within two weeks, `hireChoice` (the job's own level, best fit, ties by id), offered the least they accept; executed through `personnel.offer`. At most 2 a month a business.
- **Once a day** (`dailyTick`, about 06:00 after the personnel service, keyed by `last.day`): each business with a budget for a kind gets at most one decision of that kind, made by the first (by id) person at work who may make it. A refusal is logged once per reason (`last.refused`), not daily.
- **Attribution**: a reorder is noted on the business's account against the person (`noteActor`); a hire's fee is noted against the new employee by the personnel service.
- **Not in this release**: a reorder policy per business beyond the budget and the person's limits; decisions by executives at the parent; shipping and farming reorders (their inputs are bought with the owner's personal money by design); firing and raises by managers; any decision about money between companies.

### Bids and plans (v0.64.0)

- **Bids** (aerospace only): `planBids` quotes each open tender the firm has not bid on (`bidQuote`, pure), prices it with `bidPrice(cost, margin, ceiling)` — cost × (1 + the owner's `margins.aerospace` %) rounded up to 100; if that is over the customer's ceiling the price is the ceiling and the decision carries an `ask` (queue for the owner) — never below cost, and not asked at all below it — and keeps those `bidQuote` calls valid. The best profit is decided first. The commitment (unit cost × quantity) counts against the **contracts** budget and the person's limits; the bid goes through `placeBid`, which still applies every tender rule. At most `maxContracts` (3) active contracts plus open bids. No margin set: no bids.
- **Plans** (`state.management.plans`): `{ type, params, limit, maxEach, reserve, bought, placed }`, validated in `addPlan` (twelve at most). `evalPlan` says what the next purchase would be (or why none) without changing anything; `planExpansion` turns that into candidates for a decision; the cost and **reserve** (cash that must remain) are judged with the person's authority (`canExpand`), the **expansion** budget and the account. Fixed rules, pure in `src/corp/management.js`: `nextPlot` (cheapest plot for sale within `plotGap` = 8 tiles of one owned; never a first one), `nextPort` (cheapest, ties by id), `firstFreeCell` (row by row, a one-cell ring clear of anything built). Arms stations are two-phase: `arms.order` (so equipment prices and delivery are the arms system's own), then — on a later day, at the start of the daily tick, `placeStations` — placement from the works's dock (`place(..., from)`), an optional recipe, and a log line; one at a time (`bought` must equal `placed`); no power or no free place is logged once and nothing is lost.
- **Authority**: `canContract` is needed to bid, `canExpand` to expand (both false by default; set under Personnel → Staff → Manage). `DECIDES` says which jobs may make which decisions where.

### Treasury (v0.65.0)

- **Policy** (`state.management.treasury[subsidiary] = { floor, ceiling }`, `treasury.parent = { reserve }`): validated in `setTreasury`/`setParentReserve` (only a subsidiary; ceiling ≥ floor + 1,000 and ≥ its protected minimum). The pure rule `treasuryMove` (`src/corp/management.js`): below the floor → `topup` of `min(floor − cash, parent cash − reserve)`; above `max(ceiling, protected minimum)` and with no arrears → `sweep` of the surplus through the subsidiary's open loans (by id) then returned capital (≤ what the parent put in); nothing under `minMove` (1,000).
- **Decision**: kind `transfer`, category `treasury`, made by a `cfo` at the parent (`DECIDES`) with `canTransfer`; one per subsidiary a day. `planTreasury` quotes it; `carryOut` runs it through `group.capitalise` / `repayLoan` / `returnCapital`, so the transfer service's own checks (cash held, arrears) apply. The judgement checks the **source** account (the parent for a top-up, with the reserve left; the subsidiary for a sweep), the monthly treasury budget, the person's limits and the ask-above limit; approving re-plans and moves what is needed now.
- **Not trading**: transfers change which account holds cash, never the total, and never appear in sales or costs; `distributions` (v0.61) are separate.
- **Not in this release**: forecasts, interest on idle cash, debt monitoring, moves between two subsidiaries, treasury by managers below the parent.

## The exchange (v0.66.0)

`game.corp.exchange` (`src/systems/exchange.js`; pure rules in `src/corp/exchange.js`; settings in `CORP.exchange`); the **Exchange** tablet app. The first part of stage 9.

- **Listings** (`state.exchange.listings[ticker]`): made once, on the first day a listed company of the wider world has a valuation (`metricsOf(...).valuation`): `shares = listingShares(value, firstPrice)` with the first price a hash of `gen.salt` and the ticker between 20 and 120, so the price starts at its worth (no company has an absurd price or a handful of shares). The shares are the exchange's own count; they do not change the company's record.
- **Price** (`nextPrice`, the same step as Meridian's): `price += (fair − price) × 0.12`, times `1 ± 2%` of a mood that is `hashUnit(salt | ticker | day)`, floor 0.5, two decimals; `fair` = the company's estimated value over the listed shares. **No game RNG, and nothing you do moves it.** One step a day (`lastDay`), history of sixty days.
- **Trading**: `buy`/`sell` for a listing take the price on the day; **1% fee each way** (rounded up), **cap 5%** of the listed shares for one investor, refusals change nothing; the holding keeps `n`, the cost (fee included) and dividends received. For `OBRO`, `CHZ` and `MRDN` they delegate to `oil.buyShares`, `dairy.buyShares`, `aero.buyShares` (and sell). Since v0.67.0 every listed share has one rule set: **OBRO** has the exchange's 1% fee, a 5% cap of `OIL_LISTED` (100,000) shares, and a price that steps toward `fair` (the old output formula) with the exchange's `nextPrice` and a hash mood; **CHZ** always had a 1% fee, a cap of 1,500 shares (1%: Chuckie keeps control) and a step toward `fairValue()` with its own rng noise (kept, because removing the draws would shift every later random number); **MRDN** the exchange's own fee and cap and its books-driven step. OBRO and CHZ keep `costBasis` (while every share held was bought through them).
- **Dividends** (`payDividends`): for each closed month (the last three at most after a gap), the dividend the company really paid out of that month's profit (`months` row `[7]`, set at the world's month end from profit and spare cash) over the listed shares, to the shares held — keyed by `divMonth`, so once.
- **Failure and takeover** (`delist`): `closed` → the shares are worth nothing (holding written off, a note); `merged` → bought out at the last price (cash to the wallet, once). Neither company is ever listed again under that ticker.
- **Board and portfolio** (`board`, `portfolio`): the three older shares read through as they are, with the cost kept only where it exists (Meridian's); the portfolio says when a holding's cost is not known and leaves it out of the gain.
- **Not in this release**: listing one of your own businesses (an IPO); shares held by generated companies, short selling, orders at a price; anything the player's trades could do to a price.

## The central bank (v0.68.0)

`game.corp.bank` (`src/systems/centralBank.js`; the pure rule in `src/corp/bank.js`); the **Bank** tablet app. The first of four parts of stage 10.

- **Rate** (`state.bank.rate`, default `CORP.baseRate` 5% until the bank first meets): read through `bank.rate()`, which creates nothing.
- **Meeting** (`dailyTick`, after the wider world's day): the first day of each month from month index 3, once (`lastMeeting`), whatever is saved or slept through. `indicators()` reads the live generated companies: capacity-weighted `util`, `growth` (last closed month's sales over the one before, over companies with both), `stress` (share distressed). `decide(rate, ind)`: target `5% + 0.06·(util − 0.75) + 0.3·clamp(growth, ±0.1) − 0.1·stress`, to the quarter-point, 1–12%; hold within a quarter-point, else one step (a quarter-point; two if a point or more away). The decision, its figures and its text are kept 36 months.
- **Effects** (identity at 5%): `valuationFactor` multiplies a sector's earnings multiple in `metrics.value`; `investShift` raises the utilisation a company needs before it builds; `entryFactor` multiplies the chance of a new company; `worldCtx().rate` is the policy rate (the world's borrowing cost is `rate + 1% + 4% × risk`); `group.defaultRate()` is `rate + 1%`. Loans already made keep their rate.
- **Not in this release**: government bonds, the physical bank, corporate bonds (the next three releases); bank loans (stage 12); an inflation measure.

### Government bonds (v0.69.0)

`game.corp.bonds` (`src/systems/bonds.js`; the pure maths in `src/corp/bonds.js`); the **Bonds** tablet app. The second of four parts of stage 10.

- **Offer**: 1, 3, 5 years at par; `couponAt(rate, years)` = `yieldFor` to the quarter-point, `yieldFor = rate + premium(years)`, `premium` a straight line through (0, 0), (1, 0.25%), (3, 0.75%), (5+, 1.25%).
- **Lot** (`state.bonds.lots`): `{ id, years, face, coupon, issued, due, end, cost, coupons }`; `due` is the next coupon's day (30 days apart; the last is `end` = issued + 360 × years, which carries the face). `dailyTick` pays every coupon that has fallen due (once; `due` advances), and the face with the last; a matured lot is removed.
- **Value** (`valueOf`): `Σ amount / (1 + y/12)^months` over `cashFlows(lot, today)` with `y = yieldFor(policy rate, years left)` — par at issue when the coupon is the yield; sell back at `round(value × 0.995)`.
- **Personal**: bought and paid through `player.money` like shares. No company is involved; the money is the government's. Bond values are not in the net-worth figure quests read.
- **Not in this release**: the physical bond desk and corporate bonds (the next two releases); bonds held by companies; floating or inflation-linked bonds.

### The physical bank (v0.70.0)

`src/content/maps/firstBank.js` (`firstBankInterior(street)`, called in `src/content/index.js` after the streets have grown, as for the Phonograph Grand's lobby); the building `b_bank` in `src/content/maps/halvermouth.js` has its door `to: first_bank`, hours 09:00–17:00. The third of four parts of stage 10.

- **Size**: an interior is laid over its building's *grown* footprint and a larger interior makes the town grow (shifting every hand-placed coordinate in the content, such as the signature cars), so the hall is made after growth at exactly the footprint's size (11 × 7 now; it throws if it would be under 9 × 7).
- **Props**: `bank_vault` (a `vault` fixture, examine only), `bank_tellers` (a counter), `bank_bond_desk` (`interact: { kind: 'bank', tab: 'Bonds' }`), `bank_rate_board` (`tab: 'Bank'`). `game.interact` turns kind `bank` into `{ type: 'panel', panel: 'tablet', opts: { tab } }`.
- **Not in this release**: staff; a separate policy office or vault room; anything inside the vault (the robbery stage's); a bank robbery never touches the policy rate or any credit figure, by the owner's rule.

### Corporate bonds (v0.71.0)

`game.corp.credit` (`src/systems/creditBonds.js`; the pure rules in `src/corp/credit.js`; the bond maths are `src/corp/bonds.js` with a credit `spread`), in the **Bonds** app. The last of four parts of stage 10.

- **Issue** (`state.credit.issues[ticker]`): created when the exchange has a listing for the company and it is live; `face = issueFace(listed value)`; `coupon = round((yieldFor(policy, 3) + spreadOf(rating)) / 0.0025) × 0.0025`; `end = issued + 1080`; `status` open → matured / defaulted / repaid; reissued `CREDIT.reissueDays` (30) after it closes. `lastDebt`/`lastPlant` are kept while the company lives, for the recovery.
- **Rating** (`rate(c)`): leverage `debt ÷ (plant + max(0, cash))` → AA < 10%, A < 25%, BBB < 45%, BB < 70%, else B; +1 notch if `lastNet < 0`; +1 if `cash < 0`; CCC if distressed. Re-rated each day while the issue is open.
- **Price/value**: `valueOf(lot, today, policy, spread)` — the cash still to come discounted at `yieldFor(policy, years left) + spreadOf(rating)`; sell at 99%.
- **Settlement** (`settle`): when the issuer's record is closed → `status: defaulted`, each lot paid `face × recovery(lastPlant, lastDebt)` once; merged → `repaid`, par. A company's records are never changed by its bonds (they run beside its books).
- **Lots**: `{ id, issue, face, coupon, bought, due, end, cost, coupons }`; coupons every 30 days from the issue day, each once.
- **Not in this release**: bonds of your own businesses, bonds held by companies, anything that changes a company's books; bank loans (stage 12).

## Lending (v0.73.0)

`src/corp/lending.js` (pure: advance rates, `rateFor`, `quote`, `dueMonth`, record effects), `src/systems/lending.js` (`game.corp.lending`), `src/ui/corpLoans.js` (the Loans app, Bank group). The first part of stage 12.

- **Borrower and security** (owner's answers): *you personally*, secured against your shares and bonds. Advance rates: shares 50%, government bonds 90%, corporate bonds 70/70/60/40/40/20% by rating AA…CCC, scaled by the borrowing record (0.8–1.2×).
- **Rate** (owner's answer: fixed for life): policy rate at signing + 2.5% + up to 2% for the share of the limit used + a record adjustment (−0.5% … +2%), to the quarter-point. The policy rate's later moves touch only new loans.
- **Default** (owner's answer: arrears and penalty rate only, no seizure): a missed instalment becomes arrears growing monthly at the loan's rate + 5%; the player is never debited by force and no holding is taken. Consequences: no new loan while in arrears, a lower borrowing record (−8 per miss, −1 a month in arrears, +0.5 per on-time payment), and the **sale lock** on pledged holdings.
- **The record is its own thing** (`world.corp.lending.standing`): it is moved only by how the player repays loans. It is not, and must never be made, a function of anything else — stage 14's bank robbery has its own separate criminal reputation and must not read or write it, nor affect the rate, limits or valuations.
- No company is a party: no company account is debited or credited, and no company's valuation, rating or ranking reads a loan.

### Business loans (v0.74.0)

`src/systems/businessLoans.js` (`game.corp.business`), the company section of `src/ui/corpLoans.js`. The company is the borrower and stands alone (owner's answer): limit and rate from its own books and own record; **guarantees are explicit** (you: a record hit; a parent: it is called and the subsidiary owes it back as an intercompany loan); a missed instalment is arrears + penalty with no seizure, **managers refuse hire/bid/expand while behind** (`judge`'s `frozen`), and the bank collects what the account takes in. Borrowed money is a loan, never revenue; interest is opex, principal is not; a company's net assets and debt include what it owes the bank, and the consolidated statement reports it as `debt.bank` (external, not eliminated).

## Wars, embargoes and geopolitics (v0.75.0)

`src/content/geo.js` (every figure), `src/corp/geo.js` (pure), `src/systems/geo.js` (`game.corp.geo`), `src/ui/corpEconomy.js`. Owner's answer: **layer on top of** the arms market's wars and embargoes (it decides their start and end; the layer records them as persistent events and spreads their consequences). Effects: sector cost and demand indices into the wider world's days (`ctx.cost`, `poolExtra.demand`), an embargo's lost arms income, and an exposure-weighted bounded sentiment on every listed fair price. Since v0.76.0 the cost index also prices your own arms parts and aerospace materials/freight, a bounded war premium rides on Halvermouth's bond yields (the policy rate is untouched), and managers answer with budget requests and an expansion hold. Foreign government bonds (v0.77.0, `src/corp/sovereign.js`, `src/systems/sovereign.js`) complete stage 13: eight three-year bonds rated from each country's debt trait, wars, embargo and treasury; delayed payments after ten days and restructuring after forty at the top of the strain, never by chance; collateral for loans by rating.

## Rules every later stage keeps

No money, shares, loans, employees or businesses are created by migration; no business is auto-consolidated; generated entities are stored once and never regenerated; investments stay personal; valuations never create cash; managers (stage 7) act only through the businesses' own validated services (`game.corp.pay` and below), within budgets that are authorisations, not money, and for a company with its own account.

## Not yet (see the roadmap in `docs/CORPORATE_AUDIT.md`)

Selling or closing a subsidiary and part-owned subsidiaries (stage 5's remainder); managers that act on their own, budgets and approvals (7–8); a unified stock market with the generated companies' prices (9); a physical Lariat State Bank (12; personal loans since v0.73.0, company loans since v0.74.0; the policy rate, bonds and the First Bank since 0.68–0.71); wars and embargoes beyond the arms pool (13; the sim already accepts a per-sector cost index); the bank robbery (14).
