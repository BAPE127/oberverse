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
- **Effects** (`effectsOf`): per effect, `cap × skill factor ((average of the effect's skills − 20) / 70, 0–1) × dependability (0.6–1.0 by reliability) × reach`, summed over the people at the employer who are at work and paid, and held to the **ceiling** (`EFFECT_CAPS`: materials 8%, parts 10%, overhead 10%, arms speed 10%, upkeep 12%, farm price 8%). A parent's executive acts on each subsidiary at half strength (`EXEC_REACH`). Applied where the money is paid or the output made: `aerospace.supplierPrice` and `fixedCosts` (the player's firm only, never Meridian), `arms.speedMult` (read by `rate`, which is zero without a worker at the station) and `partsMult` (the order price), `logistics.daily` (upkeep paid), `farm.unitPrice` (what a sale fetches). Cached per day and per roster change.
- **Authority** (`setAuthority`): a spending limit, an ask-above limit, and may hire / borrow / transfer / sign contracts / expand, bounded by level (staff cannot borrow or transfer). Stored and shown; **not enforced by anything until stage 7**.
- **Arms staff** are listed through `armsFloor` as a view of `arms.state.staff` — not copied; the works still hires, pays and dismisses them with its own generator. **Aerospace crews** stay head-counts (a line in Payroll).
- **Worth** (`benefit`, `spendPerDay`): what a hire would save or earn a day from the business's own recent spending; **it is frequently less than the wage** in a small business, and the app says so. The case for managers in this stage is the groundwork — people, pay, results, authority — and the effects above; what they decide for themselves is stage 7.
- **Not in this release**: managers acting on their own, budgets, approvals, policies and alerts about people (stage 7); morale beyond loyalty and being paid; hiring through an agency or at a place in the world; part-time and fixed-term contracts; training; poaching by generated companies.

## Rules every later stage keeps

No money, shares, loans, employees or businesses are created by migration; no business is auto-consolidated; generated entities are stored once and never regenerated; investments stay personal; valuations never create cash; managers (stage 7) will act only through `game.corp.pay` and the other validated services, within budgets that are authorisations, not money.

## Not yet (see the roadmap in `docs/CORPORATE_AUDIT.md`)

Selling or closing a subsidiary and part-owned subsidiaries (stage 5's remainder); managers that act on their own, budgets and approvals (7–8); a unified stock market with the generated companies' prices (9); the central bank at the First Bank of Halvermouth, bonds, loans at Lariat State Bank, the policy rate (10–12; the sim reads `CORP.baseRate` until then); wars and embargoes beyond the arms pool (13; the sim already accepts a per-sector cost index); the bank robbery (14).
